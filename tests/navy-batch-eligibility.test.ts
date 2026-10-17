// Thunk-level eligibility for the ship-list batch. The reducer applies whatever
// it is given; these tests pin the boundary that decides which ships may enter a
// batch: an unassigned ship needs a live record (unavailable roster => skipped),
// while an already-assigned ship can be moved without one but is still enriched
// with its live record when that record is available.
import { applyMiddleware, legacy_createStore } from 'redux'
import { thunk } from 'redux-thunk'
import { describe, expect, it, vi } from 'vitest'

vi.mock('views/utils/selectors', () => ({
  constSelector: (state: any) => state?.const ?? {},
  extensionSelectorFactory: (key: string) => (state: any) =>
    state?.ext?.[key]?._ ?? {},
  fcdSelector: () => ({}),
  fleetShipsIdSelectorFactory: () => () => [],
  shipDataSelectorFactory: () => () => undefined,
  shipsSelector: (state: any) => state?.info?.ships ?? {},
}))
vi.mock('wanakana', () => ({ toRomaji: (value: string) => value }))

import { PLUGIN_KEY } from '../packages/navy-staff/src/views/plugin-identity'
import { reducer as pluginReducer } from '../packages/navy-staff/src/views/redux'
import { applyShipBatch } from '../packages/navy-staff/src/views/workspace/actions'
import type { NavyWorkspaceContent } from '../packages/navy-staff/src/views/workspace/types'

const NOW = '2026-01-01T00:00:00.000Z'

const area = (id: string, tagSlot = 0) => ({
  capturedAt: NOW,
  color: '#ffffff',
  fleetLabels: {},
  id,
  label: id,
  tagSlot,
})

const record = (ownedId: number) => ({
  level: 1,
  masterId: ownedId,
  name: `S${ownedId}`,
  observedAt: NOW,
  ownedId,
  typeId: 2,
  typeLabel: 'DD',
})

const liveShip = (ownedId: number, masterId: number, level: number) => ({
  api_exp: [0, 0],
  api_id: ownedId,
  api_lv: level,
  api_sally_area: 0,
  api_ship_id: masterId,
})

const master = (id: number, name: string) => ({
  api_id: id,
  api_name: name,
  api_stype: 2,
  api_yomi: 'x',
})

const workspace = (
  assignments: Record<string, number[]>,
  ships: Record<string, unknown> = {},
) => ({
  createdAt: NOW,
  cursor: 0,
  id: 'ws-1',
  revisions: [
    {
      content: {
        areas: [area('area-1', 0), area('area-2', 1)],
        assignments,
        name: 'Plan',
        ships,
      } as NavyWorkspaceContent,
      id: 'rev-1',
      op: { kind: 'initial' },
      time: NOW,
    },
  ],
})

const navy = (
  assignments: Record<string, number[]>,
  ships: Record<string, unknown> = {},
) => ({
  legacyArchive: {},
  selectedWorkspaceId: 'ws-1',
  workspaces: [workspace(assignments, ships)],
})

const hostInfo = (ships: Record<string, unknown> = {}) => ({
  basic: { api_member_id: '123' },
  ships,
})

const makeStore = (
  navyData: ReturnType<typeof navy>,
  info: ReturnType<typeof hostInfo> = hostInfo(),
  constData: Record<string, unknown> = {},
) => {
  const slice = { account: '123', error: null, navy: navyData, ready: true }
  return legacy_createStore(
    (
      state: any = { const: constData, ext: { [PLUGIN_KEY]: { _: slice } }, info },
      action: any,
    ) => {
      const current = state.ext[PLUGIN_KEY]._
      const next = pluginReducer(current, action)
      return next === current
        ? state
        : { ...state, ext: { ...state.ext, [PLUGIN_KEY]: { _: next } } }
    },
    applyMiddleware(thunk),
  )
}

const contentOf = (store: { getState: () => any }): NavyWorkspaceContent => {
  const navyState = store.getState().ext[PLUGIN_KEY]._.navy
  const ws = navyState.workspaces[0]
  return ws.revisions[ws.cursor].content
}
const revisionsOf = (store: { getState: () => any }) =>
  store.getState().ext[PLUGIN_KEY]._.navy.workspaces[0].revisions.length

describe('applyShipBatch eligibility', () => {
  it('skips an unassigned cached ship when the live roster is unavailable', () => {
    const store = makeStore(
      navy({ 'area-1': [], 'area-2': [] }, { '77': record(77) }),
    )
    const before = store.getState()

    store.dispatch(applyShipBatch({ shipIds: [77], target: 'area-1' }))

    expect(store.getState()).toBe(before)
    expect(contentOf(store).assignments['area-1']).toEqual([])
  })

  it('moves a retained assigned ship without a live record', () => {
    const store = makeStore(navy({ 'area-1': [10], 'area-2': [] }, { '10': record(10) }))
    const revisionsBefore = revisionsOf(store)

    store.dispatch(applyShipBatch({ shipIds: [10], target: 'area-2' }))

    const content = contentOf(store)
    expect(content.assignments['area-1']).toEqual([])
    expect(content.assignments['area-2']).toEqual([10])
    expect(revisionsOf(store)).toBe(revisionsBefore + 1)
    // The captured record rides along unchanged; no new record is required.
    expect(content.ships['10']).toEqual(record(10))
  })

  it('enriches a moved ship with its live record when the roster is available', () => {
    const store = makeStore(
      navy({ 'area-1': [10], 'area-2': [] }, { '10': record(10) }),
      hostInfo({ '10': liveShip(10, 5, 50) }),
      { $ships: { '5': master(5, 'Live10') } },
    )

    store.dispatch(applyShipBatch({ shipIds: [10], target: 'area-2' }))

    const content = contentOf(store)
    expect(content.assignments['area-2']).toEqual([10])
    // The live level/name replaces the stale captured Lv.1 record.
    expect(content.ships['10']).toMatchObject({ level: 50, masterId: 5, name: 'Live10' })
  })

  it('does not enrich or append for a same-area no-op', () => {
    const store = makeStore(
      navy({ 'area-1': [10], 'area-2': [] }, { '10': record(10) }),
      hostInfo({ '10': liveShip(10, 5, 50) }),
      { $ships: { '5': master(5, 'Live10') } },
    )
    const before = store.getState()
    store.dispatch(applyShipBatch({ shipIds: [10], target: 'area-1' }))
    expect(store.getState()).toBe(before)
    expect(contentOf(store).ships['10']).toEqual(record(10))
  })

  it('appends nothing when no listed ship is eligible', () => {
    const store = makeStore(navy({ 'area-1': [], 'area-2': [] }))
    const before = store.getState()
    store.dispatch(applyShipBatch({ shipIds: [1, 2], target: null }))
    expect(store.getState()).toBe(before)
  })
})
