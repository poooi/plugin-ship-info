import type { Meta, StoryObj } from '@storybook/react-vite'
import React from 'react'
import { expect, spyOn, userEvent, waitFor, within } from 'storybook/test'

import { host } from '../preview/adapters/logs'
import { tableState } from '../preview/table-fixtures'
import { Export } from '../views/sidebar/export'
import { TableView } from '../views/table'
import { openPopover, popoverContent, renderedNames } from './table-support'

const ExportTable: React.FC = () => (
  <>
    <TableView />
    <Export />
  </>
)

const meta = {
  title: 'Export/Controls',
  component: ExportTable,
  parameters: { shipInfo: { state: tableState() } },
} satisfies Meta<typeof ExportTable>

export default meta
type Story = StoryObj<typeof meta>

const ALL_NAMES = [
  'Zeta',
  'Gamma',
  'Delta',
  'Eta',
  'Alpha',
  'Beta',
  'Theta',
  'Epsilon',
]

const FILTERED_CONFIG = {
  config: {
    plugin: { ShipInfo: { filters: { maxLevel: 450, minLevel: 100 } } },
    poi: { appearance: { avatar: false } },
  },
}

const exportButton = (name: string): HTMLElement =>
  within(popoverContent()).getByRole('button', { name })

const selectFor = (label: string): HTMLSelectElement =>
  within(popoverContent())
    .getByText(label)
    .parentElement!.querySelector('select') as HTMLSelectElement

const csvNames = (csv: string, sep = ',', end = '\n'): string[] => {
  const [header, ...rows] = csv.split(end)
  // The header uses the translated field label; en-US renders "name" as "Name".
  const index = header
    .split(sep)
    .findIndex((key) => key === 'Name' || key === 'name')
  return rows.map((row) => row.split(sep)[index])
}

const waitForRows = async (canvasElement: HTMLElement, count: number) => {
  await waitFor(async () => {
    await expect(renderedNames(canvasElement).length).toBe(count)
  })
}

export const ClipboardCurrentFilteredAndAll: Story = {
  name: 'Current filtered list vs All data',
  parameters: { shipInfo: { state: tableState(FILTERED_CONFIG) } },
  play: async ({ canvasElement }) => {
    await openPopover(canvasElement, 'Export')
    await waitForRows(canvasElement, 3)

    await userEvent.click(exportButton('Copy to clipboard'))
    await waitFor(async () => {
      await expect(host.log.clipboardWrites.length).toBe(1)
    })
    // Current list honours the active level filter and the sort order.
    await expect(csvNames(host.log.clipboardWrites[0])).toEqual([
      'Zeta',
      'Gamma',
      'Delta',
    ])

    await userEvent.selectOptions(selectFor('Data'), 'all')
    await userEvent.click(exportButton('Copy to clipboard'))
    await waitFor(async () => {
      await expect(host.log.clipboardWrites.length).toBe(2)
    })
    await expect(csvNames(host.log.clipboardWrites[1])).toEqual([
      'Alpha',
      'Beta',
      'Gamma',
      'Delta',
      'Epsilon',
      'Zeta',
      'Eta',
      'Theta',
    ])
  },
}

export const EmptyCurrentList: Story = {
  name: 'Non-empty host filtered to zero exports only the header',
  parameters: {
    shipInfo: {
      state: tableState({
        config: {
          plugin: { ShipInfo: { filters: { maxLevel: 450, minLevel: 400 } } },
          poi: { appearance: { avatar: false } },
        },
      }),
    },
  },
  play: async ({ canvasElement }) => {
    await openPopover(canvasElement, 'Export')
    await waitFor(async () => {
      await expect(renderedNames(canvasElement).length).toBe(0)
    })

    await userEvent.click(exportButton('Copy to clipboard'))

    await waitFor(async () => {
      await expect(host.log.clipboardWrites.length).toBe(1)
    })
    await expect(csvNames(host.log.clipboardWrites[0])).toEqual([])
  },
}

export const SeparatorAndLineBreak: Story = {
  name: 'Separator and line-break choices both change the payload',
  play: async ({ canvasElement }) => {
    await openPopover(canvasElement, 'Export')
    await waitForRows(canvasElement, 8)

    await userEvent.selectOptions(selectFor('Separator'), ';')
    await userEvent.selectOptions(selectFor('Line break'), '\r\n')
    await userEvent.click(exportButton('Copy to clipboard'))
    await waitFor(async () => {
      await expect(host.log.clipboardWrites.length).toBe(1)
    })
    const crlf = host.log.clipboardWrites[0]
    await expect(crlf).toContain(';')
    await expect(crlf).toContain('\r\n')
    await expect(csvNames(crlf, ';', '\r\n')).toEqual(ALL_NAMES)

    // Explicitly switch back to comma + LF and assert the new payload.
    await userEvent.selectOptions(selectFor('Separator'), ',')
    await userEvent.selectOptions(selectFor('Line break'), '\n')
    await userEvent.click(exportButton('Copy to clipboard'))
    await waitFor(async () => {
      await expect(host.log.clipboardWrites.length).toBe(2)
    })
    const lf = host.log.clipboardWrites[1]
    await expect(lf).not.toContain('\r\n')
    await expect(lf).toContain('\n')
    await expect(csvNames(lf, ',', '\n')).toEqual(ALL_NAMES)
  },
}

export const TabSeparator: Story = {
  name: 'Tab separator produces tab-delimited output',
  play: async ({ canvasElement }) => {
    await openPopover(canvasElement, 'Export')
    await waitForRows(canvasElement, 8)

    await userEvent.selectOptions(selectFor('Separator'), '\t')
    await userEvent.click(exportButton('Copy to clipboard'))

    await waitFor(async () => {
      await expect(host.log.clipboardWrites.length).toBe(1)
    })
    await expect(csvNames(host.log.clipboardWrites[0], '\t')).toEqual(ALL_NAMES)
  },
}

export const SaveDialogCanceled: Story = {
  name: 'Save dialog canceled writes nothing',
  play: async ({ canvasElement }) => {
    await openPopover(canvasElement, 'Export')
    await waitForRows(canvasElement, 8)

    await userEvent.click(exportButton('Export to file'))

    await waitFor(async () => {
      await expect(host.log.saveDialogCalls.length).toBe(1)
    })
    await expect(host.log.writtenFiles.length).toBe(0)
    await expect(host.log.saveDialogCalls[0].result.canceled).toBe(true)
  },
}

export const SaveDialogSuccess: Story = {
  name: 'Save dialog success writes the actual CSV',
  parameters: {
    shipInfo: {
      saveDialog: { canceled: false, filePath: '/tmp/ships.csv' },
    },
  },
  play: async ({ canvasElement }) => {
    await openPopover(canvasElement, 'Export')
    await waitForRows(canvasElement, 8)

    await userEvent.click(exportButton('Export to file'))

    await waitFor(async () => {
      await expect(host.log.writtenFiles.length).toBe(1)
    })
    await expect(host.log.writtenFiles[0].path).toBe('/tmp/ships.csv')
    await expect(csvNames(String(host.log.writtenFiles[0].data))).toEqual(
      ALL_NAMES,
    )
  },
}

export const SaveDialogFailure: Story = {
  name: 'Save failure logs the write error without claiming success',
  parameters: {
    shipInfo: {
      fileWriteError: true,
      saveDialog: { canceled: false, filePath: '/tmp/ships.csv' },
    },
  },
  play: async ({ canvasElement }) => {
    const errorSpy = spyOn(console, 'error')
    try {
      await openPopover(canvasElement, 'Export')
      await waitForRows(canvasElement, 8)

      await userEvent.click(exportButton('Export to file'))

      await waitFor(async () => {
        await expect(host.log.writeErrors.length).toBe(1)
      })
      await expect(host.log.writtenFiles.length).toBe(0)

      await expect(errorSpy.mock.calls.length).toBe(1)
      const logged = errorSpy.mock.calls[0][0] as Error
      await expect(logged.message).toContain('EACCES')
      await expect(logged.message).toContain('/tmp/ships.csv')
    } finally {
      errorSpy.mockRestore()
    }
  },
}
