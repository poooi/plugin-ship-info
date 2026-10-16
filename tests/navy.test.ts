import { legacy_createStore } from 'redux'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('views/utils/selectors', () => ({
  extensionSelectorFactory: (key: string) => (state: any) =>
    state?.ext?.[key]?._ ?? {},
}))

import type { PersistenceWriter } from '../packages/shared/src/persistence'
import {
  ACTIONS,
  DISPLAY_FLEET_NAME_CONFIG,
  LEGACY_DISPLAY_FLEET_NAME_CONFIG,
  PLUGIN_KEY,
} from '../packages/navy-staff/src/views/plugin-identity'
import { createPersistence } from '../packages/navy-staff/src/views/persistence'
import { reducer as navyReducer } from '../packages/navy-staff/src/views/redux'
import type { NavyWorkspace } from '../packages/navy-staff/src/views/workspace/types'
import {
  onAddShip,
  onDeleteWorkspace,
  onMoveShip,
  onRedo,
  onRemoveShip,
  onRenameWorkspace,
  onRestore,
  onSelectWorkspace,
  onUndo,
} from '../packages/navy-staff/src/views/workspace/creators'

type NavySlice = {
  account: string | null
  error: string | null
  navy: {
    selectedWorkspaceId: string
    workspaces: any[]
    legacyArchive: Record<string, unknown>
  }
  ready: boolean
}

const hostReducer = (state: any = { ext: {} }, action: any) => {
  const current: any = state.ext?.[PLUGIN_KEY]?._
  const next = navyReducer(current, action)
  if (next === current) {
    return state
  }
  return { ...state, ext: { ...state.ext, [PLUGIN_KEY]: { _: next } } }
}

const createStore = () => legacy_createStore(hostReducer)
const sliceOf = (store: { getState: () => any }): NavySlice =>
  store.getState().ext[PLUGIN_KEY]._
const waitFor = async (predicate: () => boolean, timeout = 1000) => {
  const start = Date.now()
  while (!predicate()) {
    if (Date.now() - start > timeout) throw new Error('waitFor timed out')
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setTimeout(resolve, 1))
  }
}

const enoent = () => Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
const noAccounts = async () => []

const recordingWriter = () => {
  const writes: Array<{ data: any; path: string }> = []
  const writer: PersistenceWriter = {
    write: (filePath, data, _options, callback) => {
      writes.push({ data, path: filePath })
      callback?.()
    },
  }
  return { writer, writes }
}

const readFrom = (files: Record<string, unknown>) =>
  vi.fn(async (filePath: string) => {
    if (Object.prototype.hasOwnProperty.call(files, filePath)) {
      return structuredClone(files[filePath])
    }
    throw enoent()
  })

const NAVY = '/appdata/poi-plugin-navy-staff.json'
const LEGACY = '/appdata/poi-plugin-ship-info.json'
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

const mkWorkspace = ({
  current = [[], []],
  id = 'ws-1',
  name = 'Plan',
}: {
  current?: number[][]
  id?: string
  name?: string
} = {}): NavyWorkspace => {
  const areas = [area('area-1', 0), area('area-2', 1)]
  return {
    createdAt: NOW,
    cursor: 0,
    id,
    revisions: [
      {
        content: {
          areas,
          assignments: Object.fromEntries(
            areas.map((a, index) => [a.id, [...(current[index] ?? [])]]),
          ),
          name,
          ships: {},
        },
        id: `rev-${id}`,
        op: { kind: 'initial' },
        time: NOW,
      },
    ],
  }
}

const mkNavy = (workspaces: any[] = [mkWorkspace()], selected = 'ws-1') => ({
  legacyArchive: {},
  selectedWorkspaceId: selected,
  workspaces,
})

const T = (name: string) => `@@${PLUGIN_KEY}@${name}`
const init = (navy: any) =>
  navyReducer(undefined, { data: { navy }, type: T('init') })
const assignmentsOf = (state: NavySlice) => {
  const workspace = state.navy.workspaces.find(
    (w) => w.id === state.navy.selectedWorkspaceId,
  )
  return workspace.revisions[workspace.cursor].content.assignments
}

describe('Navy workspace reducer', () => {
  it('adds, moves and removes ships between stable area ids', () => {
    let state = init(mkNavy([mkWorkspace({ current: [[], []] })]))
    state = navyReducer(
      state,
      onAddShip({ areaId: 'area-1', now: NOW, record: record(10), shipId: 10 }),
    )
    expect(assignmentsOf(state)['area-1']).toEqual([10])

    state = navyReducer(
      state,
      onMoveShip({
        fromAreaId: 'area-1',
        now: NOW,
        shipId: 10,
        toAreaId: 'area-2',
      }),
    )
    expect(assignmentsOf(state)['area-1']).toEqual([])
    expect(assignmentsOf(state)['area-2']).toEqual([10])

    state = navyReducer(
      state,
      onRemoveShip({ areaId: 'area-2', now: NOW, shipId: 10 }),
    )
    expect(assignmentsOf(state)['area-2']).toEqual([])
  })

  it('treats adding a ship already in the area as a no-op (no revision)', () => {
    const state = init(mkNavy([mkWorkspace({ current: [[10], []] })]))
    const next = navyReducer(
      state,
      onAddShip({ areaId: 'area-1', now: NOW, record: record(10), shipId: 10 }),
    )
    expect(next).toBe(state)
  })

  it('ignores a stale move whose source does not contain the ship', () => {
    const state = init(mkNavy([mkWorkspace({ current: [[], []] })]))
    const next = navyReducer(
      state,
      onMoveShip({
        fromAreaId: 'area-1',
        now: NOW,
        shipId: 99,
        toAreaId: 'area-2',
      }),
    )
    expect(next).toBe(state)
  })

  it('honors the explicit rename target, not the selected workspace', () => {
    const a = mkWorkspace({ id: 'ws-a', name: 'A' })
    const b = mkWorkspace({ id: 'ws-b', name: 'B' })
    const state = init(mkNavy([a, b], 'ws-a'))

    const next = navyReducer(
      state,
      onRenameWorkspace({ id: 'ws-b', name: 'Bee', now: NOW }),
    )
    const byId = (s: NavySlice, id: string) => {
      const workspace = s.navy.workspaces.find((w) => w.id === id)
      return workspace.revisions[workspace.cursor].content.name
    }
    expect(byId(next as NavySlice, 'ws-a')).toBe('A')
    expect(byId(next as NavySlice, 'ws-b')).toBe('Bee')
    expect((next as NavySlice).navy.selectedWorkspaceId).toBe('ws-a')
  })

  it('does not append a revision for an unchanged rename', () => {
    const state = init(mkNavy([mkWorkspace({ name: 'Plan' })]))
    const next = navyReducer(
      state,
      onRenameWorkspace({ id: 'ws-1', name: 'Plan', now: NOW }),
    )
    expect(next).toBe(state)
  })

  it('deletes the workspace and switches selection to a remaining one', () => {
    const a = mkWorkspace({ id: 'ws-a' })
    const b = mkWorkspace({ id: 'ws-b' })
    const state = init(mkNavy([a, b], 'ws-a'))
    const next = navyReducer(state, onDeleteWorkspace({ id: 'ws-a' }))
    expect(next.navy.workspaces.map((w) => w.id)).toEqual(['ws-b'])
    expect(next.navy.selectedWorkspaceId).toBe('ws-b')
  })

  it('selects only an existing workspace', () => {
    const state = init(mkNavy([mkWorkspace()], 'ws-1'))
    expect(navyReducer(state, onSelectWorkspace({ id: 'nope' }))).toBe(state)
  })

  it('keeps transient preview out of the durable slice shape', () => {
    const state = init(mkNavy())
    expect(Object.keys(state)).toEqual(['account', 'error', 'navy', 'ready'])
    expect(state.navy).not.toHaveProperty('preview')
  })
})

describe('Navy history', () => {
  const add = (state: NavySlice, shipId: number) =>
    navyReducer(
      state,
      onAddShip({ areaId: 'area-1', now: NOW, record: record(shipId), shipId }),
    )
  const withHistory = () => {
    let state = init(mkNavy([mkWorkspace({ current: [[], []] })]))
    state = add(state, 10)
    state = add(state, 20)
    return state
  }
  const workspaceOf = (state: NavySlice) => state.navy.workspaces[0]
  const idsOf = (state: NavySlice) =>
    Object.values(assignmentsOf(state)).flat()

  it('undo/redo move the cursor and a new edit discards the redo tail', () => {
    let state = withHistory()
    expect(workspaceOf(state).cursor).toBe(2)
    expect(idsOf(state)).toEqual([10, 20])

    state = navyReducer(state, onUndo())
    expect(workspaceOf(state).cursor).toBe(1)
    expect(idsOf(state)).toEqual([10])

    state = navyReducer(state, onRedo())
    expect(workspaceOf(state).cursor).toBe(2)
    expect(idsOf(state)).toEqual([10, 20])

    state = navyReducer(state, onUndo())
    state = add(state, 30)
    expect(workspaceOf(state).revisions).toHaveLength(3)
    expect(workspaceOf(state).cursor).toBe(2)
    expect(idsOf(state)).toEqual([10, 30])
  })

  it('undo and redo are no-ops at the ends of the history', () => {
    const state = init(mkNavy([mkWorkspace({ current: [[], []] })]))
    expect(navyReducer(state, onUndo())).toBe(state)
    expect(navyReducer(state, onRedo())).toBe(state)
  })

  it('restore resolves and copies a target in the redo tail before truncation', () => {
    let state = withHistory()
    const targetId = workspaceOf(state).revisions[2].id
    // Move the cursor to the start so the target sits in the redo tail.
    state = navyReducer(state, onUndo())
    state = navyReducer(state, onUndo())
    expect(workspaceOf(state).cursor).toBe(0)

    state = navyReducer(state, onRestore({ id: targetId, now: NOW }))
    // One revision (copy of the target) was appended after the cursor.
    expect(workspaceOf(state).revisions).toHaveLength(2)
    expect(workspaceOf(state).cursor).toBe(1)
    expect(idsOf(state)).toEqual([10, 20])
    expect(workspaceOf(state).revisions[1].op).toEqual({
      from: targetId,
      kind: 'restore',
    })
  })

  it('restore is a no-op when the target equals the current content', () => {
    const state = withHistory()
    const currentId = workspaceOf(state).revisions[2].id
    expect(navyReducer(state, onRestore({ id: currentId, now: NOW }))).toBe(state)
  })

  it('restore rejects a missing target', () => {
    const state = withHistory()
    expect(navyReducer(state, onRestore({ id: 'missing', now: NOW }))).toBe(state)
  })

  it('keeps independent cursors per workspace', () => {
    const a = mkWorkspace({ id: 'ws-a', current: [[], []] })
    const b = mkWorkspace({ id: 'ws-b', current: [[], []] })
    let state = init(mkNavy([a, b], 'ws-a'))
    state = add(state, 10)
    const bBefore = state.navy.workspaces.find((w) => w.id === 'ws-b')!
    expect(bBefore.revisions).toHaveLength(1)

    state = navyReducer(state, onSelectWorkspace({ id: 'ws-b' }))
    expect(navyReducer(state, onUndo())).toBe(state)
    const aAfter = state.navy.workspaces.find((w) => w.id === 'ws-a')!
    expect(aAfter.cursor).toBe(1)
  })
})

describe('Navy persistence migration', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>
  let config: Record<string, any>

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    void errorSpy
    config = {}
    ;(window as any).config = {
      get: (path: string, fallback: any) =>
        path in config ? config[path] : fallback,
      set: (path: string, value: any) => {
        config[path] = value
      },
    }
  })

  const start = (
    store: any,
    files: Record<string, unknown>,
    opts: { writer?: PersistenceWriter; onError?: any } = {},
  ) => {
    const { writer, writes } = recordingWriter()
    const persistence = createPersistence({
      dataPath: NAVY,
      isMain: true,
      legacyShipInfoDataPath: LEGACY, listAccountFiles: noAccounts,
      onError: opts.onError,
      readFile: readFrom(files),
      writer: opts.writer ?? writer,
    })
    persistence.start(store)
    return { persistence, writes }
  }

  it('upgrades a v0 Navy file to v2, preserving plan and archive', async () => {
    const store = createStore()
    const v0 = { planner: { archive: { a: [[1]] }, current: [[2]] } }
    const { persistence, writes } = start(store, { [NAVY]: v0 })
    await waitFor(() => sliceOf(store).ready)

    const navy = sliceOf(store).navy
    expect(navy.legacyArchive).toEqual({ a: [[1]] })
    const content = navy.workspaces[0].revisions[0].content
    expect(Object.values(content.assignments).flat()).toEqual([2])
    expect(writes[0].data.version).toBe(2)
    expect(writes[0].data.planner).toBeUndefined()
    expect(writes[0].data.workspaces).toHaveLength(1)
    persistence.stop()
  })

  it('does not rewrite a current v2 Navy file', async () => {
    const store = createStore()
    const { writer, writes } = recordingWriter()
    const persistence = createPersistence({
      dataPath: NAVY,
      isMain: true,
      legacyShipInfoDataPath: LEGACY, listAccountFiles: noAccounts,
      readFile: readFrom({
        [NAVY]: { ...mkNavy([mkWorkspace({ current: [[1], []] })]), version: 2 },
      }),
      writer,
    })
    persistence.start(store)
    await waitFor(() => sliceOf(store).ready)
    expect(writes).toHaveLength(0)
    persistence.stop()
  })

  it('persists and reloads the cursor and full history', async () => {
    const store = createStore()
    const ws = mkWorkspace({ current: [[], []] })
    const base = ws.revisions[0]
    ws.revisions = [
      base,
      {
        content: {
          ...base.content,
          assignments: { ...base.content.assignments, 'area-1': [10] },
        },
        id: 'rev-2',
        op: { areaId: 'area-1', kind: 'add-ship', shipId: 10 },
        time: NOW,
      },
    ]
    ws.cursor = 0
    const { writer, writes } = recordingWriter()
    const persistence = createPersistence({
      dataPath: NAVY,
      isMain: true,
      legacyShipInfoDataPath: LEGACY, listAccountFiles: noAccounts,
      readFile: readFrom({ [NAVY]: { ...mkNavy([ws]), version: 2 } }),
      writer,
    })
    persistence.start(store)
    await waitFor(() => sliceOf(store).ready)
    const loaded = sliceOf(store).navy.workspaces[0]
    expect(loaded.cursor).toBe(0)
    expect(loaded.revisions).toHaveLength(2)
    expect(writes).toHaveLength(0)
    persistence.stop()
  })

  it('rejects a future or malformed version without writing', async () => {
    for (const bad of [
      { ...mkNavy(), version: 3 },
      { ...mkNavy(), version: '2' },
    ]) {
      const store = createStore()
      const onError = vi.fn()
      const { writer, writes } = recordingWriter()
      const persistence = createPersistence({
        dataPath: NAVY,
        isMain: true,
        legacyShipInfoDataPath: LEGACY, listAccountFiles: noAccounts,
        onError,
        readFile: readFrom({ [NAVY]: bad }),
        writer,
      })
      persistence.start(store)
      // eslint-disable-next-line no-await-in-loop
      await waitFor(() => sliceOf(store).error !== null)
      expect(writes).toHaveLength(0)
      persistence.stop()
    }
  })

  it('rejects malformed v2 content instead of hiding saved plans', async () => {
    const valid = mkNavy([mkWorkspace({ current: [[1], []] })])
    const badWorkspace = structuredClone(valid.workspaces[0])
    badWorkspace.revisions[0].content.areas = [null]
    const cases = [
      { ...valid, workspaces: [badWorkspace] },
      { ...valid, selectedWorkspaceId: 'does-not-exist' },
      (() => {
        const navy = structuredClone(valid)
        navy.workspaces[0].revisions[0].content.ships = { '1': { ownedId: 'x' } }
        return navy
      })(),
      (() => {
        const navy = structuredClone(valid)
        navy.workspaces[0].revisions[0].content.assignments = { ghost: [1] }
        return navy
      })(),
    ]
    for (const bad of cases) {
      const store = createStore()
      const onError = vi.fn()
      const { writer, writes } = recordingWriter()
      const persistence = createPersistence({
        dataPath: NAVY,
        isMain: true,
        legacyShipInfoDataPath: LEGACY, listAccountFiles: noAccounts,
        onError,
        readFile: readFrom({ [NAVY]: { ...bad, version: 2 } }),
        writer,
      })
      persistence.start(store)
      // eslint-disable-next-line no-await-in-loop
      await waitFor(() => sliceOf(store).error !== null)
      expect(onError).toHaveBeenCalledTimes(1)
      expect(writes).toHaveLength(0)
      persistence.stop()
    }
  })

  it('rejects duplicate workspace ids and duplicate revision ids', async () => {
    const valid = mkNavy([mkWorkspace({ current: [[1], []] })])
    const dupWorkspace = structuredClone(valid)
    dupWorkspace.workspaces = [
      structuredClone(valid.workspaces[0]),
      structuredClone(valid.workspaces[0]),
    ]
    const dupRevision = structuredClone(valid)
    dupRevision.workspaces[0].revisions = [
      structuredClone(valid.workspaces[0].revisions[0]),
      structuredClone(valid.workspaces[0].revisions[0]),
    ]
    dupRevision.workspaces[0].cursor = 1

    for (const bad of [dupWorkspace, dupRevision]) {
      const store = createStore()
      const onError = vi.fn()
      const { writer, writes } = recordingWriter()
      const persistence = createPersistence({
        dataPath: NAVY,
        isMain: true,
        legacyShipInfoDataPath: LEGACY, listAccountFiles: noAccounts,
        onError,
        readFile: readFrom({ [NAVY]: { ...bad, version: 2 } }),
        writer,
      })
      persistence.start(store)
      // eslint-disable-next-line no-await-in-loop
      await waitFor(() => sliceOf(store).error !== null)
      expect(onError).toHaveBeenCalledTimes(1)
      expect(writes).toHaveLength(0)
      persistence.stop()
    }
  })

  it('imports legacy planner data into v2 when the Navy file is missing', async () => {
    const store = createStore()
    const { persistence, writes } = start(store, {
      [LEGACY]: { planner: { archive: { a: [[1]] }, current: [[2, 3]] } },
    })
    await waitFor(() => sliceOf(store).ready)
    const navy = sliceOf(store).navy
    expect(navy.legacyArchive).toEqual({ a: [[1]] })
    expect(Object.values(navy.workspaces[0].revisions[0].content.assignments).flat()).toEqual([2, 3])
    expect(writes[0].data.version).toBe(2)
    expect(writes.every((w) => w.path === NAVY)).toBe(true)
    persistence.stop()
  })

  it('rejects a legacy planner with a non-integer ship id', async () => {
    const store = createStore()
    const { persistence, writes } = start(store, {
      [LEGACY]: { planner: { current: [['bad']] } },
    })
    await waitFor(() => sliceOf(store).error !== null)
    expect(writes).toHaveLength(0)
    persistence.stop()
  })

  it('does not import Ship Info when another account file already exists', async () => {
    const store = createStore()
    const { writer, writes } = recordingWriter()
    const persistence = createPersistence({
      dataPath: NAVY,
      isMain: true,
      legacyShipInfoDataPath: LEGACY,
      listAccountFiles: async () => ['202.json'],
      readFile: readFrom({
        [LEGACY]: { planner: { archive: { a: [[1]] }, current: [[5]] } },
      }),
      writer,
    })
    persistence.start(store)
    await waitFor(() => sliceOf(store).ready)
    const navy = sliceOf(store).navy
    // A second account starts empty rather than copying the same owned IDs.
    expect(navy.workspaces).toEqual([])
    expect(navy.legacyArchive).toEqual({})
    expect(writes[0].data.version).toBe(2)
    expect(writes[0].data.workspaces).toEqual([])
    persistence.stop()
  })

  it('uses an existing account file and never imports Ship Info', async () => {
    const store = createStore()
    const { writer, writes } = recordingWriter()
    const persistence = createPersistence({
      dataPath: NAVY,
      isMain: true,
      legacyShipInfoDataPath: LEGACY,
      listAccountFiles: async () => [],
      readFile: readFrom({
        [NAVY]: { ...mkNavy([mkWorkspace({ current: [[1], []] })]), version: 2 },
        [LEGACY]: { planner: { archive: {}, current: [[7]] } },
      }),
      writer,
    })
    persistence.start(store)
    await waitFor(() => sliceOf(store).ready)
    const ids = Object.values(
      sliceOf(store).navy.workspaces[0].revisions[0].content.assignments,
    ).flat()
    expect(ids).toEqual([1])
    expect(writes).toHaveLength(0)
    persistence.stop()
  })

  it('creates an empty v2 root when both files are missing', async () => {
    const store = createStore()
    const { persistence, writes } = start(store, {})
    await waitFor(() => sliceOf(store).ready)
    expect(sliceOf(store).navy.workspaces).toEqual([])
    expect(sliceOf(store).navy.selectedWorkspaceId).toBe('')
    expect(writes[0].data.version).toBe(2)
    persistence.stop()
  })

  it('surfaces an invalid Navy file and never falls back to legacy', async () => {
    const store = createStore()
    const readFile = readFrom({
      [NAVY]: { planner: { current: [null] } },
      [LEGACY]: { planner: { current: [[7]] } },
    })
    const onError = vi.fn()
    const { writer, writes } = recordingWriter()
    const persistence = createPersistence({
      dataPath: NAVY,
      isMain: true,
      legacyShipInfoDataPath: LEGACY, listAccountFiles: noAccounts,
      onError,
      readFile,
      writer,
    })
    persistence.start(store)
    await waitFor(() => sliceOf(store).error !== null)
    expect(onError).toHaveBeenCalledTimes(1)
    expect(readFile).toHaveBeenCalledTimes(1)
    expect(writes).toHaveLength(0)
  })

  it('imports legacy displayFleetName only when unset', async () => {
    config[LEGACY_DISPLAY_FLEET_NAME_CONFIG] = true
    const store = createStore()
    const { persistence } = start(store, {
      [LEGACY]: { planner: { archive: {}, current: [] } },
    })
    await waitFor(() => sliceOf(store).ready)
    expect(config[DISPLAY_FLEET_NAME_CONFIG]).toBe(true)
    persistence.stop()
  })

  it('keeps saving disabled after a failed migration write', async () => {
    const store = createStore()
    const writes: Array<{ data: any; path: string }> = []
    const writer: PersistenceWriter = {
      write: (filePath, data, _options, callback) => {
        writes.push({ data, path: filePath })
        callback?.(new Error('EACCES: permission denied'))
      },
    }
    const persistence = createPersistence({
      dataPath: NAVY,
      isMain: true,
      legacyShipInfoDataPath: LEGACY, listAccountFiles: noAccounts,
      readFile: readFrom({
        [LEGACY]: { planner: { archive: {}, current: [[1]] } },
      }),
      writer,
    })
    persistence.start(store)
    await waitFor(() => sliceOf(store).error !== null)
    expect(sliceOf(store).ready).toBe(false)
    store.dispatch({ type: ACTIONS.loadStart })
    await new Promise((resolve) => setImmediate(resolve))
    expect(writes).toHaveLength(1)
    persistence.stop()
  })
})
