// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import React from 'react'
import { I18nextProvider } from 'react-i18next'
import { Provider } from 'react-redux'
import { legacy_createStore } from 'redux'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('views/utils/selectors', () => ({ constSelector: () => ({}) }))

import { createNavyOnlyI18n } from '../preview/i18n'
import { encodeReference } from '../packages/navy-staff/src/views/reference/codec'
import { ReferenceTools } from '../packages/navy-staff/src/views/reference/reference-tools'

// Host-normalized keys (poi's escapeI18nKey), so sentence keys cannot pass only
// in raw-resource Storybook.
const i18n = createNavyOnlyI18n('zh-CN')

const codeFor = (title: string): string =>
  encodeReference({
    captureTime: '2026-01-01T00:00:00.000Z',
    exportTime: '2026-01-02T00:00:00.000Z',
    groups: [{ color: '#ff0000', label: 'E1', ships: [{ level: 50, masterId: 1 }] }],
    locale: 'zh-CN',
    schemaVersion: 1,
    title,
  })

const renderTools = () =>
  render(
    <Provider store={legacy_createStore(() => ({}))}>
      <I18nextProvider i18n={i18n}>
        <ReferenceTools />
      </I18nextProvider>
    </Provider>,
  )

const button = (name: string) => screen.getByRole('button', { name })
const pasteBox = () => screen.getByPlaceholderText('粘贴分享代码或打开文本文件')

const openReference = (title: string) => {
  fireEvent.change(pasteBox(), { target: { value: codeFor(title) } })
  fireEvent.click(button('打开'))
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('Reference tools opening and guards (zh-CN)', () => {
  it('shows the paste form immediately when nothing is open', () => {
    renderTools()

    expect(pasteBox()).toBeTruthy()
    expect(button('打开')).toBeTruthy()
    expect(button('打开文件')).toBeTruthy()
    expect(screen.queryByTestId('reference-view')).toBeNull()
  })

  it('opens a reference, hides the form, and can reopen or cancel', () => {
    renderTools()
    openReference('参考A')

    expect(screen.getByTestId('reference-view')).toBeTruthy()
    expect(screen.queryByPlaceholderText('粘贴分享代码或打开文本文件')).toBeNull()

    fireEvent.click(button('打开其他参考'))
    expect(pasteBox()).toBeTruthy()
    fireEvent.click(button('取消'))

    expect(screen.queryByPlaceholderText('粘贴分享代码或打开文本文件')).toBeNull()
    expect(within(screen.getByTestId('reference-view')).getByText('参考A')).toBeTruthy()
  })

  it('keeps the current reference when a replacement fails to decode', () => {
    renderTools()
    openReference('参考A')

    fireEvent.click(button('打开其他参考'))
    fireEvent.change(pasteBox(), { target: { value: 'not a reference' } })
    fireEvent.click(button('打开'))

    expect(screen.getByTestId('reference-error')).toBeTruthy()
    expect(within(screen.getByTestId('reference-view')).getByText('参考A')).toBeTruthy()
  })

  it('hides the encoded source behind a disclosure', () => {
    renderTools()
    openReference('参考A')

    expect(screen.queryByTestId('reference-share-text')).toBeNull()
    fireEvent.click(button('显示分享文本'))
    expect(screen.getByTestId('reference-share-text')).toBeTruthy()
    fireEvent.click(button('隐藏分享文本'))
    expect(screen.queryByTestId('reference-share-text')).toBeNull()
  })

  it('drops a slower pending file read when a newer oversized file supersedes it', async () => {
    renderTools()
    openReference('参考A')
    fireEvent.click(button('打开其他参考'))

    const input = screen.getByTestId('reference-file-input')
    let resolveFirst: ((text: string) => void) | undefined
    const originalText = File.prototype.text
    File.prototype.text = function (this: File) {
      if (this.name === 'a.txt') {
        return new Promise<string>((resolve) => {
          resolveFirst = resolve
        })
      }
      return originalText.call(this)
    }

    try {
      fireEvent.change(input, {
        target: { files: [new File([codeFor('参考B')], 'a.txt', { type: 'text/plain' })] },
      })
      fireEvent.change(input, {
        target: { files: [new File([new Uint8Array(200000)], 'b.txt', { type: 'text/plain' })] },
      })

      await waitFor(() =>
        expect(screen.getByTestId('reference-error').textContent).toBe('分享文本过大，无法打开。'),
      )

      await expect(typeof resolveFirst).toBe('function')
      const resolve = resolveFirst as (text: string) => void
      await act(async () => {
        resolve(codeFor('参考B'))
      })

      // The stale read is ignored: the opened reference is still A.
      expect(within(screen.getByTestId('reference-view')).getByText('参考A')).toBeTruthy()
      expect(screen.queryByText('参考B')).toBeNull()
    } finally {
      File.prototype.text = originalText
    }
  })
})
