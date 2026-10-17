// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { I18nextProvider } from 'react-i18next'
import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  downloadURL: vi.fn(),
  showSaveDialog: vi.fn(async (_window?: unknown, _options?: unknown) => ({ canceled: true })),
  writeText: vi.fn(async (_text: string): Promise<void> => undefined),
}))

vi.mock('electron', () => ({
  // Current Electron exposes clipboard through the main process only.
  remote: {
    clipboard: { writeText: mocks.writeText },
    dialog: { showSaveDialog: mocks.showSaveDialog },
    getCurrentWindow: () => ({}),
    getCurrentWebContents: () => ({ downloadURL: mocks.downloadURL }),
  },
}))
vi.mock('../packages/navy-staff/src/lib/html2canvas', () => ({
  default: async () => ({ toDataURL: () => 'data:image/png;base64,' }),
}))
vi.mock('views/utils/selectors', () => ({ constSelector: () => ({}) }))

import { createNavyOnlyI18n } from '../preview/i18n'
import type { DecodedReference } from '../packages/navy-staff/src/views/reference/types'
import { ShareTools } from '../packages/navy-staff/src/views/reference/share-tools'

// Host-normalized instance (poi strips punctuation from keys exactly as
// readI18nResources does), so a sentence key that only survived in raw-resource
// Storybook cannot pass.
const i18n = createNavyOnlyI18n('zh-CN')

const reference: DecodedReference = {
  captureTime: '2026-01-01T00:00:00.000Z',
  exportTime: '2026-01-02T00:00:00.000Z',
  groups: [{ color: '#ff0000', label: 'E1', ships: [{ level: 50, masterId: 1 }] }],
  locale: 'zh-CN',
  schemaVersion: 1,
  title: '友军参考',
}

const button = (label: string) =>
  screen.getByRole('button', { name: i18n.t(label) }) as HTMLButtonElement

const renderShare = (overrides: Partial<React.ComponentProps<typeof ShareTools>> = {}) => {
  const imageRef = { current: document.createElement('div') }
  return render(
    <I18nextProvider i18n={i18n}>
      <ShareTools
        detached
        disabled={false}
        imagePreview={<div data-testid="preview" />}
        imageRef={imageRef}
        onCapture={() => reference}
        sourceLabel="分享当前计划：计划"
        {...overrides}
      />
    </I18nextProvider>,
  )
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('Share tools (zh-CN, host-normalized keys)', () => {
  it('renders literal Chinese hints for the empty and image states', () => {
    renderShare()

    expect(screen.getByText('生成后即可复制或保存分享文本。')).toBeTruthy()
    expect(screen.queryByText('shareTextEmptyHint')).toBeNull()
    expect(screen.queryByTestId('reference-view')).toBeNull()
    expect(button('Generate share text').disabled).toBe(false)
  })

  it('reveals the actual image preview only on request in a detached window', () => {
    renderShare()

    expect(screen.queryByTestId('share-image-preview')).toBeNull()
    fireEvent.click(button('Show image preview'))
    expect(screen.getByTestId('share-image-preview')).toBeTruthy()
    expect(button('Save to image')).toBeTruthy()
    fireEvent.click(button('Hide image preview'))
    expect(screen.queryByTestId('share-image-preview')).toBeNull()
  })

  it('shows only the detached-only hint in the main window', () => {
    renderShare({ detached: false })

    expect(screen.getByText('仅在独立窗口中提供图片截取。')).toBeTruthy()
    expect(screen.queryByRole('button', { name: i18n.t('Show image preview') })).toBeNull()
    expect(screen.queryByRole('button', { name: i18n.t('Save to image') })).toBeNull()
  })

  it('generates frozen text and does not render a reference preview', () => {
    const view = renderShare()
    fireEvent.click(button('Generate share text'))

    expect(screen.getByTestId('share-text')).toBeTruthy()
    expect(screen.queryByTestId('reference-view')).toBeNull()

    // A later source change does not mislabel the frozen text; the concise
    // frozen label appears only when it differs from the current source.
    view.rerender(
      <I18nextProvider i18n={i18n}>
        <ShareTools
          detached
          disabled={false}
          imagePreview={<div />}
          imageRef={{ current: document.createElement('div') }}
          onCapture={() => reference}
          sourceLabel="分享历史：初始计划"
        />
      </I18nextProvider>,
    )
    expect(screen.getByText('来源：分享当前计划：计划')).toBeTruthy()
  })

  it('disables Generate while a copy is pending and resolves to the success state', async () => {
    let resolveCopy!: () => void
    mocks.writeText.mockImplementationOnce(
      () => new Promise<void>((resolve) => { resolveCopy = resolve }),
    )
    renderShare()
    fireEvent.click(button('Generate share text'))
    fireEvent.click(button('Copy share text'))

    expect(button('Generate share text').disabled).toBe(true)
    resolveCopy()
    await waitFor(() => expect(button('Generate share text').disabled).toBe(false))
    expect(mocks.writeText).toHaveBeenCalledWith(
      (screen.getByTestId('share-text') as HTMLTextAreaElement).value,
    )
    expect(screen.getByText('已复制')).toBeTruthy()
    expect(screen.queryByTestId('share-error')).toBeNull()
  })

  it('shows a literal Chinese error on a rejected copy and retries', async () => {
    let rejectCopy!: (error: unknown) => void
    mocks.writeText.mockImplementationOnce(
      () => new Promise<void>((_resolve, reject) => { rejectCopy = reject }),
    )
    renderShare()
    fireEvent.click(button('Generate share text'))
    fireEvent.click(button('Copy share text'))

    expect(button('Generate share text').disabled).toBe(true)
    rejectCopy(new Error('clipboard unavailable'))
    await waitFor(() =>
      expect(screen.getByTestId('share-error').textContent).toBe('无法复制分享文本。'),
    )
    expect(button('Generate share text').disabled).toBe(false)

    // Retry succeeds: the error clears and the success state appears.
    fireEvent.click(button('Copy share text'))
    await waitFor(() => expect(screen.queryByTestId('share-error')).toBeNull())
    expect(screen.getByText('已复制')).toBeTruthy()
  })

  it('uses a literal Chinese save-dialog filter name', async () => {
    renderShare()
    fireEvent.click(button('Generate share text'))
    fireEvent.click(button('Save share text'))

    await waitFor(() => expect(mocks.showSaveDialog).toHaveBeenCalledTimes(1))
    const options = mocks.showSaveDialog.mock.calls[0][1] as {
      filters: Array<{ extensions: string[]; name: string }>
    }
    expect(options.filters[0].name).toBe('文本文件')
  })
})
