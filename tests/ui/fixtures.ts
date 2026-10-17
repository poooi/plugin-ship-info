import { mkMstShip, mkShip } from '../fixtures'
import type {
  NavyData,
  NavyWorkspace,
} from '../../packages/navy-staff/src/views/workspace/types'

// Pure fixture state factories shared by every UI consumer (jsdom tests,
// Storybook, real Chromium tests). Deliberately free of jsdom geometry and of
// testing-library/vitest so browser consumers can import it directly.
//
// Kept as a literal so this fixture module never imports views/redux (which
// itself pulls in the host selectors) just to read the key.
const PLUGIN_KEY = 'poi-plugin-ship-info'
const NAVY_PLUGIN_KEY = 'poi-plugin-navy-staff'

// ---------------------------------------------------------------------------
// Realistic small fixtures. Levels differ so level sort is observable; types
// 2/3 and sally areas 0/1/2 make type and tag filters observable.
// ---------------------------------------------------------------------------

const mst = (over: Record<string, any>) =>
  mkMstShip({ api_taik: [30, 30], ...over })

const shipDb = {
  item_types: [],
  ships: {},
}

export const tableShips = {
  1: mkShip({ api_cond: 60, api_id: 1, api_lv: 50, api_sally_area: 0 }),
  2: mkShip({ api_cond: 30, api_id: 2, api_lv: 10, api_sally_area: 1 }),
  3: mkShip({ api_cond: 40, api_id: 3, api_lv: 150, api_sally_area: 0 }),
  4: mkShip({ api_cond: 20, api_id: 4, api_lv: 100, api_sally_area: 2 }),
}

export const tableMstShips = {
  1: mst({ api_id: 1, api_name: 'Alpha', api_sortno: 10, api_stype: 2, api_yomi: 'アルファ' }),
  2: mst({ api_id: 2, api_name: 'Beta', api_sortno: 20, api_stype: 2, api_yomi: 'ベータ' }),
  3: mst({ api_id: 3, api_name: 'Gamma', api_sortno: 30, api_stype: 3, api_yomi: 'ガンマ' }),
  4: mst({ api_id: 4, api_name: 'Delta', api_sortno: 40, api_stype: 3, api_yomi: 'デルタ' }),
}

export const shipTypes = {
  1: { api_name: 'DE' },
  2: { api_name: 'DD' },
  3: { api_name: 'CL' },
}

export const tableState = (over: Record<string, any> = {}) => ({
  config: { plugin: { ShipInfo: {} }, poi: { appearance: { avatar: false } } },
  const: {
    $equips: {},
    $shipgraph: [],
    $ships: tableMstShips,
    $shipTypes: shipTypes,
  },
  db: shipDb,
  expedition: [] as number[],
  fcd: {
    shipavatar: { marginMagics: {} },
    shiptag: { color: ['#ff0000', '#00ff00'], mapname: ['E1', 'E2'] },
  },
  fleets: [[], [], [], []],
  info: { equips: {}, server: { ip: '1.2.3.4' }, ships: tableShips },
  repairs: [] as number[],
  [PLUGIN_KEY]: { ready: true },
  ...over,
})

export const plannerShips = {
  1: mkShip({ api_id: 1, api_lv: 50, api_sally_area: 0 }),
  2: mkShip({ api_id: 2, api_lv: 20, api_sally_area: 0 }),
  3: mkShip({ api_id: 3, api_lv: 150, api_sally_area: 0 }),
  4: mkShip({ api_id: 4, api_lv: 100, api_sally_area: 1 }),
  5: mkShip({ api_id: 5, api_lv: 10, api_sally_area: 0 }),
}

export const plannerMstShips = {
  1: mst({ api_id: 1, api_name: 'Alpha', api_sortno: 10, api_stype: 2, api_yomi: 'アルファ' }),
  2: mst({ api_id: 2, api_name: 'Beta', api_sortno: 20, api_stype: 2, api_yomi: 'ベータ' }),
  3: mst({ api_id: 3, api_name: 'Gamma', api_sortno: 30, api_stype: 3, api_yomi: 'ガンマ' }),
  4: mst({ api_id: 4, api_name: 'Delta', api_sortno: 40, api_stype: 3, api_yomi: 'デルタ' }),
  5: mst({ api_id: 5, api_name: 'Epsilon', api_sortno: 50, api_stype: 4, api_yomi: 'イプシロン' }),
}

const AREA_TIME = '2026-01-01T00:00:00.000Z'

export interface NavyFixtureArea {
  id: string
  label: string
  fleetLabels?: Record<string, string>
  color: string
  tagSlot: number
}

export const mkNavyArea = (over: Partial<NavyFixtureArea> = {}) => ({
  capturedAt: AREA_TIME,
  color: '#ff0000',
  fleetLabels: {},
  id: 'area-1',
  label: 'E1',
  tagSlot: 0,
  ...over,
})

/** A v2 workspace. `current` seeds per-area owned IDs positionally. */
export const mkNavyWorkspace = ({
  current = [[3]],
  name = 'Plan',
  areas,
}: {
  current?: number[][]
  name?: string
  areas?: ReturnType<typeof mkNavyArea>[]
} = {}): NavyWorkspace => {
  const resolvedAreas =
    areas ?? [
      mkNavyArea({ id: 'area-1', label: 'E1', color: '#ff0000', tagSlot: 0 }),
      mkNavyArea({ id: 'area-2', label: 'E2', color: '#00ff00', tagSlot: 1 }),
    ]
  const assignments: Record<string, number[]> = {}
  resolvedAreas.forEach((area, index) => {
    assignments[area.id] = [...(current[index] ?? [])]
  })
  return {
    createdAt: AREA_TIME,
    cursor: 0,
    id: 'ws-1',
    revisions: [
      {
        content: { areas: resolvedAreas, assignments, name, ships: {} },
        id: 'rev-1',
        op: { kind: 'initial' },
        time: AREA_TIME,
      },
    ],
  }
}

export const mkNavyData = (
  options: Parameters<typeof mkNavyWorkspace>[0] = {},
): NavyData => {
  const workspace = mkNavyWorkspace(options)
  return {
    legacyArchive: {} as Record<string, unknown>,
    selectedWorkspaceId: workspace.id,
    workspaces: [workspace],
  }
}

export const plannerState = (over: Record<string, any> = {}) => ({
  ...tableState(),
  const: {
    $equips: {},
    $shipgraph: [],
    $ships: plannerMstShips,
    $shipTypes: { ...shipTypes, 4: { api_name: 'CLT' } },
  },
  info: {
    basic: { api_member_id: '123' },
    equips: {},
    server: { ip: '1.2.3.4' },
    ships: plannerShips,
  },
  [NAVY_PLUGIN_KEY]: { account: '123', error: null, navy: mkNavyData(), ready: true },
  ...over,
})
