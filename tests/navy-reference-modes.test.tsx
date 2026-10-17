// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import React from 'react'
import { I18nextProvider } from 'react-i18next'
import { Provider } from 'react-redux'
import { legacy_createStore } from 'redux'
import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  domToPng: vi.fn(async (_node: unknown, _options?: unknown) => 'data:image/png;base64,cmVm'),
  outputFile: vi.fn(async (_path: string, _bytes: unknown) => undefined),
  showSaveDialog: vi.fn(async (_window?: unknown, _options?: unknown) => ({
    canceled: false,
    filePath: '/tmp/reference.png',
  })),
}))

vi.mock('modern-screenshot', () => ({ domToPng: mocks.domToPng }))
vi.mock('electron', () => ({
  remote: {
    dialog: { showSaveDialog: mocks.showSaveDialog },
    getCurrentWindow: () => ({}),
  },
}))
vi.mock('fs-extra', () => ({ outputFile: mocks.outputFile }))
vi.mock('views/utils/selectors', () => ({
  constSelector: () => ({
    $ships: {
      '1': { api_id: 1, api_name: 'Fubuki', api_stype: 2, api_yomi: 'ふぶき' },
    },
  }),
}))

import { createNavyOnlyI18n } from '../preview/i18n'
import { imageFileName } from '../packages/navy-staff/src/views/planner/capture'
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
    { color: '#0000ff', label: 'E3', ships: [{ masterId: 999, level: null }] },
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

const clickView = (name: string) =>
  fireEvent.click(screen.getByRole('button', { name }))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('ReferenceView modes and image capture', () => {
  it('renders three modes through an icon button group', () => {
    renderView()

    const group = screen.getByRole('group', { name: 'View' })
    const area = within(group).getByRole('button', { name: 'Area View' })
    const grid = within(group).getByRole('button', { name: 'Ship Grid' })
    expect(area.getAttribute('aria-pressed')).toBe('true')
    expect(grid.getAttribute('aria-pressed')).toBe('false')
    expect(screen.getAllByTestId('reference-ship')).toHaveLength(4)

    clickView('Ship List')
    expect(
      screen.getByRole('button', { name: 'Ship List' }).getAttribute('aria-pressed'),
    ).toBe('true')
    expect(screen.getAllByTestId('reference-ship')).toHaveLength(4)

    clickView('Ship Grid')
    expect(screen.getAllByTestId('reference-ship')).toHaveLength(4)
    // Grouped by captured area, in captured order.
    const areas = screen.getAllByTestId('reference-area')
    expect(areas).toHaveLength(3)
    expect(within(areas[0]).getByText('E1')).toBeTruthy()
    expect(within(areas[0]).getAllByTestId('reference-ship')).toHaveLength(2)
    expect(within(areas[1]).getAllByTestId('reference-ship')).toHaveLength(1)
    expect(within(areas[2]).getAllByTestId('reference-ship')).toHaveLength(1)
    // Duplicate masters stay distinct occurrences; unknowns keep their level.
    expect(screen.getAllByText('Fubuki')).toHaveLength(2)
    expect(screen.getAllByText('???')).toHaveLength(2)
    expect(screen.getByText('Lv.50')).toBeTruthy()
    expect(screen.getByText('Lv.20')).toBeTruthy()
    expect(screen.getAllByText('Lv.?')).toHaveLength(2)
  })

  it('hides empty groups in grid exactly like area mode when searching', () => {
    renderView()
    clickView('Ship Grid')
    expect(screen.getAllByTestId('reference-area')).toHaveLength(3)

    fireEvent.change(screen.getByPlaceholderText('Search ships'), {
      target: { value: 'fubuki' },
    })
    // E3 has only an unknown ship: hidden just as in area mode.
    expect(screen.getAllByTestId('reference-area')).toHaveLength(2)
    expect(screen.getAllByTestId('reference-ship')).toHaveLength(2)

    clickView('Area View')
    expect(screen.getAllByTestId('reference-area')).toHaveLength(2)
  })

  it('never displays a raw master id or the id placeholder in any mode', () => {
    renderView()

    for (const mode of ['Area View', 'Ship List', 'Ship Grid']) {
      clickView(mode)
      expect(screen.queryByText(/#\d/u)).toBeNull()
      expect(screen.queryByText('—')).toBeNull()
      for (const ship of screen.getAllByTestId('reference-ship')) {
        expect(ship.textContent ?? '').not.toMatch(/#\d/u)
      }
    }
  })

  it('excludes controls and search from the capture target', () => {
    renderView()
    const capture = screen.getByTestId('reference-capture')

    expect(within(capture).queryByRole('group', { name: 'View' })).toBeNull()
    expect(within(capture).queryByLabelText('Search ships')).toBeNull()
    expect(within(capture).queryByRole('button', { name: 'Save to image' })).toBeNull()
    // Title, metadata, and roster are inside.
    expect(within(capture).getByText('Shared reference')).toBeTruthy()
    expect(within(capture).getByText(/Capture time/)).toBeTruthy()
    expect(within(capture).getAllByTestId('reference-ship').length).toBe(4)
  })

  it('saves the full target to a suggested PNG file with actual bytes', async () => {
    renderView()
    fireEvent.click(screen.getByRole('button', { name: 'Save to image' }))

    await waitFor(() => expect(mocks.showSaveDialog).toHaveBeenCalledTimes(1))
    const dialogOptions = mocks.showSaveDialog.mock.calls[0][1] as {
      defaultPath: string
      filters: Array<{ extensions: string[]; name: string }>
    }
    expect(dialogOptions.defaultPath).toMatch(
      /^Shared reference - Area View-.+\.png$/u,
    )
    expect(dialogOptions.filters).toEqual([{ extensions: ['png'], name: 'PNG image' }])

    await waitFor(() => expect(mocks.domToPng).toHaveBeenCalledTimes(1))
    const [node, options] = mocks.domToPng.mock.calls[0] as [
      HTMLElement,
      { backgroundColor: string; width: number; height: number },
    ]
    expect(node).toBe(screen.getByTestId('reference-capture'))
    expect(options.backgroundColor).toMatch(/^(#|rgb)/u)
    expect(typeof options.width).toBe('number')
    expect(typeof options.height).toBe('number')

    await waitFor(() => expect(mocks.outputFile).toHaveBeenCalledTimes(1))
    const [filePath, bytes] = mocks.outputFile.mock.calls[0] as [string, Uint8Array]
    expect(filePath).toBe('/tmp/reference.png')
    expect(new TextDecoder().decode(bytes)).toBe('ref')
  })

  it('cancelling the save dialog does nothing and is not an error', async () => {
    mocks.showSaveDialog.mockResolvedValueOnce({ canceled: true, filePath: '' })
    renderView()

    fireEvent.click(screen.getByRole('button', { name: 'Save to image' }))
    await waitFor(() => expect(mocks.showSaveDialog).toHaveBeenCalledTimes(1))
    expect(mocks.domToPng).not.toHaveBeenCalled()
    expect(mocks.outputFile).not.toHaveBeenCalled()
    expect(screen.queryByTestId('image-error')).toBeNull()
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
    await waitFor(() => expect(mocks.outputFile).toHaveBeenCalled())
  })

  it('shows the same error when the file write fails', async () => {
    mocks.outputFile.mockRejectedValueOnce(new Error('disk full'))
    renderView()

    fireEvent.click(screen.getByRole('button', { name: 'Save to image' }))
    await waitFor(() =>
      expect(screen.getByTestId('image-error').textContent).toBe('Could not save the image'),
    )
  })

  it('builds a sanitized title-view-timestamp file name', () => {
    expect(
      imageFileName('A/B:C*?', 'Ship Grid', new Date('2026-01-02T03:04:05.000Z')),
    ).toBe('A_B_C__ - Ship Grid-2026-01-02T03-04-05-000Z.png')
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

    await waitFor(() => expect(mocks.domToPng).toHaveBeenCalledTimes(1))
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
