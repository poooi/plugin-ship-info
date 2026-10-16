import { describe, expect, it, vi } from 'vitest'

vi.mock('views/env-parts/i18next', () => ({
  default: { getFixedT: () => (key: string) => key },
}))
vi.mock('views/utils/selectors', () => ({
  configSelector: (s: any) => s.config,
  constSelector: (s: any) => s.const,
  extensionSelectorFactory: (key: string) => (s: any) => s[key],
  fcdSelector: (s: any) => s.fcd,
  fleetInExpeditionSelectorFactory: (id: number) => (s: any) =>
    (s.expedition || []).includes(id),
  fleetShipsIdSelectorFactory: (id: number) => (s: any) =>
    (s.fleets || [])[id] || [],
  inRepairShipsIdSelector: (s: any) => s.repairs || [],
  shipDataSelectorFactory: (id: number) => (s: any) => [
    s.info.ships[id],
    s.const.$ships[id],
  ],
  shipEquipDataSelectorFactory: (id: number) => (s: any) =>
    s.info.equips[id] || {},
  shipsSelector: (s: any) => s.info.ships,
  stateSelector: (s: any) => s,
  wctfSelector: (s: any) => s.db,
}))
vi.mock('wanakana', () => ({ toRomaji: (s: string) => s }))
vi.mock('electron', () => ({ remote: {} }))
vi.mock('redux-observers', () => ({ observer: () => ({}) }))
vi.mock('../lib/html2canvas', () => ({ default: () => undefined }))

import { mkDb, mkMstShip, mkShip } from './fixtures'
import { PLUGIN_KEY } from '../views/redux'
import {
  columnOrderSelector,
  columnPinningSelector,
  columnVisibilitySelector,
  deckPlannerAllShipIdsSelector,
  deckPlannerAreaSelectorFactory,
  deckPlannerCurrentSelector,
  deckPlannerShipMapSelector,
  filterShipIdsSelector,
  shipFleetIdMapSelector,
  shipFleetIdSelectorFactory,
} from '../views/selectors'

const mkState = (): any => ({
  config: { plugin: { ShipInfo: {} } },
  const: {
    $shipgraph: [],
    $ships: {
      1: mkMstShip({ api_aftershipid: '2', api_id: 1, api_name: 'Alpha', api_sortno: 10, api_stype: 2 }),
      2: mkMstShip({ api_aftershipid: '0', api_id: 2, api_name: 'Beta', api_sortno: 20, api_stype: 2 }),
      3: mkMstShip({ api_aftershipid: '0', api_id: 3, api_name: 'Gamma', api_sortno: 5, api_stype: 3 }),
    },
    $shipTypes: {
      1: { api_name: 'DE' },
      2: { api_name: 'DD' },
      3: { api_name: 'CL' },
    },
  },
  db: mkDb(),
  expedition: [] as number[],
  fcd: { shipavatar: { marginMagics: {} }, shiptag: { mapname: ['E1', 'E2'] } },
  fleets: [[1, 2], [], [], []],
  info: {
    equips: {},
    ships: {
      1: mkShip({
        api_cond: 60,
        api_id: 1,
        api_karyoku: [10, 10],
        api_locked: 1,
        api_lv: 50,
        api_raisou: [10, 10],
        api_sally_area: 0,
        api_soukou: [10, 10],
        api_taiku: [10, 10],
      }),
      2: mkShip({
        api_cond: 30,
        api_id: 2,
        api_karyoku: [10, 999],
        api_raisou: [10, 999],
        api_sally_area: 1,
        api_soukou: [10, 999],
        api_taiku: [10, 999],
        api_lv: 10,
      }),
      3: mkShip({
        api_cond: 10,
        api_id: 3,
        api_karyoku: [10, 10],
        api_locked: 1,
        api_lv: 150,
        api_raisou: [10, 10],
        api_sally_area: 0,
        api_soukou: [10, 10],
        api_taiku: [10, 10],
      }),
    },
  },
  repairs: [] as number[],
  [PLUGIN_KEY]: {
    planner: { archive: {}, current: [[1, 2], [3]] },
    ready: true,
  },
})

const withShipInfo = (state: any, shipInfo: any) => ({
  ...state,
  config: { plugin: { ShipInfo: shipInfo } },
})

describe('planner selectors', () => {
  it('reads current, per-area and flat ship ids', () => {
    const state = mkState()
    expect(deckPlannerCurrentSelector(state)).toEqual([[1, 2], [3]])
    expect(deckPlannerAreaSelectorFactory(0)(state)).toEqual([1, 2])
    expect(deckPlannerAreaSelectorFactory(1)(state)).toEqual([3])
    expect(deckPlannerAreaSelectorFactory(9)(state)).toEqual([])
    expect(deckPlannerAllShipIdsSelector(state)).toEqual([1, 2, 3])
    expect(deckPlannerShipMapSelector(state)).toEqual({ 1: 0, 2: 0, 3: 1 })
  })
})

describe('fleet mapping selectors', () => {
  it('maps each owned ship to its fleet index or -1', () => {
    const state = mkState()
    expect(shipFleetIdMapSelector(state)).toEqual({ 1: 0, 2: 0, 3: -1 })
    expect(shipFleetIdSelectorFactory(1)(state)).toBe(0)
    expect(shipFleetIdSelectorFactory(3)(state)).toBe(-1)
  })

  it('reflects fleet changes in the mapping', () => {
    const state = mkState()
    const moved = { ...state, fleets: [[], [3], [], []] }
    expect(shipFleetIdMapSelector(moved)).toEqual({ 1: -1, 2: -1, 3: 1 })
  })
})

describe('filterShipIdsSelector', () => {
  it('passes every ship under default config, sorted by level desc', () => {
    expect(filterShipIdsSelector(mkState())).toEqual([3, 1, 2])
  })

  it('applies inclusive level bounds', () => {
    const state = withShipInfo(mkState(), {
      filters: { maxLevel: 50, minLevel: 10 },
    })
    expect(filterShipIdsSelector(state)).toEqual([1, 2])
  })

  it('filters by ship type bitmask', () => {
    const state = withShipInfo(mkState(), { shipTypes: 10 })
    expect(filterShipIdsSelector(state)).toEqual([1, 2])
  })

  it('filters by locked flag', () => {
    const state = withShipInfo(mkState(), { locked: [true, false] })
    expect(filterShipIdsSelector(state)).toEqual([3, 1])
  })

  it('filters by fleet membership', () => {
    const state = withShipInfo(mkState(), { inFleet: [true, false] })
    expect(filterShipIdsSelector(state)).toEqual([1, 2])
  })

  it('filters by modernization completion', () => {
    const state = withShipInfo(mkState(), { modernization: [true, false] })
    expect(filterShipIdsSelector(state)).toEqual([3, 1])
  })

  it('filters by sally area tag', () => {
    const state = withShipInfo(mkState(), {
      sallyAreaChecked: [true, false, false],
    })
    expect(filterShipIdsSelector(state)).toEqual([3, 1])
  })

  it('produces different results when the input config changes', () => {
    const base = mkState()
    const filtered = withShipInfo(mkState(), { locked: [true, false] })
    expect(filterShipIdsSelector(base)).not.toEqual(
      filterShipIdsSelector(filtered),
    )
  })
})

describe('column configuration selectors', () => {
  it('falls back to the default order when config is missing or invalid', () => {
    const fallback = columnOrderSelector(mkState())
    expect(fallback[0]).toBe('rowIndex')
    expect(fallback).toContain('equipment')

    expect(columnOrderSelector(withShipInfo(mkState(), { columnOrder: 'bad' }))).toEqual(
      fallback,
    )
  })

  it('returns a valid custom column order', () => {
    const custom = ['rowIndex', 'name', 'id']
    expect(
      columnOrderSelector(withShipInfo(mkState(), { columnOrder: custom })),
    ).toEqual(custom)
  })

  it('returns visibility, falling back on invalid values', () => {
    expect(columnVisibilitySelector(mkState())).toEqual({})
    expect(
      columnVisibilitySelector(
        withShipInfo(mkState(), { columnVisibility: { id: false } }),
      ),
    ).toEqual({ id: false })
    expect(
      columnVisibilitySelector(
        withShipInfo(mkState(), { columnVisibility: 'bad' }),
      ),
    ).toEqual({})
  })

  it('always pins rowIndex to the left', () => {
    expect(columnPinningSelector(mkState())).toEqual({
      left: ['rowIndex'],
      right: [],
    })
    expect(
      columnPinningSelector(
        withShipInfo(mkState(), {
          columnPinning: { left: ['id'], right: ['lock'] },
        }),
      ),
    ).toEqual({ left: ['rowIndex', 'id'], right: ['lock'] })
  })
})
