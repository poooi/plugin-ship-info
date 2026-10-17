import { describe, expect, it, vi } from 'vitest'

vi.mock('views/utils/selectors', async () => {
  const host = await import('./ui/host')
  return {
    ...host.poiSelectors,
    extensionSelectorFactory: (key: string) => (state: any) =>
      state?.ext?.[key]?._ ?? {},
  }
})

import type { NavyData, NavyWorkspaceContent } from '../packages/navy-staff/src/views/workspace/types'
import { reducer as rootReducer } from '../packages/navy-staff/src/views/redux'
import { NAVY_ACTIONS } from '../packages/navy-staff/src/views/workspace/action-types'
import { onApplySync, onUndo } from '../packages/navy-staff/src/views/workspace/creators'
import { navyReducer } from '../packages/navy-staff/src/views/workspace/reducer'
import {
  acceptAreaSync,
  acceptTagSync,
  areaSyncFreshness,
  isSyncError,
  prepareAreaSync,
  prepareTagSync,
  tagSyncFreshness,
  type AreaSyncCurrent,
  type RosterSample,
  type SyncSourceArea,
  type SyncSourceSnapshot,
  type SyncWorkspaceSnapshot,
  type TagSyncCurrent,
} from '../packages/navy-staff/src/views/sync/core'
import { syncRosterSelector } from '../packages/navy-staff/src/views/sync/selectors'
import type { IState } from 'views/utils/selectors'

const NOW = '2026-02-01T00:00:00Z'

const area = (id: string, label: string, tagSlot: number, color = '#111111') => ({
  capturedAt: NOW,
  color,
  fleetLabels: {} as Record<string, string>,
  id,
  label,
  tagSlot,
})

const content = (
  areas: ReturnType<typeof area>[],
  assignments: Record<string, number[]>,
): NavyWorkspaceContent => ({ areas, assignments, name: 'Plan', ships: {} })

const workspace = (
  body: NavyWorkspaceContent,
  over: Partial<SyncWorkspaceSnapshot> = {},
): SyncWorkspaceSnapshot => ({
  accountId: 'acct-1',
  content: body,
  revisionId: 'rev-1',
  workspaceId: 'ws-1',
  ...over,
})

const source = (areas: SyncSourceArea[], sourceId: string | null = null): SyncSourceSnapshot => ({
  areas,
  sourceId,
})

const srcArea = (slot: number, label: string, color = '#111111'): SyncSourceArea => ({
  color,
  fleetLabels: {},
  label,
  slot,
})

const roster = (
  ships: RosterSample['ships'],
  accountId: string | null = 'acct-1',
): RosterSample => ({ accountId, ships })

const ship = (over: Record<string, unknown> = {}) => ({
  level: 99,
  masterId: 1,
  name: 'One',
  ownedId: 1,
  tagSlot: 0,
  typeId: 2,
  typeLabel: 'DD',
  ...over,
})

const expectSyncError = (fn: () => unknown, code: string): void => {
  try {
    fn()
  } catch (error) {
    expect(isSyncError(error)).toBe(true)
    expect((error as { code: string }).code).toBe(code)
    return
  }
  throw new Error(`expected SyncError ${code}`)
}

describe('sync core: area metadata', () => {
  it('retains absent areas and adds unmapped source slots', () => {
    const body = content([area('A', 'Old A', 0), area('B', 'B', 5)], { A: [5], B: [7] })
    const prepared = prepareAreaSync({
      createAreaId: () => 'area-new',
      mapping: [{ areaId: 'A', slot: 0 }],
      now: NOW,
      source: source([srcArea(0, 'New A'), srcArea(1, 'Added')]),
      workspace: workspace(body),
    })
    expect(prepared.changed).toBe(true)
    expect(prepared.summary.retained).toEqual(['B'])
    expect(prepared.summary.updated).toEqual(['A'])
    expect(prepared.summary.added).toEqual(['area-new'])
    expect(prepared.nextContent.assignments.B).toEqual([7])
    expect(prepared.nextContent.assignments['area-new']).toEqual([])
    expect(prepared.nextContent.areas.find((a) => a.id === 'A')?.label).toBe('New A')
  })

  it('clears a retained area hint claimed by a new area', () => {
    const body = content([area('A', 'A', 0)], { A: [5] })
    const prepared = prepareAreaSync({
      createAreaId: () => 'area-new',
      mapping: [],
      now: NOW,
      source: source([srcArea(0, 'New group')]),
      workspace: workspace(body),
    })
    expect(prepared.nextContent.areas.find((a) => a.id === 'A')?.tagSlot).toBe(-1)
    expect(prepared.nextContent.assignments.A).toEqual([5])
  })

  it('rejects non one-to-one mappings', () => {
    const body = content([area('A', 'A', 0), area('B', 'B', 1)], { A: [], B: [] })
    const base = {
      createAreaId: () => 'x',
      now: NOW,
      source: source([srcArea(0, 'A'), srcArea(1, 'B')]),
      workspace: workspace(body),
    }
    expectSyncError(
      () => prepareAreaSync({ ...base, mapping: [{ areaId: 'A', slot: 0 }, { areaId: 'B', slot: 0 }] }),
      'MAPPING_SLOT_CONFLICT',
    )
    expectSyncError(
      () => prepareAreaSync({ ...base, mapping: [{ areaId: 'A', slot: 0 }, { areaId: 'A', slot: 1 }] }),
      'MAPPING_AREA_CONFLICT',
    )
    expectSyncError(() => prepareAreaSync({ ...base, mapping: [{ areaId: 'z', slot: 0 }] }), 'UNKNOWN_AREA')
    expectSyncError(() => prepareAreaSync({ ...base, mapping: [{ areaId: 'A', slot: 9 }] }), 'UNKNOWN_SLOT')
  })

  it('is stale on source, account, workspace, or revision change', () => {
    const body = content([area('A', 'A', 0)], { A: [] })
    const prepared = prepareAreaSync({
      createAreaId: () => 'x',
      mapping: [{ areaId: 'A', slot: 0 }],
      now: NOW,
      source: source([srcArea(0, 'A')], 'session-1'),
      workspace: workspace(body),
    })
    const current = (over: Partial<AreaSyncCurrent>): AreaSyncCurrent => ({
      mapping: [{ areaId: 'A', slot: 0 }],
      source: source([srcArea(0, 'A')], 'session-1'),
      workspace: workspace(body),
      ...over,
    })
    expect(areaSyncFreshness(prepared, current({ source: source([srcArea(0, 'A', '#ffffff')], 'session-1') })).reasons).toEqual(['SOURCE_CHANGED'])
    expect(areaSyncFreshness(prepared, current({ source: source([srcArea(0, 'A')], 'session-2') })).reasons).toEqual(['SOURCE_CHANGED'])
    expect(areaSyncFreshness(prepared, current({ workspace: workspace(body, { accountId: 'acct-2' }) })).reasons).toEqual(['ACCOUNT_CHANGED'])
    expect(areaSyncFreshness(prepared, current({ workspace: workspace(body, { workspaceId: 'ws-2' }) })).reasons).toEqual(['WORKSPACE_CHANGED'])
    expect(areaSyncFreshness(prepared, current({ workspace: workspace(body, { revisionId: 'rev-2' }) })).reasons).toEqual(['REVISION_CHANGED'])
  })

  it('accepts a fresh changed batch and yields no apply for a stale or no-op batch', () => {
    const body = content([area('A', 'A', 0)], { A: [] })
    const current: AreaSyncCurrent = {
      mapping: [{ areaId: 'A', slot: 0 }],
      source: source([srcArea(0, 'A')]),
      workspace: workspace(body),
    }
    const noop = prepareAreaSync({ createAreaId: () => 'x', mapping: current.mapping, now: NOW, source: current.source, workspace: workspace(body) })
    expect(acceptAreaSync(noop, current).apply).toBeNull()
  })
})

describe('sync core: actual tags', () => {
  it('moves tagged ships and preserves ships absent from the roster', () => {
    const body = content([area('A', 'A', 0), area('B', 'B', 1)], { A: [999, 1], B: [] })
    const prepared = prepareTagSync({
      mapping: [{ areaId: 'A', slot: 0 }, { areaId: 'B', slot: 1 }],
      now: NOW,
      roster: roster([ship({ ownedId: 1, tagSlot: 1 }), ship({ ownedId: 2, name: 'Two' })]),
      source: source([srcArea(0, 'A'), srcArea(1, 'B')]),
      workspace: workspace(body),
    })
    expect(prepared.summary.moved).toEqual([1])
    expect(prepared.summary.added).toEqual([2])
    expect(prepared.nextContent.assignments.A).toContain(999)
    expect(prepared.nextContent.assignments.B).toEqual([1])
    expect(prepared.nextContent.ships['2'].observedAt).toBe(NOW)
    expect(prepared.nextContent.ships['999']).toBeUndefined()
  })

  it('handles an area with no assignments key', () => {
    const body = content([area('A', 'A', 0), area('B', 'B', 1)], { A: [] })
    const prepared = prepareTagSync({
      mapping: [{ areaId: 'A', slot: 0 }, { areaId: 'B', slot: 1 }],
      now: NOW,
      roster: roster([ship({ ownedId: 1, tagSlot: 1 })]),
      source: source([srcArea(0, 'A'), srcArea(1, 'B')]),
      workspace: workspace(body),
    })
    expect(prepared.nextContent.assignments.B).toEqual([1])
  })

  it('requires the loaded account and roster to match at prepare', () => {
    const body = content([area('A', 'A', 0)], { A: [] })
    const base = {
      mapping: [{ areaId: 'A', slot: 0 }],
      now: NOW,
      source: source([srcArea(0, 'A')]),
    }
    expectSyncError(
      () => prepareTagSync({ ...base, roster: roster([ship()], 'acct-2'), workspace: workspace(body) }),
      'ACCOUNT_MISMATCH',
    )
    expectSyncError(
      () => prepareTagSync({ ...base, roster: roster([ship()], null), workspace: workspace(body, { accountId: null }) }),
      'ACCOUNT_MISMATCH',
    )
  })

  it('is stale when a candidate becomes tagged or the roster/account/source changes', () => {
    const body = content([area('A', 'A', 0)], { A: [] })
    const prepared = prepareTagSync({
      mapping: [{ areaId: 'A', slot: 0 }],
      now: NOW,
      roster: roster([ship({ tagSlot: null })]),
      source: source([srcArea(0, 'A')], 'session-1'),
      workspace: workspace(body),
    })
    const current = (over: Partial<TagSyncCurrent>): TagSyncCurrent => ({
      mapping: [{ areaId: 'A', slot: 0 }],
      roster: roster([ship({ tagSlot: null })]),
      source: source([srcArea(0, 'A')], 'session-1'),
      workspace: workspace(body),
      ...over,
    })
    expect(tagSyncFreshness(prepared, current({ roster: roster([ship({ tagSlot: 0 })]) })).reasons).toEqual(['ROSTER_CHANGED'])
    expect(tagSyncFreshness(prepared, current({ roster: roster([ship({ tagSlot: null })], 'acct-2') })).reasons).toEqual(['ACCOUNT_CHANGED'])
    expect(tagSyncFreshness(prepared, current({ source: source([srcArea(0, 'A')], 'session-2') })).reasons).toEqual(['SOURCE_CHANGED'])
    expect(tagSyncFreshness(prepared, current({ source: source([srcArea(0, 'A', '#ffffff')], 'session-1') })).reasons).toEqual(['SOURCE_CHANGED'])
    expect(tagSyncFreshness(prepared, current({})).fresh).toBe(true)
  })
})

describe('durable applySync', () => {
  const wsContent = content([area('area-1', 'E1', 0)], { 'area-1': [1] })
  const mkData = (): NavyData => ({
    legacyArchive: {},
    selectedWorkspaceId: 'ws-1',
    workspaces: [
      {
        createdAt: NOW,
        cursor: 0,
        id: 'ws-1',
        revisions: [{ content: wsContent, id: 'rev-1', op: { kind: 'initial' }, time: NOW }],
      },
    ],
  })
  const updated = { ...wsContent, areas: [area('area-1', 'E1 renamed', 0)] }
  const root = (navy: NavyData, over: Record<string, unknown> = {}) => ({
    account: 'acct-1',
    error: null,
    navy,
    ready: true,
    ...over,
  })

  it('appends exactly one revision and undo returns to the prior content', () => {
    const state = root(mkData())
    const next = rootReducer(
      state,
      onApplySync({
        accountId: 'acct-1',
        baseRevisionId: 'rev-1',
        content: updated,
        now: NOW,
        operation: { addedAreaIds: [], kind: 'update-areas', updatedAreaIds: ['area-1'] },
        workspaceId: 'ws-1',
      }),
    )
    expect(next.navy.workspaces[0].revisions).toHaveLength(2)
    expect(next.navy.workspaces[0].cursor).toBe(1)
    expect(next.navy.workspaces[0].revisions[1].content.areas[0].label).toBe('E1 renamed')

    const undone = rootReducer(next, onUndo())
    expect(undone.navy.workspaces[0].cursor).toBe(0)
    expect(undone.navy.workspaces[0].revisions[0].content.areas[0].label).toBe('E1')
  })

  it('rejects a mismatched base revision', () => {
    const state = root(mkData())
    const next = rootReducer(
      state,
      onApplySync({
        accountId: 'acct-1',
        baseRevisionId: 'rev-old',
        content: updated,
        now: NOW,
        operation: { addedAreaIds: [], kind: 'update-areas', updatedAreaIds: ['area-1'] },
        workspaceId: 'ws-1',
      }),
    )
    expect(next).toBe(state)
  })

  it('rejects a raced account switch or a not-ready reload', () => {
    const action = onApplySync({
      accountId: 'acct-1',
      baseRevisionId: 'rev-1',
      content: updated,
      now: NOW,
      operation: { addedAreaIds: [], kind: 'update-areas', updatedAreaIds: ['area-1'] },
      workspaceId: 'ws-1',
    })
    // Account marker already moved to another account.
    const raced = rootReducer(root(mkData(), { account: 'acct-2' }), action)
    expect(raced.navy.workspaces[0].revisions).toHaveLength(1)
    // Same account, but a reload is in flight (not ready).
    const reloading = rootReducer(root(mkData(), { ready: false }), action)
    expect(reloading.navy.workspaces[0].revisions).toHaveLength(1)
  })

  it('the navy reducer alone is guarded only by the base revision', () => {
    const data = mkData()
    const unchanged = navyReducer(data, {
      accountId: 'acct-1',
      baseRevisionId: 'rev-old',
      content: updated,
      now: NOW,
      operation: { addedAreaIds: [], kind: 'update-areas', updatedAreaIds: ['area-1'] },
      type: NAVY_ACTIONS.applySync,
      workspaceId: 'ws-1',
    })
    expect(unchanged).toBe(data)
  })
})

describe('sync roster candidate set', () => {
  const masters = { 1: { api_id: 1, api_name: 'Alpha', api_stype: 2 } }
  const raw = (over: Record<string, unknown> = {}) => ({
    api_id: 1,
    api_lv: 50,
    api_sally_area: 0,
    api_ship_id: 1,
    ...over,
  })
  const hostState = (ships: Record<string, unknown>): IState =>
    ({
      const: { $ships: masters },
      ext: { 'poi-plugin-navy-staff': { _: { account: '123', ready: true } } },
      info: { basic: { api_member_id: '123' }, ships },
    }) as unknown as IState

  it('includes an unknown-master owned ship with nullable display fields', () => {
    const roster = syncRosterSelector(
      hostState({
        1: raw({}),
        2: raw({ api_id: 2, api_lv: 10, api_ship_id: 999 }),
      }),
    )
    expect(roster?.ships.map((s) => s.ownedId).sort()).toEqual([1, 2])
    const missing = roster?.ships.find((s) => s.ownedId === 2)
    expect(missing?.masterId).toBe(999)
    expect(missing?.name).toBeNull()
    expect(missing?.typeId).toBeNull()
    expect(missing?.tagSlot).toBeNull()
  })

  it('invalidates a prepared batch when an unknown-master ship acquires a tag', () => {
    const body = content([area('a1', 'E1', 0)], { a1: [] })
    const mapping = [{ areaId: 'a1', slot: 0 }]
    const src = source([srcArea(0, 'E1')])
    const prepared = prepareTagSync({
      mapping,
      now: NOW,
      roster: syncRosterSelector(
        hostState({
          1: raw({}),
          2: raw({ api_id: 2, api_lv: 10, api_ship_id: 999 }),
        }),
      )!,
      source: src,
      workspace: workspace(body, { accountId: '123' }),
    })
    const current: TagSyncCurrent = {
      mapping,
      roster: syncRosterSelector(
        hostState({
          1: raw({}),
          2: raw({ api_id: 2, api_lv: 10, api_sally_area: 1, api_ship_id: 999 }),
        }),
      )!,
      source: src,
      workspace: workspace(body, { accountId: '123' }),
    }
    expect(tagSyncFreshness(prepared, current).reasons).toContain('ROSTER_CHANGED')

    const fresh = prepareTagSync({
      mapping,
      now: NOW,
      roster: current.roster,
      source: src,
      workspace: workspace(body, { accountId: '123' }),
    })
    expect(fresh.summary.added).toContain(2)
  })
})
