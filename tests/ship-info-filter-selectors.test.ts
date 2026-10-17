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
  wctfSelector: (s: any) => s.db,
}))
vi.mock('wanakana', () => ({ toRomaji: (s: string) => s }))
vi.mock('electron', () => ({ remote: {} }))
vi.mock('redux-observers', () => ({ observer: () => ({}) }))

import {
  sallyAreaFilterViewSelector,
  shipTypeFilterViewSelector,
} from '../packages/ship-info/src/views/selectors'

const mkState = (): any => ({
  config: {
    plugin: { ShipInfo: { shipTypes: 0, sallyAreaChecked: [true, true, true] } },
  },
  const: {
    $shipTypes: {
      1: { api_id: 1, api_name: 'DE' },
      2: { api_id: 2, api_name: 'DD' },
    },
    $ships: {},
    $equips: {},
    $shipgraph: [],
  },
  fcd: {
    shiptag: {
      color: ['#111111', '#222222'],
      fleetname: {
        'en-US': ['Fleet A', 'Fleet B'],
        'ja-JP': ['第1艦隊', '第2艦隊'],
      },
      mapname: ['E1', 'E2'],
    },
  },
  info: { equips: {}, ships: {} },
  repairs: [],
})

describe('Ship Info filter view selectors', () => {
  it('returns a stable ship-type view for unrelated updates', () => {
    const state = mkState()
    const first = shipTypeFilterViewSelector(state)
    expect(shipTypeFilterViewSelector(state)).toBe(first)
    expect(first.checkedAll).toBe(true)

    const unrelated = { ...state, repairs: [1] }
    expect(shipTypeFilterViewSelector(unrelated)).toBe(first)
  })

  it('updates the ship-type view when master types or the filter change', () => {
    const state = mkState()
    const first = shipTypeFilterViewSelector(state)

    const moreTypes = {
      ...state,
      const: {
        ...state.const,
        $shipTypes: { ...state.const.$shipTypes, 3: { api_id: 3, api_name: 'CL' } },
      },
    }
    const grown = shipTypeFilterViewSelector(moreTypes)
    expect(grown).not.toBe(first)
    expect(grown.checked).toHaveLength(3)

    const typesFilter = 6 // binary 110: type 1 on, type 2 off
    const filtered = {
      ...state,
      config: { plugin: { ShipInfo: { ...state.config.plugin.ShipInfo, shipTypes: typesFilter } } },
    }
    const filteredView = shipTypeFilterViewSelector(filtered)
    expect(filteredView).not.toBe(first)
    expect(filteredView.checked).toEqual([true, false])
    expect(filteredView.checkedAll).toBe(false)
  })

  it('returns a stable sally-area view for unrelated updates', () => {
    const state = mkState()
    const first = sallyAreaFilterViewSelector(state, 'en-US')
    expect(first.mapname).toEqual(['E1', 'E2'])
    expect(first.checked).toHaveLength(3)

    const unrelated = { ...state, repairs: [1] }
    expect(sallyAreaFilterViewSelector(unrelated, 'en-US')).toBe(first)
  })

  it('updates the sally-area view for tag, master-tag, language and mode changes', () => {
    const state = mkState()
    const first = sallyAreaFilterViewSelector(state, 'en-US')

    const newTag = {
      ...state,
      fcd: { shiptag: { ...state.fcd.shiptag, mapname: ['E1', 'E2', 'E3'] } },
    }
    const grown = sallyAreaFilterViewSelector(newTag, 'en-US')
    expect(grown).not.toBe(first)
    expect(grown.checked).toHaveLength(4)

    const newColor = {
      ...state,
      fcd: { shiptag: { ...state.fcd.shiptag, color: ['#333333', '#444444'] } },
    }
    expect(sallyAreaFilterViewSelector(newColor, 'en-US').color).toEqual([
      '#333333',
      '#444444',
    ])

    const fleetName = {
      ...state,
      config: {
        plugin: { ShipInfo: { ...state.config.plugin.ShipInfo, displayFleetName: true } },
      },
    }
    const english = sallyAreaFilterViewSelector(fleetName, 'en-US')
    expect(english.mapname).toEqual(['Fleet A', 'Fleet B'])
    expect(sallyAreaFilterViewSelector(fleetName, 'en-US')).toBe(english)

    // Same Redux state identity, changed language: the selector must still
    // refresh instead of returning the cached English result.
    const japanese = sallyAreaFilterViewSelector(fleetName, 'ja-JP')
    expect(japanese).not.toBe(english)
    expect(japanese.mapname).toEqual(['第1艦隊', '第2艦隊'])
  })
})
