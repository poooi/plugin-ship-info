import i18next from 'i18next'
import { legacy_createStore } from 'redux'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import enUS from '../packages/ship-info/i18n/en-US.json'
import jaJP from '../packages/ship-info/i18n/ja-JP.json'

// These tests exercise the real exported lifecycle hooks across a simulated
// plugin reload (poi clears the module cache), with a host-equivalent i18n
// instance (fallbackLng: false) and a real Redux store shaped like poi's
// extension state.

const h = vi.hoisted(() => ({
  active: 0,
  concurrent: 0,
  files: {} as Record<string, unknown>,
  readCalls: [] as string[],
  writeCalls: [] as Array<{
    args: any[]
    promise: Promise<any>
    reject: (e: any) => void
    resolve: (v?: any) => void
    settled: boolean
  }>,
}))

vi.mock('fs-extra', () => ({
  outputJson: (...args: any[]) => {
    const call: any = { args, settled: false }
    h.active += 1
    if (h.active > 1) {
      h.concurrent += 1
    }
    const settle = () => {
      h.active -= 1
    }
    call.promise = new Promise((res, rej) => {
      call.resolve = (value?: any) => {
        call.settled = true
        // Committing the payload on resolve models a real, completed write so a
        // reload actually reads what the previous lifecycle saved.
        h.files[call.args[0]] = structuredClone(call.args[1])
        settle()
        res(value)
      }
      call.reject = (error: any) => {
        call.settled = true
        settle()
        rej(error)
      }
    })
    h.writeCalls.push(call)
    return call.promise
  },
  readJson: async (filePath: string) => {
    h.readCalls.push(filePath)
    if (!(filePath in h.files)) {
      const error = new Error(`ENOENT: ${filePath}`) as NodeJS.ErrnoException
      error.code = 'ENOENT'
      throw error
    }
    return structuredClone(h.files[filePath])
  },
}))

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

import { DATA_PATH, PLUGIN_KEY } from '../packages/ship-info/src/views/plugin-identity'
import { onAddShip } from '../packages/ship-info/src/views/planner/redux'
import { reducer as pluginReducer } from '../packages/ship-info/src/views/redux'

type Slice = {
  error: string | null
  planner: { archive: object; current: number[][] }
  ready: boolean
}

const hostReducer = (state: any = { ext: {} }, action: any) => {
  const current: any = state.ext?.[PLUGIN_KEY]?._
  const next = pluginReducer(current, action)
  if (next === current) {
    return state
  }
  return { ...state, ext: { ...state.ext, [PLUGIN_KEY]: { _: next } } }
}

const createHostStore = () => legacy_createStore(hostReducer)

const sliceOf = (store: { getState: () => any }): Slice =>
  store.getState().ext[PLUGIN_KEY]._

const savedPlanner = (): number[][] =>
  (h.files[DATA_PATH] as any).planner.current

const flush = () => new Promise((resolve) => setImmediate(resolve))

const waitFor = async (predicate: () => boolean, timeout = 1500) => {
  const start = Date.now()
  while (!predicate()) {
    if (Date.now() - start > timeout) {
      throw new Error('waitFor timed out')
    }
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setTimeout(resolve, 1))
  }
}

const WRITER_SYMBOL = Symbol.for('poi-plugin-ship-info@file-writer')

const setI18n = (lng: string, resources: Record<string, unknown>) => {
  const instance = i18next.createInstance()
  instance.init({
    defaultNS: 'poi-plugin-ship-info',
    fallbackLng: false,
    initAsync: false,
    lng,
    ns: ['poi-plugin-ship-info', 'resources'],
    resources: { [lng]: { 'poi-plugin-ship-info': resources } },
  })
  i18nHolder.instance = instance
}

const importLifecycle = async () => {
  vi.resetModules()
  return import('../packages/ship-info/src/views/lifecycle')
}

describe('plugin lifecycle hooks', () => {
  beforeEach(() => {
    h.active = 0
    h.concurrent = 0
    h.files = {}
    h.readCalls = []
    h.writeCalls = []
    storeHolder.store = undefined
    delete (window as any)[WRITER_SYMBOL]
    ;(window as any).isMain = true
    ;(window as any).toast = vi.fn()
    ;(globalThis as any).config = { get: () => undefined, set: () => undefined }
    setI18n('en-US', enUS)
  })

  it('shares one serialized writer across module reloads so the latest edit wins', async () => {
    h.files[DATA_PATH] = {
      planner: { archive: {}, current: [[1]] },
      ready: true,
      ui: {},
    }
    const firstStore = createHostStore()
    storeHolder.store = firstStore

    const first = await importLifecycle()
    first.pluginDidLoad()
    await waitFor(() => sliceOf(firstStore).ready)

    // Two old planner edits queue two saves. The second stays in flight when the
    // plugin unloads.
    firstStore.dispatch(onAddShip({ areaIndex: 0, shipId: 2 }))
    firstStore.dispatch(onAddShip({ areaIndex: 0, shipId: 3 }))
    expect(h.writeCalls).toHaveLength(1)

    h.writeCalls[0].resolve() // commits planner [[1, 2]]
    await waitFor(() => h.writeCalls.length === 2)
    expect(h.writeCalls[0].settled).toBe(true)
    expect(h.writeCalls[1].settled).toBe(false)
    expect(savedPlanner()).toEqual([[1, 2]])

    first.pluginWillUnload()

    // The host removes and re-registers the reducer, so the reload runs against
    // a fresh store.
    const secondStore = createHostStore()
    storeHolder.store = secondStore

    const second = await importLifecycle()
    second.pluginDidLoad()
    await flush()

    // The fresh module graph must reuse the host writer, so the new load waits
    // for the still-pending old save before reading.
    expect(h.readCalls).toHaveLength(1)

    h.writeCalls[1].resolve() // commits the latest old planner edit [[1, 2, 3]]
    await waitFor(() => h.readCalls.length === 2)
    await waitFor(() => sliceOf(secondStore).ready)

    // The new store hydrated the latest old planner edit, not the stale launch
    // state.
    expect(sliceOf(secondStore).planner.current).toEqual([[1, 2, 3]])

    // A later new edit is serialized after the old save (never concurrent) and
    // survives as the final file content.
    secondStore.dispatch(onAddShip({ areaIndex: 0, shipId: 4 }))
    await waitFor(() => h.writeCalls.length === 3)
    expect(h.writeCalls[2].settled).toBe(false)
    expect(savedPlanner()).toEqual([[1, 2, 3]])

    h.writeCalls[2].resolve()
    await flush()
    expect(savedPlanner()).toEqual([[1, 2, 3, 4]])
    expect(h.concurrent).toBe(0)

    second.pluginWillUnload()
  })

  it('notifies a translated load error with no locale fallback', async () => {
    setI18n('ja-JP', jaJP)
    h.files[DATA_PATH] = { planner: { current: [null] } }
    const store = createHostStore()
    storeHolder.store = store
    const toast = (window as any).toast

    const lifecycle = await importLifecycle()
    lifecycle.pluginDidLoad()
    await waitFor(() => sliceOf(store).error !== null)

    expect(toast).toHaveBeenCalledTimes(1)
    const [content, options] = toast.mock.calls[0]
    expect(content).toBe(jaJP.loadError)
    expect(content).not.toBe('loadError')
    expect(options).toEqual({ type: 'error' })

    lifecycle.pluginWillUnload()
  })

  it('notifies a translated save error with no locale fallback', async () => {
    setI18n('ja-JP', jaJP)
    h.files[DATA_PATH] = { planner: { archive: {}, current: [[1]] } }
    const store = createHostStore()
    storeHolder.store = store
    const toast = (window as any).toast

    const lifecycle = await importLifecycle()
    lifecycle.pluginDidLoad()
    await waitFor(() => sliceOf(store).ready)

    store.dispatch({ isExtend: false, type: `@@${PLUGIN_KEY}@extend` })
    await waitFor(() => h.writeCalls.length === 1)
    h.writeCalls[0].reject(new Error('EACCES: permission denied'))
    await waitFor(() => toast.mock.calls.length > 0)

    expect(toast.mock.calls[0][0]).toBe(jaJP.saveError)
    lifecycle.pluginWillUnload()
  })
})
