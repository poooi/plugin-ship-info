// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import React from 'react'
import { I18nextProvider } from 'react-i18next'
import { Provider } from 'react-redux'
import { legacy_createStore } from 'redux'
import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  domToPng: vi.fn(async (_node: unknown, _options?: unknown) => 'data:image/png;base64,cmVm'),
  downloadURL: vi.fn(async (_url: string) => undefined),
}))

vi.mock('modern-screenshot', () => ({ domToPng: mocks.domToPng }))
vi.mock('electron', () => ({
  remote: {
    getCurrentWebContents: () => ({ downloadURL: mocks.downloadURL }),
  },
}))
vi.mock('views/utils/selectors', () => ({
  constSelector: () => ({
    $ships: {
      '1': { api_id: 1, api_name: 'Fubuki', api_stype: 2, api_yomi: 'ふぶき' },
    },
  }),
}))

import { createNavyOnlyI18n } from '../preview/i18n'
import { encodeReference } from '../packages/navy-staff/src/views/reference/codec'
import type { DecodedReference } from '../packages/navy-staff/src/views/reference/types'
import { ReferenceTools } from '../packages/navy-staff/src/views/reference/reference-tools'
import { ReferenceView } from '../packages/navy-staff/src/views/reference/reference-view'

const i18n = createNavyOnlyI18n('en-US')

const reference: DecodedReference = {
  captureTime: '2026-01-01T00:00:00.000Z',
  exportTime: '2026-01-02T00:00:00.000Z',
  groups: [
    { color: '#ff0000', label: 'E1', ships: [{ masterId: 1, level: 50 }, { masterId: 999, level: null }] },
    { color: '#00ff00', label: 'E2', ships: [{ masterId: 1, level: 20 }] },
  ],
  locale: 'en-US',
  schemaVersion: 1,
  title: 'Shared reference',
}

const renderView = () =>
  render(
    <Provider store={legacy_createStore(() => ({}))}>
      <I18nextProvider i18n={i18n}>
        <ReferenceView reference={reference} />
      </I18nextProvider>
    </Provider>,
  )

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('ReferenceView modes and image capture', () => {
  it('renders three modes and every occurrence with stable test ids', () => {
    renderView()

    const view = screen.getByLabelText('View') as HTMLSelectElement
    expect(view.value).toBe('area')
    expect(within(view).getByRole('option', { name: 'Ship Grid' })).toBeTruthy()
    expect(screen.getAllByTestId('reference-ship')).toHaveLength(3)

    fireEvent.change(view, { target: { value: 'list' } })
    expect(screen.getAllByTestId('reference-ship')).toHaveLength(3)

    fireEvent.change(view, { target: { value: 'grid' } })
    expect(screen.getAllByTestId('reference-ship')).toHaveLength(3)
    // Duplicate masters stay distinct occurrences.
    expect(screen.getAllByText('Fubuki')).toHaveLength(2)
    expect(screen.getByText('???')).toBeTruthy()
  })

  it('excludes controls and search from the capture target', () => {
    renderView()
    const capture = screen.getByTestId('reference-capture')

    expect(within(capture).queryByLabelText('View')).toBeNull()
    expect(within(capture).queryByLabelText('Search ships')).toBeNull()
    expect(within(capture).queryByRole('button', { name: 'Save to image' })).toBeNull()
    // Title, metadata, and roster are inside.
    expect(within(capture).getByText('Shared reference')).toBeTruthy()
    expect(within(capture).getByText(/Capture time/)).toBeTruthy()
    expect(within(capture).getAllByTestId('reference-ship').length).toBe(3)
  })

  it('captures the full target with an opaque background and downloads it', async () => {
    renderView()
    fireEvent.click(screen.getByRole('button', { name: 'Save to image' }))

    await waitFor(() => expect(mocks.domToPng).toHaveBeenCalledTimes(1))
    const [node, options] = mocks.domToPng.mock.calls[0] as [
      HTMLElement,
      { backgroundColor: string; width: number; height: number },
    ]
    expect(node).toBe(screen.getByTestId('reference-capture'))
    expect(options.backgroundColor).toMatch(/^(#|rgb)/u)
    expect(typeof options.width).toBe('number')
    expect(typeof options.height).toBe('number')
    await waitFor(() =>
      expect(mocks.downloadURL).toHaveBeenCalledWith('data:image/png;base64,cmVm'),
    )
  })

  it('shows a localized, retryable error when capture fails', async () => {
    mocks.domToPng.mockRejectedValueOnce(new Error('render failed'))
    renderView()

    fireEvent.click(screen.getByRole('button', { name: 'Save to image' }))
    await waitFor(() =>
      expect(screen.getByTestId('image-error').textContent).toBe('Could not save the image'),
    )

    // Retry succeeds and clears the error.
    fireEvent.click(screen.getByRole('button', { name: 'Save to image' }))
    await waitFor(() => expect(screen.queryByTestId('image-error')).toBeNull())
    await waitFor(() => expect(mocks.downloadURL).toHaveBeenCalled())
  })

  it('blocks replacement while capturing and clears late feedback on a new reference', async () => {
    let rejectCapture!: (error: unknown) => void
    mocks.domToPng.mockImplementationOnce(
      () => new Promise<string>((_resolve, reject) => { rejectCapture = reject }),
    )

    render(
      <Provider store={legacy_createStore(() => ({}))}>
        <I18nextProvider i18n={i18n}>
          <ReferenceTools />
        </I18nextProvider>
      </Provider>,
    )

    const paste = () =>
      screen.getByPlaceholderText('Paste a share code or open a text file')
    const codeFor = (title: string) => encodeReference({ ...reference, title })

    fireEvent.change(paste(), { target: { value: codeFor('A') } })
    fireEvent.click(screen.getByRole('button', { name: 'Open' }))
    expect(
      within(screen.getByTestId('reference-view')).getByText('A'),
    ).toBeTruthy()

    // Reopen the form and stage a replacement, then capture while A is visible.
    fireEvent.click(screen.getByRole('button', { name: 'Open another reference' }))
    fireEvent.change(paste(), { target: { value: codeFor('B') } })
    fireEvent.click(screen.getByRole('button', { name: 'Save to image' }))

    expect(
      (screen.getByRole('button', { name: 'Open' }) as HTMLButtonElement).disabled,
    ).toBe(true)
    expect(
      (screen.getByRole('button', { name: 'Open another reference' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true)

    rejectCapture(new Error('render failed'))
    await waitFor(() =>
      expect(screen.getByTestId('image-error').textContent).toBe('Could not save the image'),
    )
    await waitFor(() =>
      expect(
        (screen.getByRole('button', { name: 'Open' }) as HTMLButtonElement).disabled,
      ).toBe(false),
    )

    // A new reference remounts the view, so A's late error is not shown on B.
    fireEvent.click(screen.getByRole('button', { name: 'Open' }))
    expect(
      within(screen.getByTestId('reference-view')).getByText('B'),
    ).toBeTruthy()
    expect(screen.queryByTestId('image-error')).toBeNull()
  })

  it('drops a pending file read when a capture starts', async () => {
    let resolveRead!: (text: string) => void
    const originalText = File.prototype.text
    File.prototype.text = function (this: File) {
      return new Promise<string>((resolve) => {
        resolveRead = resolve
      })
    }

    try {
      render(
        <Provider store={legacy_createStore(() => ({}))}>
          <I18nextProvider i18n={i18n}>
            <ReferenceTools />
          </I18nextProvider>
        </Provider>,
      )

      const paste = () =>
        screen.getByPlaceholderText('Paste a share code or open a text file')
      const codeFor = (title: string) => encodeReference({ ...reference, title })

      fireEvent.change(paste(), { target: { value: codeFor('A') } })
      fireEvent.click(screen.getByRole('button', { name: 'Open' }))
      fireEvent.click(screen.getByRole('button', { name: 'Open another reference' }))

      const input = screen.getByTestId('reference-file-input')
      fireEvent.change(input, {
        target: { files: [new File([codeFor('B')], 'b.txt', { type: 'text/plain' })] },
      })
      expect(typeof resolveRead).toBe('function')

      // Starting the capture invalidates the in-flight read.
      fireEvent.click(screen.getByRole('button', { name: 'Save to image' }))
      await act(async () => {
        resolveRead(codeFor('B'))
      })

      expect(
        within(screen.getByTestId('reference-view')).getByText('A'),
      ).toBeTruthy()
      expect(
        within(screen.getByTestId('reference-view')).queryByText('B'),
      ).toBeNull()
    } finally {
      File.prototype.text = originalText
    }
  })
})
