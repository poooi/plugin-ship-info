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
    (s.const.$ships || {})[s.info.ships[id]?.api_ship_id ?? -1],
  ],
  shipEquipDataSelectorFactory: (id: number) => (s: any) =>
    s.info.equips[id] || {},
  shipsSelector: (s: any) => s.info.ships,
  stateSelector: (s: any) => s,
}))
vi.mock('wanakana', () => ({ toRomaji: (s: string) => s }))
vi.mock('electron', () => ({ remote: {} }))
vi.mock('redux-observers', () => ({ observer: () => ({}) }))

import {
  levelCeilingSelector,
  levelRangeFilterDetailsSelector,
  levelRangeFilterSelector,
  shipInfoFiltersSelector,
} from '../packages/ship-info/src/views/selectors'

const ship = (level: number) => ({ api_id: level, api_lv: level })

const mkState = ({
  filters,
  levels,
}: {
  filters?: Record<string, unknown>
  levels?: number[]
} = {}): any => ({
  config: {
    plugin: { ShipInfo: { ...(filters ? { filters } : {}) } },
  },
  const: { $equips: {}, $shipgraph: [], $ships: {}, $shipTypes: {} },
  fcd: {},
  fleets: [],
  info: {
    equips: {},
    ships: Object.fromEntries(
      (levels ?? []).map((level, index) => [index + 1, ship(level)]),
    ),
  },
  repairs: [],
})

describe('Ship Info level range selectors', () => {
  it('rounds the highest owned level up to the next multiple of five', () => {
    expect(levelCeilingSelector(mkState({ levels: [1, 173] }))).toBe(175)
    expect(levelCeilingSelector(mkState({ levels: [175] }))).toBe(175)
    expect(levelCeilingSelector(mkState({ levels: [176] }))).toBe(180)
  })

  it('uses zero for an empty roster and ignores missing levels', () => {
    expect(levelCeilingSelector(mkState())).toBe(0)
    const missingLevel = {
      ...mkState(),
      info: { equips: {}, ships: { 1: { api_id: 1 } } },
    }
    expect(levelCeilingSelector(missingLevel)).toBe(0)
  })

  it('resolves an absent upper bound to the roster ceiling', () => {
    expect(levelRangeFilterSelector(mkState({ levels: [173] }))).toEqual([
      0, 175,
    ])
    expect(levelRangeFilterDetailsSelector(mkState({ levels: [173] }))).toEqual(
      {
        ceiling: 175,
        explicitMax: false,
        maxLevel: 175,
        minLevel: 0,
      },
    )
  })

  it('keeps an explicit maximum below the ceiling', () => {
    const state = mkState({ filters: { maxLevel: 100, minLevel: 20 }, levels: [173] })
    expect(levelRangeFilterDetailsSelector(state)).toEqual({
      ceiling: 175,
      explicitMax: true,
      maxLevel: 100,
      minLevel: 20,
    })
  })

  it('reads the legacy unrestricted maximum as absent', () => {
    const state = mkState({
      filters: { maxLevel: 450, minLevel: 80 },
      levels: [173],
    })
    expect(levelRangeFilterDetailsSelector(state)).toEqual({
      ceiling: 175,
      explicitMax: false,
      maxLevel: 175,
      minLevel: 80,
    })
  })

  it('follows roster growth when only the lower bound is stored', () => {
    const state = mkState({ filters: { minLevel: 100 }, levels: [173] })
    expect(levelRangeFilterDetailsSelector(state).maxLevel).toBe(175)

    const grown = {
      ...state,
      info: {
        ...state.info,
        ships: { 1: ship(173), 2: ship(176) },
      },
    }
    expect(levelRangeFilterDetailsSelector(grown).maxLevel).toBe(180)

    // An unrelated filter change must not freeze the resolved ceiling.
    const unrelatedFilter = {
      ...grown,
      config: {
        plugin: {
          ShipInfo: {
            filters: { minLevel: 100 },
            shipTypes: 6,
          },
        },
      },
    }
    expect(levelRangeFilterDetailsSelector(unrelatedFilter).maxLevel).toBe(180)
  })

  it('keeps an explicit maximum fixed when the roster grows', () => {
    const state = mkState({
      filters: { maxLevel: 100, minLevel: 20 },
      levels: [173],
    })
    const grown = {
      ...state,
      info: {
        ...state.info,
        ships: { 1: ship(173), 2: ship(200) },
      },
    }
    expect(levelRangeFilterDetailsSelector(grown).maxLevel).toBe(100)
  })

  it('preserves an out-of-roster lower bound as a filter predicate', () => {
    const state = mkState({ filters: { minLevel: 200 }, levels: [150] })
    expect(shipInfoFiltersSelector(state)).toEqual({
      maxLevel: 150,
      minLevel: 200,
    })
  })

  it('returns a safe zero ceiling for an empty roster', () => {
    const details = levelRangeFilterDetailsSelector(mkState())
    expect(details).toEqual({
      ceiling: 0,
      explicitMax: false,
      maxLevel: 0,
      minLevel: 0,
    })
    expect(Number.isFinite(details.maxLevel)).toBe(true)
  })
})
