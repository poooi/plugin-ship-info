import i18next from 'i18next'
import { legacy_createStore } from 'redux'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import navyEnUS from '../packages/navy-staff/i18n/en-US.json'
import navyJaJP from '../packages/navy-staff/i18n/ja-JP.json'

// Exercises Navy Staff's exported lifecycle hooks against the per-account file
// model: each host member id gets its own JSON file, there is no in-file owner,
// and the released Ship Info plan is imported once into the first account file.

const h = vi.hoisted(() => ({
  files: {} as Record<string, unknown>,
  reads: [] as string[],
  deferWrites: false,
  pending: [] as Array<() => void>,
  hold: new Set<string>(),
  held: new Map<string, () => void>(),
}))

vi.mock('fs-extra', async () => {
  const enoent = () =>
    Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
  const dirPrefix = (dir: string) =>
    (dir.endsWith('/') || dir.endsWith('\\') ? dir : `${dir}/`).replace(/\\/g, '/')
  return {
    outputJson: (filePath: string, data: unknown) => {
      const commit = () => {
        h.files[filePath] = structuredClone(data)
      }
      if (!h.deferWrites) {
        commit()
        return Promise.resolve()
      }
      return new Promise<void>((resolve) => {
        h.pending.push(() => {
          commit()
          resolve()
        })
      })
    },
    readJson: async (filePath: string) => {
      h.reads.push(filePath)
      if (h.hold.has(filePath)) {
        await new Promise<void>((resolve) => {
          h.held.set(filePath, resolve)
        })
      }
      if (!Object.prototype.hasOwnProperty.call(h.files, filePath)) {
        throw enoent()
      }
      return structuredClone(h.files[filePath])
    },
    // Account files live in a plugin subdirectory; derive entries from the
    // in-memory file map. An empty directory is reported as ENOENT so the
    // production listAccountFiles fallback is exercised.
    readdir: async (dir: string) => {
      const prefix = dirPrefix(dir)
      const names = new Set<string>()
      for (const key of Object.keys(h.files)) {
        const normalized = key.replace(/\\/g, '/')
        if (!normalized.startsWith(prefix)) continue
        const rest = normalized.slice(prefix.length)
        if (rest.length > 0 && !rest.includes('/')) names.add(rest)
      }
      if (names.size === 0) throw enoent()
      return [...names]
    },
  }
})

const settleWrites = () => {
  const pending = h.pending
  h.pending = []
  for (const settle of pending) settle()
}

const releaseRead = (filePath: string) => {
  h.hold.delete(filePath)
  const resolve = h.held.get(filePath)
  h.held.delete(filePath)
  resolve?.()
}

vi.mock('views/utils/selectors', () => ({
  extensionSelectorFactory: (key: string) => (state: any) =>
    state?.ext?.[key]?._ ?? {},
}))

const storeHolder = vi.hoisted(() => ({ store: undefined as any }))
vi.mock('views/create-store', () => ({
  get store() {
    return storeHolder.store
  },
}))

const i18nHolder = vi.hoisted(() => ({ instance: undefined as any }))
vi.mock('views/env-parts/i18next', () => ({
  get default() {
    return i18nHolder.instance
  },
}))

import { accountFilePath } from '../packages/navy-staff/src/views/account'
import {
  LEGACY_DATA_PATH,
  PLUGIN_KEY,
} from '../packages/navy-staff/src/views/plugin-identity'
import { reducer as navyReducer } from '../packages/navy-staff/src/views/redux'
import { onAddShip } from '../packages/navy-staff/src/views/workspace/creators'

type Slice = {
  account: string | null
  error: string | null
  navy: {
    selectedWorkspaceId: string
    workspaces: any[]
    legacyArchive: Record<string, unknown>
  }
  ready: boolean
}

const NOW = '2026-01-01T00:00:00.000Z'

/** Absolute account-file path for a test member id (non-null in tests). */
const acct = (id: string): string => {
  const filePath = accountFilePath(id)
  if (filePath === null) throw new Error(`unusable member id: ${id}`)
  return filePath
}

const area = () => ({
  capturedAt: NOW,
  color: '#ffffff',
  fleetLabels: {},
  id: 'area-1',
  label: 'E1',
  tagSlot: 0,
})

const mkRevision = (id: string, ids: number[], op: unknown) => ({
  content: { areas: [area()], assignments: { 'area-1': [...ids] }, name: 'Plan', ships: {} },
  id,
  op,
  time: NOW,
})

const mkRoot = ({
  cursor = 0,
  legacyArchive = {},
  revisions = [mkRevision('rev-1', [1], { kind: 'initial' })],
}: {
  cursor?: number
  legacyArchive?: Record<string, unknown>
  revisions?: ReturnType<typeof mkRevision>[]
} = {}) => ({
  legacyArchive,
  selectedWorkspaceId: 'ws-1',
  version: 2,
  workspaces: [{ createdAt: NOW, cursor, id: 'ws-1', revisions }],
})

const hostReducer = (state: any, action: any) => {
  if (action.type === 'TEST/SET_MEMBER') {
    return {
      ...state,
      info: { ...state.info, basic: { ...state.info.basic, api_member_id: action.id } },
    }
  }
  const current: any = state.ext?.[PLUGIN_KEY]?._
  const next = navyReducer(current, action)
  if (next === current) return state
  return { ...state, ext: { ...state.ext, [PLUGIN_KEY]: { _: next } } }
}

const createHostStore = (memberId: string | number | null = '123') =>
  legacy_createStore((state = { ext: {}, info: { basic: { api_member_id: memberId } } }, action: any) =>
    hostReducer(state, action),
  )

const setMember = (store: { dispatch: (a: any) => void }, id: string | null) =>
  store.dispatch({ type: 'TEST/SET_MEMBER', id })

const sliceOf = (store: { getState: () => any }): Slice =>
  store.getState().ext[PLUGIN_KEY]._

const assignedIds = (slice: Slice): number[] => {
  const workspace = slice.navy.workspaces.find(
    (w) => w.id === slice.navy.selectedWorkspaceId,
  )
  if (!workspace) return []
  return Object.values(
    workspace.revisions[workspace.cursor].content.assignments,
  ).flat() as number[]
}

const cursorOf = (slice: Slice): number | null => {
  const workspace = slice.navy.workspaces.find(
    (w) => w.id === slice.navy.selectedWorkspaceId,
  )
  return workspace ? workspace.cursor : null
}

const flush = () => new Promise((resolve) => setImmediate(resolve))
const waitFor = async (predicate: () => boolean, timeout = 1500) => {
  const start = Date.now()
  while (!predicate()) {
    if (Date.now() - start > timeout) throw new Error('waitFor timed out')
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setTimeout(resolve, 1))
  }
}

const setI18n = (lng: string, resources: Record<string, unknown>) => {
  const instance = i18next.createInstance()
  instance.init({
    defaultNS: 'poi-plugin-navy-staff',
    fallbackLng: false,
    initAsync: false,
    lng,
    ns: ['poi-plugin-navy-staff', 'resources'],
    resources: { [lng]: { 'poi-plugin-navy-staff': resources } },
  })
  i18nHolder.instance = instance
}

const importLifecycle = async () => {
  vi.resetModules()
  return import('../packages/navy-staff/src/views/lifecycle')
}

describe('Navy Staff lifecycle hooks', () => {
  beforeEach(() => {
    h.files = {}
    h.reads = []
    h.deferWrites = false
    h.pending = []
    h.hold = new Set()
    h.held = new Map()
    storeHolder.store = undefined
    ;(window as any).isMain = true
    ;(window as any).toast = vi.fn()
    ;(globalThis as any).config = { get: () => undefined, set: () => undefined }
    ;(window as any).config = (globalThis as any).config
    ;(window as any)[Symbol.for('poi-plugin-navy-staff@file-writer')] = undefined
    setI18n('en-US', navyEnUS)
  })

  it('imports the released Ship Info plan into the first account file only', async () => {
    h.files[LEGACY_DATA_PATH] = {
      bookmark: {},
      planner: { archive: { a: [[1]] }, current: [[2, 3]] },
      ready: true,
    }
    const legacyBefore = structuredClone(h.files[LEGACY_DATA_PATH])
    const store = createHostStore('123')
    storeHolder.store = store

    const lifecycle = await importLifecycle()
    lifecycle.pluginDidLoad()
    await waitFor(() => sliceOf(store).ready)

    expect(sliceOf(store).account).toBe('123')
    expect(assignedIds(sliceOf(store))).toEqual([2, 3])
    expect(sliceOf(store).navy.legacyArchive).toEqual({ a: [[1]] })
    const fileA = h.files[acct('123')] as any
    expect(fileA.version).toBe(2)
    expect(fileA.planner).toBeUndefined()
    // The released Ship Info source is read, never modified.
    expect(h.files[LEGACY_DATA_PATH]).toEqual(legacyBefore)

    // A second account starts empty and never re-imports Ship Info.
    setMember(store, '456')
    await waitFor(() => sliceOf(store).ready && sliceOf(store).account === '456')
    expect(assignedIds(sliceOf(store))).toEqual([])
    expect(sliceOf(store).navy.legacyArchive).toEqual({})
    expect(h.files[acct('456')]).toBeDefined()

    lifecycle.pluginWillUnload()
  })

  it('keeps data and history cursor isolated across A -> B -> A', async () => {
    h.files[acct('123')] = mkRoot({
      cursor: 1,
      revisions: [
        mkRevision('rev-1', [1], { kind: 'initial' }),
        mkRevision('rev-2', [1, 2], { areaId: 'area-1', kind: 'add-ship', shipId: 2 }),
      ],
    })
    const store = createHostStore('123')
    storeHolder.store = store

    const lifecycle = await importLifecycle()
    lifecycle.pluginDidLoad()
    await waitFor(() => sliceOf(store).ready && sliceOf(store).account === '123')
    expect(cursorOf(sliceOf(store))).toBe(1)
    expect(assignedIds(sliceOf(store))).toEqual([1, 2])

    setMember(store, '456')
    await waitFor(() => sliceOf(store).ready && sliceOf(store).account === '456')
    expect(assignedIds(sliceOf(store))).toEqual([])
    expect(cursorOf(sliceOf(store))).toBeNull()

    setMember(store, '123')
    await waitFor(() => sliceOf(store).ready && sliceOf(store).account === '123')
    expect(cursorOf(sliceOf(store))).toBe(1)
    expect(assignedIds(sliceOf(store))).toEqual([1, 2])

    lifecycle.pluginWillUnload()
  })

  it('stays not-ready and writes nothing while the member id is missing', async () => {
    const store = createHostStore(null)
    storeHolder.store = store

    const lifecycle = await importLifecycle()
    lifecycle.pluginDidLoad()
    await flush()
    await flush()

    expect(sliceOf(store).ready).toBe(false)
    expect(sliceOf(store).account).toBeNull()
    expect(Object.keys(h.files)).toHaveLength(0)
    lifecycle.pluginWillUnload()
  })

  it('clears readiness when the member id is lost after load and then writes nothing', async () => {
    h.files[acct('123')] = mkRoot()
    const before = structuredClone(h.files[acct('123')])
    const store = createHostStore('123')
    storeHolder.store = store

    const lifecycle = await importLifecycle()
    lifecycle.pluginDidLoad()
    await waitFor(() => sliceOf(store).ready && sliceOf(store).account === '123')
    expect(assignedIds(sliceOf(store))).toEqual([1])

    // Losing the account clears readiness synchronously, without a write.
    setMember(store, null)
    expect(sliceOf(store).ready).toBe(false)
    expect(sliceOf(store).account).toBeNull()

    // A subsequent edit cannot write: no engine owns this account anymore.
    store.dispatch(
      onAddShip({
        areaId: 'area-1',
        now: NOW,
        record: {
          level: 1,
          masterId: 5,
          name: 'S5',
          observedAt: NOW,
          ownedId: 5,
          typeId: 2,
          typeLabel: 'DD',
        },
        shipId: 5,
      }),
    )
    await flush()
    await flush()
    expect(h.pending.length).toBe(0)
    expect(h.files[acct('123')]).toEqual(before)

    lifecycle.pluginWillUnload()
  })

  it('waits for a pending account-A save on switch to B, then restores A', async () => {
    h.files[acct('123')] = mkRoot()
    h.files[acct('456')] = mkRoot({
      revisions: [mkRevision('rev-b', [2], { kind: 'initial' })],
    })
    const bBefore = structuredClone(h.files[acct('456')])
    const store = createHostStore('123')
    storeHolder.store = store

    h.deferWrites = true
    const lifecycle = await importLifecycle()
    lifecycle.pluginDidLoad()
    await waitFor(() => sliceOf(store).ready && sliceOf(store).account === '123')
    expect(assignedIds(sliceOf(store))).toEqual([1])

    // Queue an edit on account A.
    store.dispatch(
      onAddShip({
        areaId: 'area-1',
        now: NOW,
        record: {
          level: 1,
          masterId: 5,
          name: 'S5',
          observedAt: NOW,
          ownedId: 5,
          typeId: 2,
          typeLabel: 'DD',
        },
        shipId: 5,
      }),
    )
    await waitFor(() => assignedIds(sliceOf(store)).includes(5))
    await flush()
    await flush()
    expect(h.pending.length).toBe(1)

    // Switch to B while A's save is still queued: B's readiness waits for the
    // drain, so neither file has changed yet.
    setMember(store, '456')
    await flush()
    expect(sliceOf(store).ready).toBe(false)
    expect((h.files[acct('123')] as any).workspaces[0].revisions.length).toBe(1)
    expect(h.files[acct('456')]).toEqual(bBefore)

    settleWrites()
    await waitFor(() => sliceOf(store).ready && sliceOf(store).account === '456')

    // B shows its own unchanged data; A's queued edit committed to A's file.
    expect(assignedIds(sliceOf(store))).toEqual([2])
    expect(h.files[acct('456')]).toEqual(bBefore)
    expect((h.files[acct('123')] as any).workspaces[0].revisions.length).toBe(2)

    // Returning to A restores the saved edit.
    setMember(store, '123')
    await waitFor(() => sliceOf(store).ready && sliceOf(store).account === '123')
    expect(assignedIds(sliceOf(store))).toEqual([1, 5])

    h.deferWrites = false
    lifecycle.pluginWillUnload()
  })

  it('drops a stale account load instead of hydrating the newly active account', async () => {
    h.files[acct('123')] = mkRoot()
    h.files[acct('456')] = mkRoot({
      revisions: [mkRevision('rev-2', [2], { kind: 'initial' })],
    })
    const store = createHostStore('123')
    storeHolder.store = store

    h.hold.add(acct('123'))
    const lifecycle = await importLifecycle()
    lifecycle.pluginDidLoad()
    await flush()

    // Switch accounts while the first read is still in flight.
    setMember(store, '456')
    await waitFor(() => sliceOf(store).ready && sliceOf(store).account === '456')
    expect(assignedIds(sliceOf(store))).toEqual([2])

    releaseRead(acct('123'))
    await flush()
    await flush()

    expect(sliceOf(store).account).toBe('456')
    expect(assignedIds(sliceOf(store))).toEqual([2])
    // The stale load never rewrote account 123's file.
    expect(
      (h.files[acct('123')] as any).workspaces[0].revisions[0].content
        .assignments['area-1'],
    ).toEqual([1])
    lifecycle.pluginWillUnload()
  })

  it('is inert in a detached (non-main) window', async () => {
    ;(window as any).isMain = false
    h.files[LEGACY_DATA_PATH] = { planner: { archive: {}, current: [[1]] } }
    const store = createHostStore('123')
    storeHolder.store = store

    const lifecycle = await importLifecycle()
    lifecycle.pluginDidLoad()
    await flush()

    expect(sliceOf(store).ready).toBe(false)
    expect(sliceOf(store).account).toBeNull()
    expect(Object.keys(h.files)).toEqual([LEGACY_DATA_PATH])
    lifecycle.pluginWillUnload()
  })

  it('does not add a second watcher on a duplicate load', async () => {
    h.files[acct('123')] = mkRoot()
    const store = createHostStore('123')
    storeHolder.store = store

    const lifecycle = await importLifecycle()
    lifecycle.pluginDidLoad()
    lifecycle.pluginDidLoad()
    await waitFor(() => sliceOf(store).ready)
    await flush()

    expect(h.reads.filter((p) => p === acct('123'))).toHaveLength(1)

    setMember(store, '456')
    await waitFor(() => sliceOf(store).ready && sliceOf(store).account === '456')
    expect(h.reads.filter((p) => p === acct('456'))).toHaveLength(1)
    lifecycle.pluginWillUnload()
  })

  it('reloads an existing account file without re-importing Ship Info', async () => {
    h.files[acct('123')] = mkRoot({
      revisions: [mkRevision('rev-1', [7], { kind: 'initial' })],
    })
    h.files[LEGACY_DATA_PATH] = { planner: { archive: {}, current: [[99]] } }
    const store = createHostStore('123')
    storeHolder.store = store

    const first = await importLifecycle()
    first.pluginDidLoad()
    await waitFor(() => sliceOf(store).ready)
    expect(assignedIds(sliceOf(store))).toEqual([7])
    first.pluginWillUnload()

    delete h.files[LEGACY_DATA_PATH]
    const second = await importLifecycle()
    second.pluginDidLoad()
    await waitFor(() => sliceOf(store).ready)
    expect(assignedIds(sliceOf(store))).toEqual([7])
    second.pluginWillUnload()
  })

  it('notifies a translated load error for an invalid account file', async () => {
    setI18n('ja-JP', navyJaJP)
    h.files[acct('123')] = { planner: { current: [null] } }
    const store = createHostStore('123')
    storeHolder.store = store
    const toast = (window as any).toast

    const lifecycle = await importLifecycle()
    lifecycle.pluginDidLoad()
    await waitFor(() => sliceOf(store).error !== null)

    expect(toast).toHaveBeenCalledTimes(1)
    expect(toast.mock.calls[0][0]).toBe(navyJaJP.loadError)
    expect(toast.mock.calls[0][0]).not.toBe('loadError')
    lifecycle.pluginWillUnload()
  })
})
