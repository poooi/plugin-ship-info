import i18next from 'i18next'
import { legacy_createStore } from 'redux'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import navyEnUS from '../packages/navy-staff/i18n/en-US.json'
import navyJaJP from '../packages/navy-staff/i18n/ja-JP.json'

// Exercises Navy Staff's exported lifecycle hooks: real migration, module
// reload, and a host-equivalent i18n (fallbackLng: false).

const h = vi.hoisted(() => ({
  files: {} as Record<string, unknown>,
  deferWrites: false,
  pending: [] as Array<() => void>,
}))

vi.mock('fs-extra', () => ({
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
    if (!Object.prototype.hasOwnProperty.call(h.files, filePath)) {
      const error = new Error(`ENOENT: ${filePath}`) as NodeJS.ErrnoException
      error.code = 'ENOENT'
      throw error
    }
    return structuredClone(h.files[filePath])
  },
}))

const settleWrites = () => {
  const pending = h.pending
  h.pending = []
  for (const settle of pending) settle()
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

import {
  DATA_PATH,
  LEGACY_DATA_PATH,
  PLUGIN_KEY,
} from '../packages/navy-staff/src/views/plugin-identity'
import { reducer as navyReducer } from '../packages/navy-staff/src/views/redux'
import { onAddShip } from '../packages/navy-staff/src/views/workspace/creators'

type Slice = {
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
  if (next === current) return state
  return { ...state, ext: { ...state.ext, [PLUGIN_KEY]: { _: next } } }
}

const createHostStore = () => legacy_createStore(hostReducer)
const sliceOf = (store: { getState: () => any }): Slice =>
  store.getState().ext[PLUGIN_KEY]._
const flush = () => new Promise((resolve) => setImmediate(resolve))
const waitFor = async (predicate: () => boolean, timeout = 1500) => {
  const start = Date.now()
  while (!predicate()) {
    if (Date.now() - start > timeout) throw new Error('waitFor timed out')
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setTimeout(resolve, 1))
  }
}

const assignedIds = (slice: Slice): number[] => {
  const workspace = slice.navy.workspaces.find(
    (w) => w.id === slice.navy.selectedWorkspaceId,
  )
  return Object.values(
    workspace.revisions[workspace.cursor].content.assignments,
  ).flat() as number[]
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
    h.deferWrites = false
    h.pending = []
    storeHolder.store = undefined
    ;(window as any).isMain = true
    ;(window as any).toast = vi.fn()
    ;(globalThis as any).config = { get: () => undefined, set: () => undefined }
    ;(window as any).config = (globalThis as any).config
    setI18n('en-US', navyEnUS)
  })

  it('migrates the legacy plan into a v2 root on load', async () => {
    h.files[LEGACY_DATA_PATH] = {
      bookmark: {},
      planner: { archive: { a: [[1]] }, current: [[2, 3]] },
      ready: true,
    }
    const store = createHostStore()
    storeHolder.store = store

    const lifecycle = await importLifecycle()
    lifecycle.pluginDidLoad()
    await waitFor(() => sliceOf(store).ready)

    expect(assignedIds(sliceOf(store))).toEqual([2, 3])
    expect(sliceOf(store).navy.legacyArchive).toEqual({ a: [[1]] })
    expect((h.files[DATA_PATH] as any).version).toBe(2)
    expect((h.files[DATA_PATH] as any).planner).toBeUndefined()
    lifecycle.pluginWillUnload()
  })

  it('does not reimport legacy on reload once the Navy file exists', async () => {
    h.files[LEGACY_DATA_PATH] = { planner: { archive: {}, current: [[7]] } }
    const store = createHostStore()
    storeHolder.store = store

    const first = await importLifecycle()
    first.pluginDidLoad()
    await waitFor(() => sliceOf(store).ready)
    first.pluginWillUnload()

    delete h.files[LEGACY_DATA_PATH]
    const second = await importLifecycle()
    second.pluginDidLoad()
    await waitFor(() => sliceOf(store).ready)
    expect(assignedIds(sliceOf(store))).toEqual([7])
    second.pluginWillUnload()
  })

  it('notifies a translated load error with no fallback to Ship Info', async () => {
    setI18n('ja-JP', navyJaJP)
    h.files[DATA_PATH] = { planner: { current: [null] } }
    const store = createHostStore()
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

  it('a fresh module reload waits for an old pending write before reading', async () => {
    h.files[LEGACY_DATA_PATH] = { planner: { archive: {}, current: [[1]] } }
    const store = createHostStore()
    storeHolder.store = store

    h.deferWrites = true
    const first = await importLifecycle()
    first.pluginDidLoad()
    await flush()
    await flush()
    expect(h.pending.length).toBe(1)

    first.pluginWillUnload()
    const second = await importLifecycle()
    second.pluginDidLoad()
    await flush()

    expect(h.files[DATA_PATH]).toBeUndefined()
    expect(h.pending.length).toBe(1)
    expect(sliceOf(store).ready).toBe(false)

    settleWrites()
    await waitFor(() => sliceOf(store).ready)
    expect(assignedIds(sliceOf(store))).toEqual([1])

    h.deferWrites = false
    const areaId =
      sliceOf(store).navy.workspaces[0].revisions[0].content.areas[0].id
    store.dispatch(
      onAddShip({
        areaId,
        now: '2026-01-01T00:00:00.000Z',
        record: {
          level: 1,
          masterId: 5,
          name: 'S5',
          observedAt: '2026-01-01T00:00:00.000Z',
          ownedId: 5,
          typeId: 2,
          typeLabel: 'DD',
        },
        shipId: 5,
      }),
    )
    await waitFor(() => assignedIds(sliceOf(store)).includes(5))
    second.pluginWillUnload()
  })

  it('is inert in a detached (non-main) window', async () => {
    ;(window as any).isMain = false
    h.files[LEGACY_DATA_PATH] = { planner: { archive: {}, current: [[1]] } }
    const store = createHostStore()
    storeHolder.store = store

    const lifecycle = await importLifecycle()
    lifecycle.pluginDidLoad()
    await flush()
    expect(sliceOf(store).ready).toBe(false)
    expect(h.files[DATA_PATH]).toBeUndefined()
    lifecycle.pluginWillUnload()
  })
})
