import i18next from 'i18next'
import { legacy_createStore } from 'redux'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import navyEnUS from '../packages/navy-staff/i18n/en-US.json'
import navyJaJP from '../packages/navy-staff/i18n/ja-JP.json'

// Exercises Navy Staff's exported lifecycle hooks: real migration, module
// reload, and a host-equivalent i18n (fallbackLng: false) so a leak from the
// Ship Info namespace would surface as a raw key.

const h = vi.hoisted(() => ({
  files: {} as Record<string, unknown>,
  // When set, writes stay pending until `settleWrites` is called.
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

type Slice = {
  error: string | null
  planner: { archive: object; current: number[][] }
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

  it('migrates the legacy plan and writes the Navy file on load', async () => {
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

    expect(sliceOf(store).planner.current).toEqual([[2, 3]])
    expect(h.files[DATA_PATH]).toEqual({
      planner: { archive: { a: [[1]] }, current: [[2, 3]] },
      ready: true,
      version: 1,
    })
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
    expect((h.files[DATA_PATH] as any).planner.current).toEqual([[7]])

    // Remove the legacy file; a reload must still use the Navy file.
    delete h.files[LEGACY_DATA_PATH]
    const second = await importLifecycle()
    second.pluginDidLoad()
    await waitFor(() => sliceOf(store).ready)
    expect(sliceOf(store).planner.current).toEqual([[7]])
    expect((h.files[DATA_PATH] as any).planner.current).toEqual([[7]])
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
    h.files[LEGACY_DATA_PATH] = {
      planner: { archive: {}, current: [[1]] },
    }
    const store = createHostStore()
    storeHolder.store = store

    // Generation 1 starts the migration write, which stays pending.
    h.deferWrites = true
    const first = await importLifecycle()
    first.pluginDidLoad()
    await flush()
    await flush()
    expect(h.pending.length).toBe(1)

    // Unload with the write still pending, then reload a fresh module graph.
    first.pluginWillUnload()
    const second = await importLifecycle()
    second.pluginDidLoad()
    await flush()

    // The new load must not read before the old write drains, and a single
    // shared writer means the write queue still holds exactly one task (two
    // independent writers would each queue one).
    expect(h.files[DATA_PATH]).toBeUndefined()
    expect(h.pending.length).toBe(1)
    expect(sliceOf(store).ready).toBe(false)

    settleWrites()
    await waitFor(() => sliceOf(store).ready)
    expect(sliceOf(store).planner.current).toEqual([[1]])
    expect((h.files[DATA_PATH] as any).planner.current).toEqual([[1]])

    // A later edit is saved (queue coordination, not just eventual hydration).
    h.deferWrites = false
    store.dispatch({
      areaIndex: 0,
      shipId: 5,
      type: '@@poi-plugin-navy-staff@dp-addShip',
    })
    await waitFor(
      () =>
        JSON.stringify(
          (h.files[DATA_PATH] as any)?.planner?.current,
        ) === JSON.stringify([[1, 5]]),
    )
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
