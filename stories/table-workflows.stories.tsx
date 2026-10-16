import type { Meta, StoryObj } from '@storybook/react-vite'
import React from 'react'
import { expect, fireEvent, userEvent, waitFor, within } from 'storybook/test'

import { getEnvironment } from '../preview/scenario'
import {
  emptyTableState,
  tableState,
  virtualShipCount,
  virtualTableState,
} from '../preview/table-fixtures'
import { mkShip } from '../tests/fixtures'
import { filteredShipIdsAtom, TableView } from '../views/table'
import {
  headerCellByTitle,
  headerTitles,
  renderedNames,
  renderedShipLabels,
  tableScroller,
} from './table-support'

const Table: React.FC = () => <TableView />

const meta = {
  title: 'Table/Workflows',
  component: Table,
  // No shared shipInfo parameters: Storybook deep-merges story parameters over
  // meta parameters, so a shared state would prevent the empty-data story from
  // truly replacing the base ships. Each story sets its own state.
} satisfies Meta<typeof Table>

export default meta
type Story = StoryObj<typeof meta>

export const DefaultSortOrder: Story = {
  name: 'Default level-descending sort order',
  parameters: { shipInfo: { state: tableState() } },
  play: async ({ canvasElement }) => {
    await waitFor(async () => {
      await expect(renderedNames(canvasElement)).toEqual([
        'Zeta',
        'Gamma',
        'Delta',
        'Eta',
        'Alpha',
        'Beta',
        'Theta',
        'Epsilon',
      ])
    })
  },
}

export const HeaderClickSorts: Story = {
  name: 'Header click re-sorts from the store',
  parameters: { shipInfo: { state: tableState() } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const environment = getEnvironment()
    await canvas.findByText('Alpha')

    await userEvent.click(canvas.getByRole('button', { name: 'ID' }))

    await expect(environment.configCalls).toContainEqual([
      'plugin.ShipInfo.sortName',
      'id',
    ])
    await expect(environment.configCalls).toContainEqual([
      'plugin.ShipInfo.sortOrder',
      1,
    ])
    await waitFor(async () => {
      await expect(renderedNames(canvasElement)).toEqual([
        'Alpha',
        'Beta',
        'Gamma',
        'Delta',
        'Epsilon',
        'Zeta',
        'Eta',
        'Theta',
      ])
    })
  },
}

export const HeaderKeyboardSorts: Story = {
  name: 'Header keyboard activation sorts (Enter)',
  parameters: { shipInfo: { state: tableState() } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const environment = getEnvironment()
    await canvas.findByText('Alpha')

    const idHeader = canvas.getByRole('button', { name: 'ID' })
    idHeader.focus()
    await userEvent.keyboard('{Enter}')

    await expect(environment.configCalls).toContainEqual([
      'plugin.ShipInfo.sortName',
      'id',
    ])
    await waitFor(async () => {
      await expect(renderedNames(canvasElement)).toEqual([
        'Alpha',
        'Beta',
        'Gamma',
        'Delta',
        'Epsilon',
        'Zeta',
        'Eta',
        'Theta',
      ])
    })
  },
}

export const NonSortableHeaderIgnored: Story = {
  name: 'Non-sortable header click does nothing',
  parameters: { shipInfo: { state: tableState() } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const environment = getEnvironment()
    await canvas.findByText('Alpha')

    const before = renderedNames(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Equipment' }))

    await expect(environment.configCalls).toEqual([])
    await expect(renderedNames(canvasElement)).toEqual(before)
  },
}

export const HiddenAndReorderedColumns: Story = {
  name: 'Hidden and reordered columns render from the store',
  parameters: {
    shipInfo: {
      state: tableState({
        config: {
          plugin: {
            ShipInfo: {
              columnOrder: ['rowIndex', 'name', 'id'],
              columnVisibility: { type: false },
            },
          },
          poi: { appearance: { avatar: false } },
        },
      }),
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await canvas.findByText('Alpha')

    await waitFor(async () => {
      await expect(headerTitles(canvasElement).slice(0, 2)).toEqual([
        'Name',
        'ID',
      ])
    })
    await expect(headerTitles(canvasElement)).not.toContain('Class')
  },
}

export const VirtualizationRetainsIds: Story = {
  name: 'Virtual scroll changes rows but retains full sorted ids',
  parameters: { shipInfo: { state: virtualTableState() } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const environment = getEnvironment()
    await canvas.findByText('Ship 40')

    await expect(renderedShipLabels(canvasElement)).toContain('Ship 40')
    await expect(renderedShipLabels(canvasElement)).not.toContain('Ship 1')

    const scroller = tableScroller(canvasElement)
    scroller.scrollTop = scroller.scrollHeight
    await fireEvent.scroll(scroller)

    await waitFor(async () => {
      await expect(renderedShipLabels(canvasElement)).toContain('Ship 1')
    })
    await expect(renderedShipLabels(canvasElement)).not.toContain('Ship 40')

    await expect(environment.jotaiStore.get(filteredShipIdsAtom)).toEqual(
      Array.from({ length: virtualShipCount }, (_, i) => virtualShipCount - i),
    )
  },
}

const pinnedConfig = () => ({
  config: {
    plugin: {
      ShipInfo: {
        columnPinning: { left: ['rowIndex', 'name'], right: ['lock'] },
      },
    },
    poi: { appearance: { avatar: false } },
  },
})

export const HorizontalScrollKeepsPins: Story = {
  name: 'Pins stay put during horizontal scroll (LTR)',
  parameters: { shipInfo: { state: tableState(pinnedConfig()) } },
  play: async ({ canvasElement }) => {
    const root = canvasElement
    const scroller = tableScroller(root)
    await waitFor(async () => {
      await expect(scroller.scrollWidth).toBeGreaterThan(scroller.clientWidth)
    })

    // Offset of the start pin from the wrapper's left = the rowIndex width.
    const nameOffset = () =>
      Math.round(
        headerCellByTitle(root, 'Name').getBoundingClientRect().left -
          scroller.getBoundingClientRect().left,
      )
    const lockOffset = () =>
      Math.round(
        scroller.getBoundingClientRect().right -
          headerCellByTitle(root, 'Lock').getBoundingClientRect().right,
      )
    const levelLeft = () =>
      Math.round(headerCellByTitle(root, 'Level').getBoundingClientRect().left)

    // Correct initial offsets: rowIndex (40px) then Name; Lock flush right.
    await expect(Math.abs(nameOffset() - 40)).toBeLessThanOrEqual(3)
    await expect(Math.abs(lockOffset())).toBeLessThanOrEqual(3)

    const nameBefore = nameOffset()
    const lockBefore = lockOffset()
    const levelBefore = levelLeft()

    scroller.scrollLeft = 320
    await fireEvent.scroll(scroller)
    await waitFor(async () => {
      await expect(scroller.scrollLeft).toBeGreaterThan(200)
    })

    // Pins hold their absolute offset; the difference is within tolerance.
    await expect(Math.abs(nameOffset() - nameBefore)).toBeLessThanOrEqual(2)
    await expect(Math.abs(lockOffset() - lockBefore)).toBeLessThanOrEqual(2)
    // An unpinned column moved left with the scroll.
    await expect(levelBefore - levelLeft()).toBeGreaterThan(200)
  },
}

export const RtlPins: Story = {
  name: 'Start/end pins follow RTL direction while scrolling',
  parameters: {
    shipInfo: { direction: 'rtl', state: tableState(pinnedConfig()) },
  },
  play: async ({ canvasElement }) => {
    const root = canvasElement
    const scroller = tableScroller(root)
    await waitFor(async () => {
      await expect(scroller.scrollWidth).toBeGreaterThan(scroller.clientWidth)
    })

    // In RTL, inline-start pins sit at the right edge; inline-end at the left.
    const startOffset = () =>
      Math.round(
        scroller.getBoundingClientRect().right -
          headerCellByTitle(root, 'Name').getBoundingClientRect().right,
      )
    const endOffset = () =>
      Math.round(
        headerCellByTitle(root, 'Lock').getBoundingClientRect().left -
          scroller.getBoundingClientRect().left,
      )
    const levelLeft = () =>
      Math.round(headerCellByTitle(root, 'Level').getBoundingClientRect().left)

    await expect(Math.abs(startOffset() - 40)).toBeLessThanOrEqual(3)
    await expect(Math.abs(endOffset())).toBeLessThanOrEqual(3)

    const startBefore = startOffset()
    const endBefore = endOffset()
    const unpinnedBefore = levelLeft()

    // Scroll horizontally; Chromium may use negative or reversed scrollLeft.
    const maxScroll = scroller.scrollWidth - scroller.clientWidth
    scroller.scrollLeft = -maxScroll
    await fireEvent.scroll(scroller)
    if (Math.abs(scroller.scrollLeft) < 100) {
      scroller.scrollLeft = maxScroll
      await fireEvent.scroll(scroller)
    }
    await waitFor(async () => {
      await expect(Math.abs(scroller.scrollLeft)).toBeGreaterThan(200)
    })

    await expect(Math.abs(startOffset() - startBefore)).toBeLessThanOrEqual(2)
    await expect(Math.abs(endOffset() - endBefore)).toBeLessThanOrEqual(2)
    await expect(Math.abs(levelLeft() - unpinnedBefore)).toBeGreaterThan(200)
  },
}

export const CellHighlightInteraction: Story = {
  name: 'Cell highlight: click, keyboard and context menu',
  parameters: { shipInfo: { state: tableState() } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await canvas.findByText('Alpha')

    const nameCell = () =>
      canvas.getByText('Alpha').closest('[role="gridcell"]') as HTMLElement
    const isHighlighted = () =>
      getComputedStyle(nameCell()).backgroundColor === 'rgba(138, 155, 168, 0.3)'

    await expect(isHighlighted()).toBe(false)

    await userEvent.click(nameCell())
    await expect(isHighlighted()).toBe(true)

    await userEvent.click(nameCell())
    await expect(isHighlighted()).toBe(false)

    nameCell().focus()
    await userEvent.keyboard(' ')
    await expect(isHighlighted()).toBe(true)

    nameCell().focus()
    await userEvent.keyboard(' ')
    await expect(isHighlighted()).toBe(false)

    nameCell().focus()
    await userEvent.keyboard('{Enter}')
    await expect(isHighlighted()).toBe(true)

    await fireEvent.contextMenu(nameCell())
    await expect(isHighlighted()).toBe(false)
  },
}

export const EmptyData: Story = {
  name: 'Empty host data renders no rows',
  parameters: { shipInfo: { state: emptyTableState() } },
  play: async ({ canvasElement }) => {
    await waitFor(async () => {
      await expect(
        canvasElement.querySelectorAll('[role="gridcell"]').length,
      ).toBe(0)
    })
    await expect(renderedNames(canvasElement)).toEqual([])
  },
}

export const HostUpdateWhileFilterActive: Story = {
  name: 'Host ship update while a filter is active refreshes rows',
  parameters: {
    shipInfo: {
      state: tableState({
        config: {
          plugin: { ShipInfo: { filters: { maxLevel: 450, minLevel: 100 } } },
          poi: { appearance: { avatar: false } },
        },
      }),
    },
  },
  play: async ({ canvasElement }) => {
    const environment = getEnvironment()
    await within(canvasElement).findByText('Zeta')
    await expect(renderedNames(canvasElement)).not.toContain('Theta')

    // Host update: Theta's level rises above the active min-level filter.
    environment.store.dispatch({
      type: 'TEST/REPLACE',
      state: {
        info: {
          ...tableState().info,
          ships: {
            ...tableState().info.ships,
            8: mkShip({ api_id: 8, api_lv: 300 }),
          },
        },
      },
    })

    await waitFor(async () => {
      await expect(renderedNames(canvasElement)).toContain('Theta')
    })
  },
}
