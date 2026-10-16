import type { Meta, StoryObj } from '@storybook/react-vite'
import React from 'react'
import { expect, userEvent, waitFor, within } from 'storybook/test'

import { getEnvironment } from '../preview/scenario'
import { tableState } from '../preview/table-fixtures'
import { Filter } from '../packages/ship-info/src/views/sidebar/filter'
import { TableView } from '../packages/ship-info/src/views/table'
import {
  dataColumnIndex,
  openPopover,
  popoverContent,
  rowCells,
} from './table-support'

const FilterTable: React.FC = () => (
  <>
    <TableView />
    <Filter />
  </>
)

const meta = {
  title: 'Filter/RawValue',
  component: FilterTable,
  parameters: { shipInfo: { state: tableState() } },
} satisfies Meta<typeof FilterTable>

export default meta
type Story = StoryObj<typeof meta>

const cell = (root: HTMLElement, name: string, index: number) =>
  rowCells(root, name)[index]

const radioLabel = (label: string): HTMLElement =>
  within(popoverContent()).getByText(label).closest('label') as HTMLElement

const radioChecked = (label: string): boolean =>
  radioLabel(label).querySelector('input')!.checked

// rawValueOptions only defines two modes: "Display" (0) and "Raw Value" (1).
export const AllRawValueModesChangeRenderedValues: Story = {
  name: 'Every raw-value mode changes configuration and rendered values',
  play: async ({ canvasElement }) => {
    await openPopover(canvasElement, 'Filter')
    const environment = getEnvironment()

    // Display mode (0): stored display values.
    await expect(
      environment.store.getState().config.plugin.ShipInfo.rawValue ?? 0,
    ).toBe(0)
    await expect(radioChecked('Display')).toBe(true)
    await expect(radioChecked('Raw Value')).toBe(false)
    await waitFor(async () => {
      await expect(
        cell(canvasElement, 'Alpha', dataColumnIndex.kaihi),
      ).toBe('40')
    })
    await expect(
      cell(canvasElement, 'Alpha', dataColumnIndex.karyoku),
    ).toContain('10/')

    // Raw Value mode (1): computed values from the level + db stats.
    await userEvent.click(radioLabel('Raw Value'))
    await expect(
      environment.store.getState().config.plugin.ShipInfo.rawValue,
    ).toBe(1)
    await expect(radioChecked('Raw Value')).toBe(true)
    await expect(radioChecked('Display')).toBe(false)
    await waitFor(async () => {
      // getValueByLevel(40, 80, 50) = 60
      await expect(
        cell(canvasElement, 'Alpha', dataColumnIndex.kaihi),
      ).toBe('60')
    })
    await expect(
      cell(canvasElement, 'Alpha', dataColumnIndex.karyoku),
    ).toContain('20/')

    // Back to Display mode (0).
    await userEvent.click(radioLabel('Display'))
    await expect(
      environment.store.getState().config.plugin.ShipInfo.rawValue,
    ).toBe(0)
    await expect(radioChecked('Display')).toBe(true)
    await waitFor(async () => {
      await expect(
        cell(canvasElement, 'Alpha', dataColumnIndex.kaihi),
      ).toBe('40')
    })
  },
}
