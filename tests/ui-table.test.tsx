// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { clipboard } from 'electron'
import React from 'react'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('views/env-parts/i18next', async () => ({
  default: await (await import('./ui/boundaries')).createI18n(),
}))
vi.mock('views/utils/selectors', async () => (await import('./ui/boundaries')).poiSelectors)
vi.mock('views/components/etc/window-env', async () => (await import('./ui/boundaries')).windowEnvModule)
vi.mock('views/components/etc/overlay', async () => (await import('./ui/boundaries')).overlay)
vi.mock('views/components/etc/avatar', async () => (await import('./ui/boundaries')).avatarModule)
vi.mock('views/components/etc/icon', async () => (await import('./ui/boundaries')).iconModule)
vi.mock('views/utils/tools', async () => (await import('./ui/boundaries')).toolsModule)
vi.mock('views/utils/ship-img', async () => (await import('./ui/boundaries')).shipImgModule)
vi.mock('wanakana', async () => (await import('./ui/boundaries')).wanakanaModule)
vi.mock('react-fontawesome', async () => (await import('./ui/boundaries')).fontawesomeModule)
vi.mock('redux-observers', async () => (await import('./ui/boundaries')).reduxObserversModule)
vi.mock('electron', async () => (await import('./ui/boundaries')).createElectronModule())
vi.mock('../lib/html2canvas', () => ({ default: () => undefined }))

import { Export } from '../views/sidebar/export'
import { filteredShipIdsAtom, TableView } from '../views/table'
import { mkMstShip, mkShip } from './fixtures'
import { createHarness } from './ui/harness'
import {
  installViewport,
  restoreViewport,
  shipTypes,
  tableState,
  VIEWPORT_HEIGHT,
} from './ui/mocks'

const SHIP_NAMES = ['Alpha', 'Beta', 'Gamma', 'Delta']

// A window larger than the 350px test viewport (10 rows) so the virtualizer
// must render only a slice and the atom, not the DOM, must hold the full list.
const VIRTUAL_SHIP_COUNT = 40
const VIRTUAL_ROW_HEIGHT = 35
const VIRTUAL_TOTAL_HEIGHT = VIRTUAL_SHIP_COUNT * VIRTUAL_ROW_HEIGHT

const virtualShips = Object.fromEntries(
  Array.from({ length: VIRTUAL_SHIP_COUNT }, (_, i) => {
    const id = i + 1
    return [id, mkShip({ api_id: id, api_lv: id })]
  }),
)

const virtualMstShips = Object.fromEntries(
  Array.from({ length: VIRTUAL_SHIP_COUNT }, (_, i) => {
    const id = i + 1
    return [
      id,
      mkMstShip({
        api_id: id,
        api_name: `Ship ${id}`,
        api_sortno: id,
        api_taik: [30, 30],
      }),
    ]
  }),
)

const virtualTableState = () =>
  tableState({
    const: {
      $equips: {},
      $shipgraph: [],
      $ships: virtualMstShips,
      $shipTypes: shipTypes,
    },
    info: { equips: {}, server: { ip: '1.2.3.4' }, ships: virtualShips },
  })

const renderedVirtualNames = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('[role="gridcell"]'))
    .map((el) => el.textContent ?? '')
    .filter((text) => /^Ship \d+$/.test(text))

const renderedNames = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('[role="gridcell"]'))
    .map((el) => el.textContent ?? '')
    .filter((text) => SHIP_NAMES.includes(text))

const renderedHeaderTitles = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('[role="button"]')).map(
    (el) => el.textContent ?? '',
  )

// Exact CSSStyleRule matching: only rules whose selector really targets the
// element are considered, never whole-stylesheet text.
const matchingRules = (el: Element) => {
  const matched: CSSStyleRule[] = []
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList
    try {
      rules = sheet.cssRules
    } catch {
      continue
    }
    for (const rule of Array.from(rules)) {
      if (
        rule instanceof CSSStyleRule &&
        rule.selectorText &&
        !rule.selectorText.includes('::')
      ) {
        try {
          if (el.matches(rule.selectorText)) matched.push(rule)
        } catch {
          /* unsupported selector */
        }
      }
    }
  }
  return matched
}

beforeAll(() => installViewport())
afterAll(() => restoreViewport())
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('TableView integration', () => {
  it('renders every row in selector order and syncs filteredShipIdsAtom', async () => {
    const h = createHarness(tableState())
    const { container } = h.render(<TableView />)

    await screen.findByText('Alpha')

    expect(renderedNames(container)).toEqual(['Gamma', 'Delta', 'Alpha', 'Beta'])
    await waitFor(() =>
      expect(h.jotaiStore.get(filteredShipIdsAtom)).toEqual([3, 4, 1, 2]),
    )
  })

  it('writes sort config on header click and re-sorts from the store', async () => {
    const h = createHarness(tableState())
    const { container } = h.render(<TableView />)
    await screen.findByText('Alpha')

    fireEvent.click(screen.getByText('Level'))
    expect(h.configCalls).toContainEqual(['plugin.ShipInfo.sortOrder', 1])
    expect(h.store.getState().config.plugin.ShipInfo.sortOrder).toBe(1)
    await waitFor(() =>
      expect(renderedNames(container)).toEqual(['Beta', 'Alpha', 'Delta', 'Gamma']),
    )

    fireEvent.click(screen.getByText('ID'))
    expect(h.configCalls).toContainEqual(['plugin.ShipInfo.sortName', 'id'])
    expect(h.store.getState().config.plugin.ShipInfo.sortName).toBe('id')
    await waitFor(() =>
      expect(renderedNames(container)).toEqual(['Alpha', 'Beta', 'Gamma', 'Delta']),
    )
  })

  it('applies inclusive level bounds after a store change', async () => {
    const h = createHarness(tableState())
    const { container } = h.render(<TableView />)
    await screen.findByText('Alpha')

    act(() =>
      h.setConfig('plugin.ShipInfo.filters', { maxLevel: 100, minLevel: 50 }),
    )

    await waitFor(() =>
      expect(renderedNames(container)).toEqual(['Delta', 'Alpha']),
    )
    expect(h.jotaiStore.get(filteredShipIdsAtom)).toEqual([4, 1])
  })

  it('applies ship type selection after a store change', async () => {
    const h = createHarness(tableState())
    const { container } = h.render(<TableView />)
    await screen.findByText('Alpha')

    act(() => h.setConfig('plugin.ShipInfo.shipTypes', 10))

    await waitFor(() => expect(renderedNames(container)).toEqual(['Alpha', 'Beta']))
    expect(h.jotaiStore.get(filteredShipIdsAtom)).toEqual([1, 2])
  })

  it('applies sally area tag selection after a store change', async () => {
    const h = createHarness(tableState())
    const { container } = h.render(<TableView />)
    await screen.findByText('Alpha')

    act(() =>
      h.setConfig('plugin.ShipInfo.sallyAreaChecked', [true, false, true]),
    )

    await waitFor(() =>
      expect(renderedNames(container)).toEqual(['Gamma', 'Delta', 'Alpha']),
    )
    expect(h.jotaiStore.get(filteredShipIdsAtom)).toEqual([3, 4, 1])
  })

  it('renders no rows when the filter matches nothing', async () => {
    const h = createHarness(tableState())
    const { container } = h.render(<TableView />)
    await screen.findByText('Alpha')

    act(() =>
      h.setConfig('plugin.ShipInfo.filters', { maxLevel: 450, minLevel: 200 }),
    )

    await waitFor(() => expect(h.jotaiStore.get(filteredShipIdsAtom)).toEqual([]))
    expect(renderedNames(container)).toEqual([])
  })

  it('re-sorts and updates export IDs when ship data changes', async () => {
    const state = tableState()
    const h = createHarness(state)
    const { container } = h.render(<TableView />)
    await screen.findByText('Alpha')

    // Default level-descending order.
    expect(renderedNames(container)).toEqual(['Gamma', 'Delta', 'Alpha', 'Beta'])
    expect(h.jotaiStore.get(filteredShipIdsAtom)).toEqual([3, 4, 1, 2])

    act(() =>
      h.store.dispatch({
        type: 'TEST/REPLACE',
        state: {
          info: {
            ...state.info,
            ships: {
              ...state.info.ships,
              2: mkShip({
                api_cond: 30,
                api_id: 2,
                api_lv: 450,
                api_sally_area: 1,
              }),
            },
          },
        },
      }),
    )

    await waitFor(() =>
      expect(renderedNames(container)).toEqual([
        'Beta',
        'Gamma',
        'Delta',
        'Alpha',
      ]),
    )
    expect(h.jotaiStore.get(filteredShipIdsAtom)).toEqual([2, 3, 4, 1])
  })

  it('restores every row when the level filter is cleared', async () => {
    const h = createHarness(tableState())
    const { container } = h.render(<TableView />)
    await screen.findByText('Alpha')

    act(() =>
      h.setConfig('plugin.ShipInfo.filters', { maxLevel: 60, minLevel: 0 }),
    )
    await waitFor(() => expect(renderedNames(container)).toEqual(['Alpha', 'Beta']))
    expect(h.jotaiStore.get(filteredShipIdsAtom)).toEqual([1, 2])

    act(() =>
      h.setConfig('plugin.ShipInfo.filters', { maxLevel: 450, minLevel: 0 }),
    )
    await waitFor(() =>
      expect(renderedNames(container)).toEqual(['Gamma', 'Delta', 'Alpha', 'Beta']),
    )
    expect(h.jotaiStore.get(filteredShipIdsAtom)).toEqual([3, 4, 1, 2])
  })

  it('renders the default column order and visibility', async () => {
    const h = createHarness(tableState())
    const { container } = h.render(<TableView />)
    await screen.findByText('Alpha')

    expect(renderedHeaderTitles(container)).toEqual([
      'ID',
      'Name',
      'Class',
      'Speed',
      'Level',
      'Cond',
      'HP',
      'Firepower',
      'Torpedo',
      'AA',
      'Armor',
      'Luck',
      'Evasion',
      'ASW',
      'LOS',
      'Repair',
      'Equipment',
      'Lock',
    ])
  })

  it('applies column order, visibility and pinning changes from the store', async () => {
    const h = createHarness(tableState())
    const { container } = h.render(<TableView />)
    await screen.findByText('Alpha')

    act(() =>
      h.setConfig('plugin.ShipInfo.columnOrder', [
        'rowIndex',
        'name',
        'id',
        'type',
        'soku',
        'lv',
        'cond',
        'hp',
        'karyoku',
        'raisou',
        'taiku',
        'soukou',
        'lucky',
        'kaihi',
        'taisen',
        'sakuteki',
        'repairtime',
        'equipment',
        'lock',
      ]),
    )
    await waitFor(() =>
      expect(renderedHeaderTitles(container).slice(0, 2)).toEqual([
        'Name',
        'ID',
      ]),
    )

    act(() => h.setConfig('plugin.ShipInfo.columnVisibility', { id: false }))
    await waitFor(() =>
      expect(renderedHeaderTitles(container)).not.toContain('ID'),
    )
    expect(renderedHeaderTitles(container)[0]).toBe('Name')

    act(() =>
      h.setConfig('plugin.ShipInfo.columnPinning', {
        left: ['rowIndex', 'name'],
        right: [],
      }),
    )
    await waitFor(() => {
      const headerCell = screen.getByText('Name').parentElement!
      const sticky = matchingRules(headerCell).find(
        (rule) => rule.style.position === 'sticky',
      )
      expect(sticky).toBeTruthy()
      expect(sticky!.style.insetInlineStart).toBe('40px')
    })
  })

  it('maps saved left/right pins to logical start/end offsets in LTR and RTL', async () => {
    const h = createHarness(tableState())
    h.render(<TableView />)
    await screen.findByText('Alpha')

    const pinnedRule = (title: string) =>
      matchingRules(screen.getByText(title).parentElement!).find(
        (rule) => rule.style.position === 'sticky',
      )

    act(() =>
      h.setConfig('plugin.ShipInfo.columnPinning', {
        left: ['rowIndex', 'name'],
        right: ['lock', 'cond'],
      }),
    )

    await waitFor(() => {
      const start = pinnedRule('Name')
      expect(start).toBeTruthy()
      expect(start!.style.insetInlineStart).toBe('40px')
      // The physical side is left to the writing direction.
      expect(start!.style.left).toBe('')

      const end = pinnedRule('Cond')
      expect(end).toBeTruthy()
      expect(end!.style.insetInlineEnd).toBe('0px')
      expect(end!.style.right).toBe('')

      // The next end-pinned column stacks one column width from the edge.
      expect(pinnedRule('Lock')!.style.insetInlineEnd).toBe('40px')
    })

    // Under RTL the emitted logical declarations are unchanged; only the used
    // side changes, which jsdom cannot lay out -- this checks the CSS contract.
    document.documentElement.dir = 'rtl'
    try {
      expect(pinnedRule('Name')!.style.insetInlineStart).toBe('40px')
      expect(pinnedRule('Cond')!.style.insetInlineEnd).toBe('0px')
    } finally {
      document.documentElement.dir = ''
    }
  })

  it('exports the current (filtered) list through the real Export clipboard host', async () => {
    const h = createHarness(tableState())
    h.render(
      <>
        <TableView />
        <Export />
      </>,
    )
    await screen.findByText('Alpha')

    act(() =>
      h.setConfig('plugin.ShipInfo.filters', { maxLevel: 100, minLevel: 50 }),
    )
    await waitFor(() =>
      expect(h.jotaiStore.get(filteredShipIdsAtom)).toEqual([4, 1]),
    )

    fireEvent.click(screen.getByText('Copy to clipboard'))

    expect(clipboard.writeText).toHaveBeenCalledTimes(1)
    const csv = (clipboard.writeText as any).mock.calls[0][0] as string
    const [header, ...rows] = csv.split('\n')
    const nameIndex = header.split(',').indexOf('name')
    expect(rows.map((row) => row.split(',')[nameIndex])).toEqual([
      'Delta',
      'Alpha',
    ])
  })

  it('virtualizes the rendered window without truncating the export ids', async () => {
    const h = createHarness(virtualTableState())
    const { container } = h.render(<TableView />)
    await screen.findByText('Ship 40')

    // Default sort is level descending, so row 0 is Ship 40 (highest level).
    expect(renderedVirtualNames(container)).toContain('Ship 40')
    expect(renderedVirtualNames(container)).not.toContain('Ship 1')

    const scroller = container.querySelector(
      '.ship-info-scrollable',
    ) as HTMLElement
    act(() => {
      scroller.scrollTop = VIRTUAL_TOTAL_HEIGHT - VIEWPORT_HEIGHT
      scroller.dispatchEvent(new Event('scroll'))
    })

    await waitFor(() =>
      expect(renderedVirtualNames(container)).toContain('Ship 1'),
    )
    expect(renderedVirtualNames(container)).not.toContain('Ship 40')

    // The DOM is a slice, but the export atom still holds every sorted id.
    expect(h.jotaiStore.get(filteredShipIdsAtom)).toEqual(
      Array.from(
        { length: VIRTUAL_SHIP_COUNT },
        (_, i) => VIRTUAL_SHIP_COUNT - i,
      ),
    )
  })

  it('highlights the clicked name cell and clears it on toggle or context menu', async () => {
    const h = createHarness(tableState())
    h.render(<TableView />)
    await screen.findByText('Alpha')

    // Column definitions are rebuilt after every selection change, so the
    // cell element is re-created. Always re-query the live name gridcell.
    const nameCell = () =>
      screen.getByText('Alpha').closest('[role="gridcell"]') as HTMLElement
    const isHighlighted = () =>
      matchingRules(nameCell()).some(
        (rule) => rule.style.backgroundColor === 'rgba(138, 155, 168, 0.3)',
      )

    expect(isHighlighted()).toBe(false)

    fireEvent.click(nameCell())
    expect(isHighlighted()).toBe(true)

    fireEvent.click(nameCell())
    expect(isHighlighted()).toBe(false)

    fireEvent.keyDown(nameCell(), { key: ' ' })
    expect(isHighlighted()).toBe(true)

    fireEvent.keyDown(nameCell(), { key: ' ' })
    expect(isHighlighted()).toBe(false)

    fireEvent.keyDown(nameCell(), { key: 'Enter' })
    expect(isHighlighted()).toBe(true)

    fireEvent.contextMenu(nameCell())
    expect(isHighlighted()).toBe(false)
  })
})
