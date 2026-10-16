import './bootstrap'

import { mkMstShip, mkShip } from '../tests/fixtures'
import { tableState } from '../tests/ui/fixtures'
import { DATA_PATH } from '../packages/ship-info/src/views/redux'

// Planner and integrated-shell browser fixtures. Built on the shared table
// fixtures so both suites describe the same host but with a richer, tagged ship
// roster that makes search, type tabs and the area/grid planners observable.
//
// Mirrors the plugin key literally (tests/ui/fixtures.ts does the same) so this
// module never imports views/redux just to read the constant.
export const PLUGIN_KEY = 'poi-plugin-ship-info'

/** Absolute path the plugin persistence lifecycle reads/writes. */
export const PLUGIN_DATA_PATH = DATA_PATH

const mst = (over: Record<string, any>) =>
  mkMstShip({ api_taik: [30, 30], ...over })

const owned = (over: Record<string, any>) =>
  mkShip({
    api_cond: 49,
    api_locked: 0,
    api_lv: 1,
    api_sally_area: 0,
    api_slot: [-1, -1, -1, -1],
    ...over,
  })

// Levels differ so the planner's own -lv/-id sort and level filters are
// observable. Types span DD, CL, CLT, BB, CV and SS so the add-ship type tabs
// and the grid's super-type grouping are meaningful.
export const plannerOwnedShips: Record<number, any> = {
  1: owned({ api_id: 1, api_lv: 50 }),
  2: owned({ api_id: 2, api_lv: 20 }),
  3: owned({ api_id: 3, api_lv: 150 }),
  4: owned({ api_id: 4, api_lv: 100 }),
  5: owned({ api_id: 5, api_lv: 10 }),
  6: owned({ api_id: 6, api_lv: 80 }),
  7: owned({ api_id: 7, api_lv: 90 }),
  8: owned({ api_id: 8, api_lv: 30 }),
}

export const plannerMstShips: Record<number, any> = {
  1: mst({ api_id: 1, api_name: 'Alpha', api_sortno: 10, api_stype: 2, api_yomi: 'アルファ' }),
  2: mst({ api_id: 2, api_name: 'Beta', api_sortno: 20, api_stype: 2, api_yomi: 'ベータ' }),
  3: mst({ api_id: 3, api_name: 'Gamma', api_sortno: 30, api_stype: 3, api_yomi: 'ガンマ' }),
  4: mst({ api_id: 4, api_name: 'Delta', api_sortno: 40, api_stype: 3, api_yomi: 'デルタ' }),
  5: mst({ api_id: 5, api_name: 'Epsilon', api_sortno: 50, api_stype: 4, api_yomi: 'イプシロン' }),
  6: mst({ api_id: 6, api_name: 'Zeta', api_sortno: 60, api_stype: 8, api_yomi: 'ゼータ' }),
  7: mst({ api_id: 7, api_name: 'Eta', api_sortno: 70, api_stype: 11, api_yomi: 'エータ' }),
  8: mst({ api_id: 8, api_name: 'Theta', api_sortno: 80, api_stype: 13, api_yomi: 'シータ' }),
}

// Contiguous stype ids 1..13, matching the real game data shape. The table's
// type filter maps checked bits to `index + 1`, so gaps would silently drop
// higher types even though the roster uses them.
const shipTypes = {
  1: { api_name: 'DE' },
  2: { api_name: 'DD' },
  3: { api_name: 'CL' },
  4: { api_name: 'CLT' },
  5: { api_name: 'CA' },
  6: { api_name: 'CAV' },
  7: { api_name: 'CVL' },
  8: { api_name: 'FBB' },
  9: { api_name: 'BB' },
  10: { api_name: 'BBV' },
  11: { api_name: 'CV' },
  12: { api_name: 'BB' },
  13: { api_name: 'SS' },
}

export const plannerTagColors = ['#ff0000', '#00ff00', '#0000ff']
export const plannerAreaNames = ['E1', 'E2', 'E3']

/** Same roster, but Delta is tagged to E1 and Eta to E2. */
export const plannerTaggedShips: Record<number, any> = {
  ...plannerOwnedShips,
  4: owned({ api_id: 4, api_lv: 100, api_sally_area: 1 }),
  7: owned({ api_id: 7, api_lv: 90, api_sally_area: 2 }),
}

export interface PlannerScenarioOptions {
  color?: string[]
  config?: Record<string, any>
  current?: number[][]
  extra?: Record<string, any>
  mapname?: string[]
  mstShips?: Record<number, any>
  ships?: Record<number, any>
}

/**
 * Full host state for planner/shell stories. `current` defaults to one empty
 * area per map name; pass tagged `ships` to make the planner's tag authority
 * observable.
 */
export const plannerScenarioState = (
  options: PlannerScenarioOptions = {},
) => {
  const {
    color = plannerTagColors,
    config,
    current,
    extra,
    mapname = plannerAreaNames,
    mstShips = plannerMstShips,
    ships = plannerOwnedShips,
  } = options

  const base = tableState()
  const state: Record<string, any> = {
    ...base,
    config: config ?? base.config,
    const: {
      ...base.const,
      $ships: mstShips,
      $shipTypes: shipTypes,
    },
    fcd: {
      ...base.fcd,
      shiptag: { color, mapname },
    },
    info: {
      ...base.info,
      ships,
    },
    [PLUGIN_KEY]: {
      ...base[PLUGIN_KEY],
      planner: {
        archive: {},
        current: current ?? mapname.map(() => []),
      },
    },
  }
  return { ...state, ...extra }
}

/** The plugin's own reducer slice, for asserting planner state. */
export const plannerSlice = (environment: {
  store: { getState: () => any }
}) => environment.store.getState()[PLUGIN_KEY].planner as {
  archive: object
  current: number[][]
}

/** Seed content for the persistence lifecycle, keyed by the plugin data path. */
export const persistedPluginFile = (planner: {
  archive?: object
  current: number[][]
}) => ({
  [PLUGIN_DATA_PATH]: {
    bookmark: {},
    planner: { archive: {}, ...planner },
    ready: true,
    ui: {},
  },
})

// Re-export the capture adapter surface so capture stories reset and inspect a
// single boundary instead of reaching into adapters directly.
export {
  getCaptureRequests,
  resetCapture,
  setCaptureOutcome,
  type CaptureRequest,
} from './adapters/html2canvas'
