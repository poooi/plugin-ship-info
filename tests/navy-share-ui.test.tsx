// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import React from 'react'
import { I18nextProvider } from 'react-i18next'
import { Provider } from 'react-redux'
import { legacy_createStore } from 'redux'
import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  domToPng: vi.fn(async (..._args: unknown[]) => 'data:image/png;base64,c2hhcmU='),
  downloadURL: vi.fn(async (_url: string) => undefined),
  showSaveDialog: vi.fn(async (_window?: unknown, _options?: unknown) => ({ canceled: true })),
  writeText: vi.fn(async (_text: string): Promise<void> => undefined),
}))

vi.mock('electron', () => ({
  clipboard: { writeText: mocks.writeText },
  remote: {
    clipboard: { writeText: mocks.writeText },
    dialog: { showSaveDialog: mocks.showSaveDialog },
    getCurrentWindow: () => ({}),
    getCurrentWebContents: () => ({ downloadURL: mocks.downloadURL }),
  },
}))
vi.mock('modern-screenshot', () => ({ domToPng: mocks.domToPng }))
vi.mock('views/utils/selectors', () => ({ constSelector: () => ({}) }))

import { createNavyOnlyI18n } from '../preview/i18n'
import { decodeReference } from '../packages/navy-staff/src/views/reference/codec'
import type { DecodedReference } from '../packages/navy-staff/src/views/reference/types'
import { ShareTools } from '../packages/navy-staff/src/views/reference/share-tools'

const i18n = createNavyOnlyI18n('zh-CN')

const reference = (title: string): DecodedReference => ({
  captureTime: '2026-01-01T00:00:00.000Z',
  exportTime: '2026-01-02T00:00:00.000Z',
  groups: [{ color: '#ff0000', label: 'E1', ships: [{ level: 50, masterId: 1 }] }],
  locale: 'zh-CN',
  schemaVersion: 1,
  title,
})

const button = (label: string) =>
  screen.getByRole('button', { name: i18n.t(label) }) as HTMLButtonElement

const renderShare = (overrides: Partial<React.ComponentProps<typeof ShareTools>> = {}) =>
  render(
    <Provider store={legacy_createStore(() => ({}))}>
      <I18nextProvider i18n={i18n}>
        <ShareTools
          disabled={false}
          onCapture={() => reference('友军参考')}
          sourceLabel="分享当前计划：计划"
          {...overrides}
        />
      </I18nextProvider>
    </Provider>,
  )

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('Share tools (zh-CN)', () => {
  it('renders the literal generate-then-copy hint and no eager preview', () => {
    renderShare()

    expect(screen.getByText('生成后即可复制或保存分享文本。')).toBeTruthy()
    expect(screen.queryByTestId('reference-view')).toBeNull()
    expect(screen.queryByTestId('share-image-preview')).toBeNull()
    expect(button('Show image preview').disabled).toBe(true)
  })

  it('reveals a frozen ReferenceView preview only after generating', () => {
    renderShare()
    fireEvent.click(button('Generate share text'))

    expect(screen.getByTestId('share-text')).toBeTruthy()
    expect(screen.queryByTestId('reference-view')).toBeNull()
    expect(button('Show image preview').disabled).toBe(false)

    fireEvent.click(button('Show image preview'))
    const preview = screen.getByTestId('share-image-preview')
    expect(within(preview).getByTestId('reference-view')).toBeTruthy()
    expect(within(preview).getByTestId('reference-capture')).toBeTruthy()
    expect(within(preview).getByText('友军参考')).toBeTruthy()
  })

  it('keeps the generated text and image on the same frozen snapshot', () => {
    const view = renderShare()
    fireEvent.click(button('Generate share text'))
    fireEvent.click(button('Show image preview'))

    // Decoding the generated text matches the title shown in the image preview.
    const shareText = (screen.getByTestId('share-text') as HTMLTextAreaElement).value
    expect(decodeReference(shareText).title).toBe('友军参考')

    // A later source change neither relabels nor alters the frozen result.
    view.rerender(
      <Provider store={legacy_createStore(() => ({}))}>
        <I18nextProvider i18n={i18n}>
          <ShareTools
            disabled={false}
            onCapture={() => reference('新参考')}
            sourceLabel="分享历史：初始计划"
          />
        </I18nextProvider>
      </Provider>,
    )
    const preview = screen.getByTestId('share-image-preview')
    expect(within(preview).getByText('友军参考')).toBeTruthy()
    expect(within(preview).queryByText('新参考')).toBeNull()
    expect(screen.getByText('来源：分享当前计划：计划')).toBeTruthy()
  })

  it('disables Generate while a copy is pending and resolves to success', async () => {
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
    expect(screen.getByText('已复制')).toBeTruthy()
    expect(screen.queryByTestId('share-error')).toBeNull()
  })

  it('shows a literal Chinese error on rejected copy and retries', async () => {
    let rejectCopy!: (error: unknown) => void
    mocks.writeText.mockImplementationOnce(
      () => new Promise<void>((_resolve, reject) => { rejectCopy = reject }),
    )
    renderShare()
    fireEvent.click(button('Generate share text'))
    fireEvent.click(button('Copy share text'))

    rejectCopy(new Error('clipboard unavailable'))
    await waitFor(() =>
      expect(screen.getByTestId('share-error').textContent).toBe('无法复制分享文本。'),
    )

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

  it('blocks regeneration while an image capture is pending and isolates its late failure', async () => {
    let rejectCapture!: (error: unknown) => void
    mocks.domToPng.mockImplementationOnce(
      () => new Promise<string>((_resolve, reject) => { rejectCapture = reject }),
    )
    const view = renderShare()
    fireEvent.click(button('Generate share text'))
    fireEvent.click(button('Show image preview'))
    fireEvent.click(button('Save to image'))

    // Replacement is blocked while the first snapshot is capturing.
    expect(button('Generate share text').disabled).toBe(true)

    rejectCapture(new Error('render failed'))
    await waitFor(() =>
      expect(screen.getByTestId('image-error').textContent).toBe('无法保存图片'),
    )
    expect(button('Generate share text').disabled).toBe(false)

    // Regenerating a different snapshot remounts the preview: no stale error.
    view.rerender(
      <Provider store={legacy_createStore(() => ({}))}>
        <I18nextProvider i18n={i18n}>
          <ShareTools
            disabled={false}
            onCapture={() => reference('新参考')}
            sourceLabel="分享当前计划：计划"
          />
        </I18nextProvider>
      </Provider>,
    )
    fireEvent.click(button('Generate share text'))
    await waitFor(() =>
      expect(
        within(screen.getByTestId('share-image-preview')).getByText('新参考'),
      ).toBeTruthy(),
    )
    expect(screen.queryByTestId('image-error')).toBeNull()
  })
})
