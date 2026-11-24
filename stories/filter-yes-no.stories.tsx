import type { Meta, StoryObj } from '@storybook/react-vite'
import React from 'react'
import { expect, userEvent, waitFor, within } from 'storybook/test'

import { tableState } from '../preview/table-fixtures'
import { Filter } from '../packages/ship-info/src/views/sidebar/filter'
import { TableView } from '../packages/ship-info/src/views/table'
import { openPopover, popoverContent, renderedNames } from './table-support'

const FilterTable: React.FC = () => (
  <>
    <TableView />
    <Filter />
  </>
)

const meta = {
  title: 'Filter/YesNo',
  component: FilterTable,
  parameters: { shipInfo: { state: tableState() } },
} satisfies Meta<typeof FilterTable>

export default meta
type Story = StoryObj<typeof meta>

const ALL = [
  'Zeta',
  'Gamma',
  'Delta',
  'Eta',
  'Alpha',
  'Beta',
  'Theta',
  'Epsilon',
]

const cardLabel = (scope: HTMLElement, text: string): HTMLElement =>
  within(scope).getByText(text).closest('label') as HTMLElement

const section = (heading: string): HTMLElement =>
  within(popoverContent()).getByText(heading).parentElement as HTMLElement

async function waitForRows(root: HTMLElement, expected: string[]) {
  await waitFor(async () => {
    await expect(renderedNames(root)).toEqual(expected)
  })
}

// Turning a side off isolates it: [Yes,No] -> [Yes,off] shows only yes-matching
// rows, [off,off] shows none, [off,No] shows only no-matching rows, and turning
// both back on shows every row again. All four states are exercised.
const yesNoStory = (
  heading: string,
  matching: string[],
  nonMatching: string[],
): Story => ({
  name: `${heading} Yes/No filter changes rows`,
  play: async ({ canvasElement }) => {
    await openPopover(canvasElement, 'Filter')
    await waitForRows(canvasElement, ALL)

    await userEvent.click(cardLabel(section(heading), 'No'))
    await waitForRows(canvasElement, matching)

    // Both sides unchecked filters every row out.
    await userEvent.click(cardLabel(section(heading), 'Yes'))
    await waitForRows(canvasElement, [])

    await userEvent.click(cardLabel(section(heading), 'No'))
    await waitForRows(canvasElement, nonMatching)

    await userEvent.click(cardLabel(section(heading), 'Yes'))
    await waitForRows(canvasElement, ALL)
  },
})

export const Locked = yesNoStory(
  'Lock',
  ['Delta', 'Eta', 'Beta'],
  ['Zeta', 'Gamma', 'Alpha', 'Theta', 'Epsilon'],
)

export const Expedition = yesNoStory(
  'Expedition',
  ['Alpha', 'Beta'],
  ['Zeta', 'Gamma', 'Delta', 'Eta', 'Theta', 'Epsilon'],
)

export const InFleet = yesNoStory(
  'In Fleet',
  ['Gamma', 'Alpha', 'Beta'],
  ['Zeta', 'Delta', 'Eta', 'Theta', 'Epsilon'],
)

export const Sparkle = yesNoStory(
  'Sparkle',
  ['Eta', 'Alpha', 'Theta', 'Epsilon'],
  ['Zeta', 'Gamma', 'Delta', 'Beta'],
)

export const ExtraSlot = yesNoStory(
  'Extra Slot',
  ['Alpha', 'Beta'],
  ['Zeta', 'Gamma', 'Delta', 'Eta', 'Theta', 'Epsilon'],
)

export const SpecialEquipment: Story = {
  name: 'Special equipment checkboxes require each selected item',
  play: async ({ canvasElement }) => {
    await openPopover(canvasElement, 'Filter')
    const nav = within(popoverContent()).getByRole('navigation')
    await userEvent.click(within(nav).getByRole('button', { name: 'Special equipment' }))
    const equipment = within(within(popoverContent()).getByRole('region', { name: 'Special equipment' }))
    const option = (name: string) => equipment.getByRole('checkbox', { name })
    const daihatsu = option('Daihatsu')
    const tank = option('Type 89 Tank Landing Craft')
    const kaMi = option('Type 2 Ka-Mi')
    await expect(equipment.getAllByRole('checkbox')).toHaveLength(3)
    await expect(daihatsu).not.toBeChecked()
    await waitForRows(canvasElement, ALL)
    await userEvent.click(daihatsu)
    await waitForRows(canvasElement, ['Alpha'])
    await userEvent.click(tank)
    await waitForRows(canvasElement, ['Alpha'])
    await userEvent.click(kaMi)
    await waitForRows(canvasElement, [])
    await userEvent.click(daihatsu)
    await userEvent.click(tank)
    await waitForRows(canvasElement, ['Beta'])
    await userEvent.click(kaMi)
    await waitForRows(canvasElement, ALL)
  },
}

export const LegacyEquipmentExclusion: Story = {
  parameters: {
    shipInfo: { state: tableState({ config: { plugin: { ShipInfo: { daihatsu: [false, true] } } } }) },
  },
  play: async ({ canvasElement }) => {
    await openPopover(canvasElement, 'Filter')
    const panel = within(popoverContent())
    const nav = within(panel.getByRole('navigation'))
    await userEvent.click(nav.getByRole('button', { name: /Special equipment/ }))
    const box = panel.getByRole('checkbox', { name: 'Daihatsu (No)' })
    await expect(box).toBePartiallyChecked()
    await waitForRows(canvasElement, ALL.filter(name => name !== 'Alpha'))
    await userEvent.click(box)
    await expect(box).not.toBeChecked()
    await expect(box).not.toBePartiallyChecked()
    await waitForRows(canvasElement, ALL)
    await expect(nav.getByRole('button', { name: 'Special equipment' })).toBeTruthy()
  },
}

export const Modernization = yesNoStory(
  'Modernization Completed',
  ['Gamma', 'Eta', 'Alpha', 'Epsilon'],
  ['Zeta', 'Delta', 'Beta', 'Theta'],
)

export const Remodel = yesNoStory(
  'Remodelable',
  ['Delta', 'Eta', 'Beta'],
  ['Zeta', 'Gamma', 'Alpha', 'Theta', 'Epsilon'],
)
