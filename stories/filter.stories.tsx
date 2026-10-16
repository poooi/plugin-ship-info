import { Classes } from '@blueprintjs/core'
import type { Meta, StoryObj } from '@storybook/react-vite'
import React from 'react'
import {
  expect,
  fireEvent,
  screen,
  userEvent,
  waitFor,
  within,
} from 'storybook/test'

import { getEnvironment } from '../preview/scenario'
import { tableState } from '../preview/table-fixtures'
import { Filter } from '../views/sidebar/filter'
import { TableView } from '../views/table'
import {
  openPopover,
  popoverContent,
  renderedNames,
} from './table-support'

const FilterTable: React.FC = () => (
  <>
    <TableView />
    <Filter />
  </>
)

const meta = {
  title: 'Filter/Controls',
  component: FilterTable,
  parameters: { shipInfo: { state: tableState() } },
} satisfies Meta<typeof FilterTable>

export default meta
type Story = StoryObj<typeof meta>

const cardLabel = (scope: HTMLElement, text: string): HTMLElement =>
  within(scope).getByText(text).closest('label') as HTMLElement

// Scope to the popover: several headings (Level, Lock) also exist as table
// column headers behind the overlay.
const filterSection = (heading: string): HTMLElement =>
  within(popoverContent()).getByText(heading).parentElement as HTMLElement

const shipTypeRows = () => {
  const box = filterSection('Ship types')
  return {
    individual: box.children[2] as HTMLElement,
    supertype: box.children[1] as HTMLElement,
  }
}

const allRows = [
  'Zeta',
  'Gamma',
  'Delta',
  'Eta',
  'Alpha',
  'Beta',
  'Theta',
  'Epsilon',
]

export const PopoverOpens: Story = {
  name: 'Filter popover opens with all controls',
  play: async ({ canvasElement }) => {
    await openPopover(canvasElement, 'Filter')
    const popover = within(popoverContent())
    await popover.findByText('Level')
    await popover.findByText('Sally Area')
    await popover.findByText('Lock')
    await popover.findByText('Value Type')
  },
}

export const ShipTypeIndividualToggle: Story = {
  name: 'Individual ship type toggle filters rows',
  play: async ({ canvasElement }) => {
    await openPopover(canvasElement, 'Filter')
    const environment = getEnvironment()
    await waitForRows(canvasElement, allRows)

    await userEvent.click(cardLabel(shipTypeRows().individual, 'DD'))

    await expect(
      typeof environment.store.getState().config.plugin.ShipInfo.shipTypes,
    ).toBe('number')
    await waitForRows(canvasElement, ['Zeta', 'Gamma', 'Delta', 'Eta', 'Epsilon'])
  },
}

export const ShipTypeGroupToggle: Story = {
  name: 'Ship-type group toggle filters rows',
  play: async ({ canvasElement }) => {
    await openPopover(canvasElement, 'Filter')
    await waitForRows(canvasElement, allRows)

    // The CA supertype card clears the whole CA group (types 5 and 6).
    await userEvent.click(cardLabel(shipTypeRows().supertype, 'CA'))

    await waitForRows(canvasElement, [
      'Zeta',
      'Gamma',
      'Eta',
      'Alpha',
      'Beta',
      'Theta',
      'Epsilon',
    ])
  },
}

export const ShipTypeAllNone: Story = {
  name: 'Ship-type All/None toggles every row',
  play: async ({ canvasElement }) => {
    await openPopover(canvasElement, 'Filter')
    const { supertype } = shipTypeRows()

    await userEvent.click(cardLabel(supertype, 'All'))
    await waitForRows(canvasElement, [])

    await userEvent.click(cardLabel(supertype, 'All'))
    await waitForRows(canvasElement, allRows)
  },
}

export const ShipTypeContextMenuExclusive: Story = {
  name: 'Context menu exclusively selects one ship type',
  play: async ({ canvasElement }) => {
    await openPopover(canvasElement, 'Filter')
    const { individual } = shipTypeRows()

    await fireEvent.contextMenu(cardLabel(individual, 'DD'))

    await waitForRows(canvasElement, ['Alpha', 'Beta', 'Theta'])
  },
}

export const SallyAreaToggle: Story = {
  name: 'Sally area toggle filters tagged ships',
  play: async ({ canvasElement }) => {
    await openPopover(canvasElement, 'Filter')
    const cards = filterSection('Sally Area').children[1] as HTMLElement

    await userEvent.click(cardLabel(cards, 'E1'))

    // Beta and Zeta are tagged E1 (area 1).
    await waitForRows(canvasElement, [
      'Gamma',
      'Delta',
      'Eta',
      'Alpha',
      'Theta',
      'Epsilon',
    ])
  },
}

export const SallyAreaFreeToggle: Story = {
  name: 'Sally Free toggle keeps only tagged ships',
  play: async ({ canvasElement }) => {
    await openPopover(canvasElement, 'Filter')
    const cards = filterSection('Sally Area').children[1] as HTMLElement

    await userEvent.click(cardLabel(cards, 'Free'))

    await waitForRows(canvasElement, ['Zeta', 'Delta', 'Eta', 'Beta'])
  },
}

export const SallyAreaAllNone: Story = {
  name: 'Sally All/None toggles every row',
  play: async ({ canvasElement }) => {
    await openPopover(canvasElement, 'Filter')
    const cards = filterSection('Sally Area').children[1] as HTMLElement

    await userEvent.click(cardLabel(cards, 'All'))
    await waitForRows(canvasElement, [])

    await userEvent.click(cardLabel(cards, 'All'))
    await waitForRows(canvasElement, allRows)
  },
}

export const SallyAreaFleetNameDisplay: Story = {
  name: 'Fleet-name display relabels sally areas',
  parameters: {
    shipInfo: {
      state: tableState({
        config: {
          plugin: { ShipInfo: { displayFleetName: true } },
          poi: { appearance: { avatar: false } },
        },
      }),
    },
  },
  play: async ({ canvasElement }) => {
    await openPopover(canvasElement, 'Filter')
    await screen.findByText('Fleet A')
    const cards = filterSection('Sally Area').children[1] as HTMLElement
    await expect(within(cards).getByText('Fleet B')).toBeTruthy()

    await userEvent.click(cardLabel(cards, 'Fleet A'))
    await waitForRows(canvasElement, [
      'Gamma',
      'Delta',
      'Eta',
      'Alpha',
      'Theta',
      'Epsilon',
    ])
  },
}

const SHIP_LEVELS: [string, number][] = [
  ['Zeta', 200],
  ['Gamma', 150],
  ['Delta', 100],
  ['Eta', 80],
  ['Alpha', 50],
  ['Beta', 10],
  ['Theta', 5],
  ['Epsilon', 1],
]

const rowsForMinLevel = (minLevel: number): string[] =>
  SHIP_LEVELS.filter(([, lv]) => lv >= minLevel).map(([name]) => name)

const rowsForMaxLevel = (maxLevel: number): string[] =>
  SHIP_LEVELS.filter(([, lv]) => lv <= maxLevel).map(([name]) => name)

export const LevelSliderCommitsAndFilters: Story = {
  name: 'Level slider commits limits, filters and clears via the UI',
  parameters: {
    // Seed max = 200 so all eight ships initially fit at the top of the range.
    shipInfo: {
      state: tableState({
        config: {
          plugin: { ShipInfo: { filters: { maxLevel: 200, minLevel: 0 } } },
          poi: { appearance: { avatar: false } },
        },
      }),
    },
  },
  play: async ({ canvasElement }) => {
    await openPopover(canvasElement, 'Filter')
    const environment = getEnvironment()
    await waitForRows(canvasElement, allRows)

    const handles = () =>
      Array.from(
        popoverContent().querySelectorAll<HTMLElement>(
          `.${Classes.SLIDER_HANDLE}`,
        ),
      )
    const minHandle = () => handles()[0]
    const maxHandle = () => handles()[handles().length - 1]
    const ariaValue = (el: HTMLElement) =>
      Number(el.getAttribute('aria-valuenow'))
    const minLevel = () =>
      environment.store.getState().config.plugin.ShipInfo.filters.minLevel
    const maxLevel = () =>
      environment.store.getState().config.plugin.ShipInfo.filters.maxLevel

    // Maximum handle: one ArrowLeft lowers max 200 -> 199, excluding Zeta.
    maxHandle().focus()
    await userEvent.keyboard('{ArrowLeft}')
    await expect(ariaValue(maxHandle())).toBe(199)
    await waitFor(
      async () => {
        await expect(maxLevel()).toBe(199)
      },
      { timeout: 3000 },
    )
    await waitForRows(canvasElement, rowsForMaxLevel(199))

    // ArrowRight restores max = 200 and every row.
    maxHandle().focus()
    await userEvent.keyboard('{ArrowRight}')
    await expect(ariaValue(maxHandle())).toBe(200)
    await waitFor(
      async () => {
        await expect(maxLevel()).toBe(200)
      },
      { timeout: 3000 },
    )
    await waitForRows(canvasElement, allRows)

    // Minimum handle: each ArrowRight raises the minimum by exactly one level.
    // Two presses set min = 2 (excludes Epsilon, lv 1).
    minHandle().focus()
    await userEvent.keyboard('{ArrowRight}{ArrowRight}')
    await expect(ariaValue(minHandle())).toBe(2)
    await waitFor(
      async () => {
        await expect(minLevel()).toBe(2)
      },
      { timeout: 3000 },
    )
    await waitForRows(canvasElement, rowsForMinLevel(2))

    // Two ArrowLeft presses return the minimum to 0 and restore every row.
    minHandle().focus()
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}')
    await expect(ariaValue(minHandle())).toBe(0)
    await waitFor(
      async () => {
        await expect(minLevel()).toBe(0)
      },
      { timeout: 3000 },
    )
    await waitForRows(canvasElement, allRows)
  },
}

export const SallyMapCountChanges: Story = {
  name: 'Host sally map-count change updates the filter',
  play: async ({ canvasElement }) => {
    await openPopover(canvasElement, 'Filter')
    const environment = getEnvironment()
    await within(popoverContent()).findByText('E2')
    await expect(within(popoverContent()).queryByText('E3')).toBeNull()

    const fcd = tableState().fcd
    environment.store.dispatch({
      type: 'TEST/REPLACE',
      state: {
        fcd: {
          ...fcd,
          shiptag: { ...fcd.shiptag, mapname: ['E1', 'E2', 'E3'] },
        },
      },
    })

    await waitFor(async () => {
      await expect(within(popoverContent()).getByText('E3')).toBeTruthy()
    })
  },
}

async function waitForRows(root: HTMLElement, expected: string[]) {
  await waitFor(async () => {
    await expect(renderedNames(root)).toEqual(expected)
  })
}
