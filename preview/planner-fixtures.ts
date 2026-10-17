import './bootstrap'

import path from 'path'

import { mkMstShip, mkShip } from '../tests/fixtures'
import { mkNavyArea, mkNavyData, tableState } from '../tests/ui/fixtures'
import { shipTypeLabelKeys } from '../packages/shared/src/ship-types'
import { ACCOUNT_DIR } from '../packages/navy-staff/src/views/account'
import { DATA_PATH as SHIP_INFO_DATA_PATH } from '../packages/ship-info/src/views/plugin-identity'

// Planner / Navy Staff and integrated-shell browser fixtures. Built on the
// shared table fixtures so both plugins describe the same host but with a
// richer, tagged ship roster that makes search, type tabs and the area/grid
// planners observable.

export const SHIP_INFO_PLUGIN_KEY = 'poi-plugin-ship-info'
export const NAVY_PLUGIN_KEY = 'poi-plugin-navy-staff'

/** Absolute paths the plugin persistence lifecycles read/write. */
export const PLUGIN_DATA_PATH = SHIP_INFO_DATA_PATH
/** Account directory and a helper for a specific account file. */
export const NAVY_ACCOUNT_DIR = ACCOUNT_DIR
export const navyAccountFile = (memberId: string) =>
  path.join(ACCOUNT_DIR, `${memberId}.json`)

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
      account: '123',
      error: null,
      navy: mkNavyData({
        areas,
        current: current ?? mapname.map(() => []),
      }),
      ready: true,
    },
  }
  return { ...state, ...extra }
}

// ---------------------------------------------------------------------------
// Dense visual fixture: 300 owned ships across 48 (duplicated) masters with
// varied levels and long localized names, plus ten unevenly assigned areas.
// Used by the integrated visual stories to inspect real density and overflow.
// This fixture is display-only; behavioral fixtures above stay small.
// ---------------------------------------------------------------------------

const DENSE_MASTER_COUNT = 48
const DENSE_SHIP_COUNT = 300

// Recognizable name/type pairs (one entry per master), so the base roster reads
// plausibly: destroyers are DDs, Kaga/Akagi are carriers, Bismarck is a fast
// battleship, submarines are SS, and so on. All eight super-type groups are
// represented. Fictional IDs; no real user data.
const denseMastersSpec: Array<[string, number]> = [
  // DD (2)
  ['Fubuki', 2], ['Shirayuki', 2], ['Hatsuyuki', 2], ['Miyuki', 2],
  ['Murakumo', 2], ['Isonami', 2], ['Shikinami', 2], ['Ayanami', 2],
  // CL (3)
  ['Sendai', 3], ['Jintsuu', 3], ['Naka', 3], ['Kuma', 3],
  // CLT (4) / CT (21)
  ['北上', 4], ['香取', 21], ['鹿島', 21],
  // CA (5) / CAV (6)
  ['Prinz Eugen', 5], ['Atago', 5], ['Takao', 5], ['Maya', 5], ['Haguro', 5],
  ['利根', 6], ['筑摩', 6],
  // CVL (7)
  ['Ryuujou', 7], ['Junyou', 7],
  // FBB (8)
  ['Bismarck', 8], ['Kongou', 8], ['Haruna', 8],
  // BB (9) / BBV (10)
  ['Nagato', 9], ['Mutsu', 9], ['Fuso', 9], ['Yamashiro', 9], ['伊勢', 10],
  // CV (11) / CVB (18)
  ['Kaga', 11], ['Akagi', 11], ['Shoukaku', 11], ['Zuikaku', 11], ['大鳳', 18],
  // SS (13) / SSV (14)
  ['伊号 一八', 13], ['伊号 一九', 13], ['伊号 八', 13], ['伊号 四〇〇', 14],
  // DE (1)
  ['海防艦 占守', 1], ['択捉', 1],
  // Auxiliary: AO(15) AV(16) LHA(17) AR(19) AS(20)
  ['速吸', 15], ['瑞穂', 16], ['あきつ丸', 17], ['明石', 19], ['迅鯨', 20],
]

const denseMasterIdFor = (ownedId: number): number =>
  ((ownedId - 1) % DENSE_MASTER_COUNT) + 1

export const denseMasters: Record<number, any> = {}
denseMastersSpec.forEach(([name, type], index) => {
  const id = index + 1
  denseMasters[id] = mst({
    api_id: id,
    api_name: name,
    api_sortno: id,
    api_stype: type,
    api_yomi: name,
  })
})

// Edge-case masters for long-name layout checks, keeping the same types so
// every grid group stays populated.
export const denseLongNameMasters: Record<number, any> = {
  ...denseMasters,
  1: { ...denseMasters[1], api_name: 'Long-Range Destroyer Escort Prototype Type-A Mk.II' },
  2: { ...denseMasters[2], api_name: 'Fleet Oil Supply Ship Type-XXIV (Extended Designation)' },
  3: { ...denseMasters[3], api_name: '超長名称 試作型 汎用駆逐艦 改二 後期型' },
}

export const denseOwnedShips: Record<number, any> = {}
for (let id = 1; id <= DENSE_SHIP_COUNT; id += 1) {
  denseOwnedShips[id] = owned({
    api_id: id,
    api_lv: ((id * 37) % 180) + 1,
    api_sally_area: 0,
    api_ship_id: denseMasterIdFor(id),
  })
}

export const denseAreaNames = ['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8', 'E9', 'E10']
export const denseAreaColors = [
  '#d64545', '#d67f45', '#c9a227', '#6faa50', '#3f9e8f',
  '#4a7fb5', '#7a68c0', '#b05a9a', '#8a8f98', '#5b6b7a',
]

// Uneven per-area counts (sum 197) so 103 owned ships stay unassigned and the
// grid (which overlays the live roster) still shows all 300.
const denseAreaCounts = [48, 6, 30, 3, 55, 12, 24, 1, 18, 0]

export const denseCurrent: number[][] = (() => {
  const current: number[][] = denseAreaCounts.map(() => [])
  let next = 1
  denseAreaCounts.forEach((count, areaIndex) => {
    for (let i = 0; i < count && next <= DENSE_SHIP_COUNT; i += 1) {
      current[areaIndex].push(next)
      next += 1
    }
  })
  return current
})()

/** The 197 assigned owned ids, in area order. */
export const denseAssignedIds: number[] = denseCurrent.flat()

/**
 * Captured ship records (`NavyShipRecord` shape) for the assigned ships, so a
 * History preview renders the saved snapshot (name/type/level) rather than
 * owned-id placeholders.
 */
export const denseSavedShips: Record<string, any> = {}
for (const id of denseAssignedIds) {
  const masterId = denseMasterIdFor(id)
  const master = denseMasters[masterId]
  denseSavedShips[String(id)] = {
    level: ((id * 37) % 180) + 1,
    masterId,
    name: master.api_name,
    observedAt: '2026-01-01T00:00:00.000Z',
    ownedId: id,
    typeId: master.api_stype,
    typeLabel: shipTypeLabelKeys[master.api_stype] ?? null,
  }
}

/**
 * Full host state for the dense 300-ship visual scenario. `workspaceName`
 * overrides the durable workspace label for long-name layout checks.
 */
export const densePlannerState = (
  over: Partial<PlannerScenarioOptions> = {},
  workspaceName?: string,
) => {
  const state = plannerScenarioState({
    color: denseAreaColors,
    current: denseCurrent,
    mapname: denseAreaNames,
    mstShips: denseMasters,
    ships: denseOwnedShips,
    ...over,
  })
  const content =
    state[NAVY_PLUGIN_KEY].navy.workspaces[0].revisions[0].content
  content.ships = denseSavedShips
  if (workspaceName) content.name = workspaceName
  return state
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

/** Seed an account-scoped Navy file (authoritative when present). */
export const persistedNavyFile = (navy: object, memberId = '123') => ({
  [navyAccountFile(memberId)]: { ...navy, version: 2 },
})

// Re-export the capture adapter surface so capture stories reset and inspect a
// single boundary instead of reaching into adapters directly.
export {
  getCaptureRequests,
  resetCapture,
  setCaptureOutcome,
  type CaptureRequest,
} from './adapters/html2canvas'
