import './bootstrap'

import { mkMstShip, mkShip } from '../tests/fixtures'
import { mkNavyArea, mkNavyData, tableState } from '../tests/ui/fixtures'
import { DATA_PATH as NAVY_DATA_PATH } from '../packages/navy-staff/src/views/plugin-identity'
import { DATA_PATH as SHIP_INFO_DATA_PATH } from '../packages/ship-info/src/views/plugin-identity'

// Planner / Navy Staff and integrated-shell browser fixtures. Built on the
// shared table fixtures so both plugins describe the same host but with a
// richer, tagged ship roster that makes search, type tabs and the area/grid
// planners observable.

export const SHIP_INFO_PLUGIN_KEY = 'poi-plugin-ship-info'
export const NAVY_PLUGIN_KEY = 'poi-plugin-navy-staff'

/** Absolute paths the plugin persistence lifecycles read/write. */
export const PLUGIN_DATA_PATH = SHIP_INFO_DATA_PATH
export const NAVY_PLUGIN_DATA_PATH = NAVY_DATA_PATH

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
  ownerMemberId?: string | null
  ships?: Record<number, any>
}

/**
 * Full host state for planner/shell stories. `current` seeds per-area owned IDs
 * positionally into a v2 workspace. Both plugin slices are seeded with
 * `ready: true` so component stories can render without running a lifecycle.
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
    ownerMemberId = '123',
    ships = plannerOwnedShips,
  } = options

  const base = tableState()
  const areas = mapname.map((label, index) =>
    mkNavyArea({
      color: color[index] ?? '#ff0000',
      id: `area-${index + 1}`,
      label,
      tagSlot: index,
    }),
  )
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
      basic: { api_member_id: '123' },
      ships,
    },
    [SHIP_INFO_PLUGIN_KEY]: {
      bookmark: {},
      error: null,
      ready: true,
      ui: {},
    },
    [NAVY_PLUGIN_KEY]: {
      error: null,
      navy: mkNavyData({
        areas,
        current: current ?? mapname.map(() => []),
        ownerMemberId,
      }),
      ready: true,
    },
  }
  return { ...state, ...extra }
}

/** The Navy Staff v2 durable root, for asserting workspace state. */
export const plannerSlice = (environment: {
  store: { getState: () => any }
}) => environment.store.getState()[NAVY_PLUGIN_KEY].navy as {
  selectedWorkspaceId: string
  workspaces: any[]
  legacyArchive: Record<string, unknown>
}

/** All owned ship IDs across the selected workspace's areas. */
export const assignedShipIds = (environment: {
  store: { getState: () => any }
}): number[] => {
  const navy = plannerSlice(environment)
  const workspace = navy.workspaces.find((w) => w.id === navy.selectedWorkspaceId)
  const content = workspace.revisions[workspace.cursor].content
  return Object.values(content.assignments).flat() as number[]
}

/** Seed the Ship Info file (legacy planner source) for migration stories. */
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

/** Seed the Navy Staff file (authoritative when present). */
export const persistedNavyFile = (planner: {
  archive?: object
  current: number[][]
}) => ({
  [NAVY_PLUGIN_DATA_PATH]: {
    planner: { archive: {}, ...planner },
    ready: true,
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
