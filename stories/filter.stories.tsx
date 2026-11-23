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
import { mkShip } from '../tests/fixtures'
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
  within(popoverContent()).getByRole('heading', { name: heading })
    .parentElement as HTMLElement

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
    await popover.findByRole('heading', { name: 'Level' })
    await popover.findByRole('heading', { name: 'Sally Area' })
    await popover.findByText('Lock')
    await popover.findByRole('heading', { name: 'Value Type' })
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
    await waitForRows(canvasElement, [
      'Zeta',
      'Gamma',
      'Delta',
      'Eta',
      'Epsilon',
    ])
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

export const LevelInputsFilterAndDecorativeTrack: Story = {
  name: 'Level inputs filter and the decorative track follows the range',
  play: async ({ canvasElement }) => {
    await openPopover(canvasElement, 'Filter')
    const environment = getEnvironment()
    const min = screen.getByRole<HTMLInputElement>('textbox', {
      name: 'Minimum level',
    })
    const max = screen.getByRole<HTMLInputElement>('textbox', {
      name: 'Maximum level',
    })
    const track = popoverContent().querySelector(
      '[data-level-track]',
    ) as HTMLElement
    const highlight = track.querySelector(
      '[data-level-highlight]',
    ) as HTMLElement
    const config = () => environment.store.getState().config.plugin.ShipInfo
    const ratios = () => {
      const trackRect = track.getBoundingClientRect()
      const fillRect = highlight.getBoundingClientRect()
      return {
        left: (fillRect.left - trackRect.left) / trackRect.width,
        width: fillRect.width / trackRect.width,
      }
    }

    await waitForRows(canvasElement, allRows)
    await waitFor(() => {
      expect(ratios().left).toBeCloseTo(0, 2)
      expect(ratios().width).toBeCloseTo(1, 2)
    })

    await userEvent.clear(max)
    await userEvent.type(max, '200')
    await waitForRows(canvasElement, allRows)
    await waitFor(() => {
      expect(ratios().left).toBeCloseTo(0, 2)
      expect(ratios().width).toBeCloseTo(200 / 200, 2)
    })

    await userEvent.clear(min)
    await userEvent.type(min, '100')
    await waitForRows(canvasElement, rowsForMinLevel(100))
    await waitFor(() => {
      expect(ratios().left).toBeCloseTo(100 / 200, 2)
      expect(ratios().width).toBeCloseTo(100 / 200, 2)
    })

    // Equal endpoints remain perceptible as a tiny segment.
    await userEvent.clear(max)
    await userEvent.type(max, '100')
    await waitForRows(canvasElement, ['Delta'])
    await waitFor(() => {
      const fillRect = highlight.getBoundingClientRect()
      expect(fillRect.width).toBeGreaterThan(0)
      expect(fillRect.width).toBeLessThanOrEqual(3)
      expect(ratios().left).toBeCloseTo(100 / 200, 2)
    })

    // At the maximum point, the clamped start keeps the tiny segment inside.
    await userEvent.clear(max)
    await userEvent.type(max, '200')
    await waitForRows(canvasElement, rowsForMinLevel(100))
    await userEvent.clear(min)
    await userEvent.type(min, '200')
    await waitForRows(canvasElement, ['Zeta'])
    await waitFor(() => {
      const trackRect = track.getBoundingClientRect()
      const fillRect = highlight.getBoundingClientRect()
      expect(fillRect.left).toBeGreaterThanOrEqual(trackRect.left - 0.5)
      expect(fillRect.right).toBeLessThanOrEqual(trackRect.right + 0.5)
      expect(fillRect.width).toBeGreaterThan(0)
      expect(fillRect.width).toBeLessThanOrEqual(3)
    })

    // The track is purely decorative: no focus, pointer or keyboard edits.
    const before = config().filters
    min.focus()
    await expect(track.getAttribute('tabindex')).toBeNull()
    track.focus()
    fireEvent.mouseDown(track)
    fireEvent.click(track)
    fireEvent.keyDown(track, { key: 'ArrowRight' })
    fireEvent.keyUp(track, { key: 'ArrowRight' })
    await expect(min).toHaveFocus()
    await expect(config().filters).toEqual(before)
    await expect(popoverContent()).toBeTruthy()
  },
}

export const LevelCeilingFollowsOwnedRoster: Story = {
  name: 'Upper bound follows the owned ceiling until explicitly capped',
  parameters: {
    shipInfo: {
      state: (() => {
        const base = tableState()
        const ships = Object.fromEntries(
          Object.entries(base.info.ships).map(([id, ship]) => [
            id,
            { ...(ship as any), api_lv: 1 },
          ]),
        )
        return tableState({
          info: {
            ...base.info,
            ships: { ...ships, 1: mkShip({ api_id: 1, api_lv: 173 }) },
          },
        })
      })(),
    },
  },
  play: async ({ canvasElement }) => {
    await openPopover(canvasElement, 'Filter')
    const environment = getEnvironment()
    const min = screen.getByRole<HTMLInputElement>('textbox', {
      name: 'Minimum level',
    })
    const max = screen.getByRole<HTMLInputElement>('textbox', {
      name: 'Maximum level',
    })
    const filters = () =>
      environment.store.getState().config.plugin.ShipInfo.filters
    const grow = (level: number) => {
      const state = environment.store.getState()
      environment.store.dispatch({
        type: 'TEST/REPLACE',
        state: {
          info: {
            ...state.info,
            ships: {
              ...state.info.ships,
              1: mkShip({ api_id: 1, api_lv: level }),
            },
          },
        },
      })
    }

    // 173 rounds up to 175; an exact multiple stays unchanged.
    await expect(max).toHaveValue('175')
    grow(175)
    await waitFor(() => expect(max).toHaveValue('175'))

    // An untouched upper bound follows the roster ceiling.
    grow(176)
    await waitFor(() => expect(max).toHaveValue('180'))
    await expect(filters()?.maxLevel).toBeUndefined()

    // A lower explicit maximum stays fixed as the roster grows.
    await userEvent.clear(max)
    await userEvent.type(max, '175')
    await waitFor(() => expect(filters()).toEqual({ maxLevel: 175, minLevel: 0 }))
    grow(183)
    await waitFor(() => expect(max).toHaveValue('175'))
    await expect(filters()).toEqual({ maxLevel: 175, minLevel: 0 })

    // Setting the upper bound back to the current ceiling restores
    // unrestricted mode instead of persisting that value.
    await userEvent.clear(max)
    await userEvent.type(max, '185{Tab}')
    await waitFor(() => expect(filters()?.maxLevel).toBeUndefined())
    await waitFor(() => expect(max).toHaveValue('185'))
    grow(188)
    await waitFor(() => expect(max).toHaveValue('190'))
    await expect(filters()?.maxLevel).toBeUndefined()

    // Changing only the lower bound keeps the upper bound unrestricted.
    await userEvent.clear(min)
    await userEvent.type(min, '100')
    await waitFor(() => expect(filters()).toEqual({ minLevel: 100 }))
    grow(191)
    await waitFor(() => expect(max).toHaveValue('195'))
  },
}

export const LevelCeilingEmptyRoster: Story = {
  name: 'Zero level ceiling keeps the decorative track safe',
  parameters: {
    shipInfo: {
      state: (() => {
        const base = tableState()
        const ships = Object.fromEntries(
          Object.entries(base.info.ships).map(([id, ship]) => [
            id,
            { ...(ship as any), api_lv: 0 },
          ]),
        )
        return tableState({ info: { ...base.info, ships } })
      })(),
    },
  },
  play: async ({ canvasElement }) => {
    await openPopover(canvasElement, 'Filter')
    const max = screen.getByRole<HTMLInputElement>('textbox', {
      name: 'Maximum level',
    })
    const track = popoverContent().querySelector(
      '[data-level-track]',
    ) as HTMLElement
    const highlight = track.querySelector(
      '[data-level-highlight]',
    ) as HTMLElement

    await expect(max).toHaveValue('0')
    await waitFor(() => {
      const trackRect = track.getBoundingClientRect()
      const fillRect = highlight.getBoundingClientRect()
      expect(trackRect.width).toBeGreaterThan(0)
      expect(Number.isFinite(fillRect.width)).toBe(true)
      expect(fillRect.width).toBe(0)
    })
  },
}

export const LevelInputsPreserveCaret: Story = {
  play: async ({ canvasElement }) => {
    await openPopover(canvasElement, 'Filter')
    const min = screen.getByRole<HTMLInputElement>('textbox', {
      name: 'Minimum level',
    })
    const max = screen.getByRole('textbox', { name: 'Maximum level' })

    const track = popoverContent().querySelector('[data-level-track]')!
    const rail = track.getBoundingClientRect()
    const left = min.getBoundingClientRect()
    const right = max.getBoundingClientRect()
    await expect(left.right).toBeLessThan(rail.left)
    await expect(rail.right).toBeLessThan(right.left)
    for (const field of [left, right]) {
      const offset = field.top + field.height / 2 - (rail.top + rail.height / 2)
      await expect(Math.abs(offset)).toBeLessThanOrEqual(1)
    }

    await userEvent.clear(min)
    await userEvent.keyboard('05{ArrowLeft}')
    await waitForRows(canvasElement, rowsForMinLevel(5))
    await expect(min).toHaveFocus()
    await expect(min.selectionStart).toBe(1)
    await userEvent.keyboard('1')
    await expect(min).toHaveValue('015')
    await expect(min.selectionStart).toBe(2)
    await userEvent.keyboard('{Backspace}')
    await expect(min).toHaveValue('05')
    await expect(min.selectionStart).toBe(1)
    await userEvent.keyboard('1')
    await userEvent.keyboard('{Enter}')
    await expect(min).toHaveValue('15')

    await userEvent.clear(max)
    await userEvent.keyboard('1.5e0')
    await expect(max).toHaveValue('150')
    await waitForRows(canvasElement, ['Gamma', 'Delta', 'Eta', 'Alpha'])
    await userEvent.clear(max)
    await userEvent.keyboard('2{Tab}')
    await expect(max).toHaveValue('15')
    await waitForRows(canvasElement, [])
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
