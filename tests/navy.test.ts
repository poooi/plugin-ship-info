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
import {
  onAddShip,
  onDisplaceShip,
  onDPInit,
  onRemoveShip,
} from '../packages/navy-staff/src/views/planner/redux'
import { reducer as navyReducer } from '../packages/navy-staff/src/views/redux'

type NavySlice = {
  error: string | null
  planner: { archive: object; current: number[][] }
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
const flush = () => new Promise((resolve) => setImmediate(resolve))
const waitFor = async (predicate: () => boolean, timeout = 1000) => {
  const start = Date.now()
  while (!predicate()) {
    if (Date.now() - start > timeout) {
      throw new Error('waitFor timed out')
    }
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setTimeout(resolve, 1))
  }
}

const enoent = () => Object.assign(new Error('ENOENT'), { code: 'ENOENT' })

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

const failingWriter = () => {
  const writes: Array<{ data: any; path: string }> = []
  const writer: PersistenceWriter = {
    write: (filePath, data, _options, callback) => {
      writes.push({ data, path: filePath })
      callback?.(new Error('EACCES: permission denied'))
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

describe('Navy planner reducer', () => {
  const T = (name: string) => `@@${PLUGIN_KEY}@${name}`
  const init = (current: number[][]) =>
    navyReducer(undefined, {
      data: { planner: { archive: { old: [[9]] }, current } },
      type: T('init'),
    })

  it('adds, removes and displaces ships between areas', () => {
    let state = init([[], []])
    state = navyReducer(state, onAddShip({ areaIndex: 0, shipId: 10 }))
    expect(state.planner.current).toEqual([[10], []])
    state = navyReducer(
      state,
      onDisplaceShip({ fromAreaIndex: 0, shipId: 10, toAreaIndex: 1 }),
    )
    expect(state.planner.current).toEqual([[], [10]])
    state = navyReducer(state, onRemoveShip({ areaIndex: 1, shipId: 10 }))
    expect(state.planner.current).toEqual([[], []])
  })

  it('grows to the map area count but never truncates', () => {
    let state = init([[1]])
    state = navyReducer(state, onDPInit({ color: [], mapname: ['E1', 'E2', 'E3'] }))
    expect(state.planner.current).toEqual([[1], [], []])

    // Fewer areas (or none) must keep retained assignments.
    state = navyReducer(state, onDPInit({ color: [], mapname: ['E1'] }))
    expect(state.planner.current).toEqual([[1], [], []])
    state = navyReducer(state, onDPInit({ color: [], mapname: [] }))
    expect(state.planner.current).toEqual([[1], [], []])
  })

  it('handles out-of-range tags by growing instead of crashing', () => {
    let state = init([[1]])
    state = navyReducer(state, onAddShip({ areaIndex: 5, shipId: 42 }))
    expect(state.planner.current).toHaveLength(6)
    expect(state.planner.current[5]).toEqual([42])

    // Removing/displacing from an out-of-range area is a no-op, not a crash.
    expect(
      navyReducer(state, onRemoveShip({ areaIndex: 99, shipId: 1 })),
    ).toBe(state)
    expect(
      navyReducer(
        state,
        onDisplaceShip({ fromAreaIndex: 99, shipId: 1, toAreaIndex: 0 }),
      ),
    ).toBe(state)
  })

  it('ignores Ship Info actions and exposes its own prefix', () => {
    const state = init([[1]])
    expect(
      navyReducer(state, { isExtend: false, type: '@@poi-plugin-ship-info@extend' }),
    ).toBe(state)
    expect(T('ready')).toBe('@@poi-plugin-navy-staff@ready')
  })
})

describe('Navy persistence migration', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>
  let config: Record<string, any>

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
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
      legacyDataPath: LEGACY,
      onError: opts.onError,
      readFile: readFrom(files),
      writer: opts.writer ?? writer,
    })
    persistence.start(store)
    return { persistence, writes }
  }

  it('upgrades a v0 Navy file to v1, preserving the plan, before ready', async () => {
    const store = createStore()
    const v0 = { planner: { archive: { a: [[1]] }, current: [[2]] } }
    const readFile = readFrom({ [NAVY]: v0 })
    // Deferred writer: the upgrade write must settle before ready.
    const writes: Array<{ callback?: () => void; data: any }> = []
    const writer: PersistenceWriter = {
      write: (_filePath, data, _options, callback) => {
        writes.push({ callback, data })
      },
    }
    const persistence = createPersistence({
      dataPath: NAVY,
      isMain: true,
      legacyDataPath: LEGACY,
      readFile,
      writer,
    })
    persistence.start(store)

    await waitFor(() => writes.length === 1)
    expect(sliceOf(store).ready).toBe(false)
    expect(writes[0].data).toEqual({ ...v0, version: 1 })

    writes[0].callback?.()
    await waitFor(() => sliceOf(store).ready)
    expect(sliceOf(store).planner).toEqual({
      archive: { a: [[1]] },
      current: [[2]],
    })
    persistence.stop()
  })

  it('does not rewrite a current v1 Navy file', async () => {
    const store = createStore()
    const readFile = readFrom({
      [NAVY]: { planner: { archive: {}, current: [[1]] }, version: 1 },
    })
    const { writer, writes } = recordingWriter()
    const persistence = createPersistence({
      dataPath: NAVY,
      isMain: true,
      legacyDataPath: LEGACY,
      readFile,
      writer,
    })
    persistence.start(store)

    await waitFor(() => sliceOf(store).ready)
    expect(writes).toHaveLength(0)
    persistence.stop()
  })

  it('rejects a malformed or unsupported Navy version without writing', async () => {
    for (const bad of [
      { planner: { archive: {}, current: [] }, version: '1' },
      { planner: { archive: {}, current: [] }, version: 2 },
      { planner: { archive: {}, current: [] }, version: -1 },
    ]) {
      const store = createStore()
      const readFile = readFrom({ [NAVY]: bad })
      const onError = vi.fn()
      const { writer, writes } = recordingWriter()
      const persistence = createPersistence({
        dataPath: NAVY,
        isMain: true,
        legacyDataPath: LEGACY,
        onError,
        readFile,
        writer,
      })
      persistence.start(store)
      // eslint-disable-next-line no-await-in-loop
      await waitFor(() => sliceOf(store).error !== null)
      expect(sliceOf(store).ready).toBe(false)
      expect(onError).toHaveBeenCalledTimes(1)
      expect(writes).toHaveLength(0)
    }
  })

  it('imports unversioned and v1 legacy sources, rejecting a future version', async () => {
    for (const legacyVersion of [undefined, 1]) {
      const store = createStore()
      const { persistence, writes } = start(store, {
        [LEGACY]: {
          planner: { archive: {}, current: [[4]] },
          ...(legacyVersion === undefined ? {} : { version: legacyVersion }),
        },
      })
      // eslint-disable-next-line no-await-in-loop
      await waitFor(() => sliceOf(store).ready)
      expect(sliceOf(store).planner.current).toEqual([[4]])
      expect(writes[0].data.version).toBe(1)
      persistence.stop()
    }

    const store = createStore()
    const onError = vi.fn()
    const { writer, writes } = recordingWriter()
    const persistence = createPersistence({
      dataPath: NAVY,
      isMain: true,
      legacyDataPath: LEGACY,
      onError,
      readFile: readFrom({
        [LEGACY]: { planner: { archive: {}, current: [[4]] }, version: 2 },
      }),
      writer,
    })
    persistence.start(store)
    await waitFor(() => sliceOf(store).error !== null)
    expect(sliceOf(store).ready).toBe(false)
    expect(writes).toHaveLength(0)
  })

  it('uses an existing Navy file as authoritative (even an empty plan)', async () => {
    const store = createStore()
    const readFile = readFrom({
      [NAVY]: { planner: { archive: {}, current: [] }, version: 1 },
      [LEGACY]: { planner: { archive: {}, current: [[7]] } },
    })
    const { writer } = recordingWriter()
    const persistence = createPersistence({
      dataPath: NAVY,
      isMain: true,
      legacyDataPath: LEGACY,
      readFile,
      writer,
    })
    persistence.start(store)

    await waitFor(() => sliceOf(store).ready)
    expect(sliceOf(store).planner.current).toEqual([])
    expect(readFile).toHaveBeenCalledTimes(1)
    expect(readFile).toHaveBeenCalledWith(NAVY)
  })

  it('imports planner.current/archive from legacy when the Navy file is missing', async () => {
    const store = createStore()
    const files: Record<string, unknown> = {
      [LEGACY]: {
        bookmark: { ignored: true },
        planner: { archive: { a: [[1]] }, current: [[2, 3]] },
        ready: true,
      },
    }
    const { persistence, writes } = start(store, files)

    await waitFor(() => sliceOf(store).ready)
    expect(sliceOf(store).planner).toEqual({
      archive: { a: [[1]] },
      current: [[2, 3]],
    })
    // Initial file written before persistence is enabled.
    expect(writes[0].path).toBe(NAVY)
    expect(writes[0].data).toEqual({
      planner: { archive: { a: [[1]] }, current: [[2, 3]] },
      ready: true,
      version: 1,
    })
    // Legacy source is never written to.
    expect(writes.every((w) => w.path === NAVY)).toBe(true)
    persistence.stop()
  })

  it('creates an empty Navy plan when both files are missing', async () => {
    const store = createStore()
    const { persistence, writes } = start(store, {})
    await waitFor(() => sliceOf(store).ready)
    expect(sliceOf(store).planner).toEqual({ archive: {}, current: [] })
    expect(writes[0].data.planner).toEqual({ archive: {}, current: [] })
    expect(writes[0].data.version).toBe(1)
    persistence.stop()
  })

  it('surfaces an invalid Navy file and never falls back to legacy', async () => {
    const store = createStore()
    const readFile = readFrom({
      [NAVY]: { planner: { current: [null] } },
      [LEGACY]: { planner: { current: [[7]] } },
    })
    const { writer } = recordingWriter()
    const onError = vi.fn()
    const persistence = createPersistence({
      dataPath: NAVY,
      isMain: true,
      legacyDataPath: LEGACY,
      onError,
      readFile,
      writer,
    })
    persistence.start(store)

    await waitFor(() => sliceOf(store).error !== null)
    expect(sliceOf(store).ready).toBe(false)
    expect(onError).toHaveBeenCalledTimes(1)
    expect(readFile).toHaveBeenCalledTimes(1)
  })

  it('surfaces legacy read errors and writes nothing', async () => {
    const store = createStore()
    const readFile = vi.fn(async (filePath: string) => {
      if (filePath === NAVY) throw enoent()
      throw Object.assign(new Error('EACCES'), { code: 'EACCES' })
    })
    const { writer, writes } = recordingWriter()
    const onError = vi.fn()
    const persistence = createPersistence({
      dataPath: NAVY,
      isMain: true,
      legacyDataPath: LEGACY,
      onError,
      readFile,
      writer,
    })
    persistence.start(store)

    await waitFor(() => sliceOf(store).error !== null)
    expect(onError).toHaveBeenCalledTimes(1)
    expect(writes).toHaveLength(0)
  })

  it('surfaces an invalid legacy planner and writes nothing', async () => {
    const store = createStore()
    const { persistence, writes } = start(store, {
      [LEGACY]: { planner: { current: [['bad']] } },
    })
    await waitFor(() => sliceOf(store).error !== null)
    expect(writes).toHaveLength(0)
    persistence.stop()
  })

  it('disables saving and leaves the legacy file untouched when the initial write fails', async () => {
    const store = createStore()
    const readFile = readFrom({
      [LEGACY]: { planner: { archive: {}, current: [[1]] } },
    })
    const { writer, writes } = failingWriter()
    const persistence = createPersistence({
      dataPath: NAVY,
      isMain: true,
      legacyDataPath: LEGACY,
      readFile,
      writer,
    })
    persistence.start(store)

    await waitFor(() => sliceOf(store).error !== null)
    expect(sliceOf(store).ready).toBe(false)
    expect(writes).toHaveLength(1)
    expect(writes[0].path).toBe(NAVY)

    // Saving stays disabled: a later change must not attempt another write.
    store.dispatch({ type: ACTIONS.loadStart })
    await flush()
    expect(writes).toHaveLength(1)
  })

  it('does not reimport legacy on a later reload once the Navy file exists', async () => {
    const store = createStore()
    const files: Record<string, unknown> = {
      [LEGACY]: { planner: { archive: {}, current: [[1]] } },
    }
    const readFile = readFrom(files)
    const { writer, writes } = recordingWriter()
    const persistence = createPersistence({
      dataPath: NAVY,
      isMain: true,
      legacyDataPath: LEGACY,
      readFile,
      writer,
    })
    persistence.start(store)
    await waitFor(() => sliceOf(store).ready)
    persistence.stop()

    // The migration write committed the Navy file (recordingWriter semantics).
    files[NAVY] = {
      planner: { archive: {}, current: [[1]] },
      ready: true,
      version: 1,
    }
    readFile.mockClear()
    writes.length = 0

    persistence.start(store)
    await waitFor(() => sliceOf(store).ready)
    expect(readFile).toHaveBeenCalledTimes(1)
    expect(readFile).toHaveBeenCalledWith(NAVY)
    expect(writes).toHaveLength(0)
    persistence.stop()
  })

  it('imports legacy displayFleetName only when unset, preserving explicit values', async () => {
    config[LEGACY_DISPLAY_FLEET_NAME_CONFIG] = true
    const storeA = createStore()
    const { persistence: a } = start(storeA, {
      [LEGACY]: { planner: { archive: {}, current: [] } },
    })
    await waitFor(() => sliceOf(storeA).ready)
    expect(config[DISPLAY_FLEET_NAME_CONFIG]).toBe(true)
    a.stop()

    // Explicit false on the new path is retained.
    config = { [DISPLAY_FLEET_NAME_CONFIG]: false, [LEGACY_DISPLAY_FLEET_NAME_CONFIG]: true }
    const storeB = createStore()
    const { persistence: b } = start(storeB, {
      [LEGACY]: { planner: { archive: {}, current: [] } },
    })
    await waitFor(() => sliceOf(storeB).ready)
    expect(config[DISPLAY_FLEET_NAME_CONFIG]).toBe(false)
    b.stop()
  })

  it('a delayed legacy read cannot overwrite a newer import or edit', async () => {
    const store = createStore()
    const files: Record<string, unknown> = {}
    let resolveLegacy!: (value: unknown) => void
    const readFile = vi.fn((filePath: string) => {
      if (filePath === NAVY) {
        return Object.prototype.hasOwnProperty.call(files, NAVY)
          ? Promise.resolve(structuredClone(files[NAVY]))
          : Promise.reject(enoent())
      }
      // The first (now-superseded) legacy read stays pending until resolved.
      return new Promise((resolve) => {
        resolveLegacy = resolve
      })
    })
    const { writer, writes } = recordingWriter()
    const persistence = createPersistence({
      dataPath: NAVY,
      isMain: true,
      legacyDataPath: LEGACY,
      readFile,
      writer,
    })

    // Generation 1: Navy file missing, legacy read hangs.
    persistence.start(store)
    await flush()
    persistence.stop()

    // A newer import writes the authoritative Navy file.
    files[NAVY] = {
      planner: { archive: {}, current: [[9]] },
      ready: true,
      version: 1,
    }

    // Generation 2: reads the authoritative file, becomes ready.
    persistence.start(store)
    await waitFor(() => sliceOf(store).ready)
    expect(sliceOf(store).planner.current).toEqual([[9]])

    // A new edit saves the newer plan.
    store.dispatch(onAddShip({ areaIndex: 0, shipId: 1 }))
    await waitFor(() => writes.length === 1)
    expect(writes[0].data.planner.current).toEqual([[9, 1]])

    // The delayed legacy read from generation 1 finally resolves.
    resolveLegacy({ planner: { archive: {}, current: [[1]] } })
    await flush()

    // It must not write, import config, or replace the newer state.
    expect(writes).toHaveLength(1)
    expect(sliceOf(store).planner.current).toEqual([[9, 1]])
    expect(config[DISPLAY_FLEET_NAME_CONFIG]).toBeUndefined()
    persistence.stop()
  })

  it('resumes the legacy display option import after an unload during the initial write', async () => {
    const store = createStore()
    config[LEGACY_DISPLAY_FLEET_NAME_CONFIG] = true
    const files: Record<string, unknown> = {
      [LEGACY]: { planner: { archive: {}, current: [[5]] } },
    }
    let resolveWrite!: () => void
    const writer: PersistenceWriter = {
      write: (filePath, data, _options, callback) => {
        // Commit the file, but defer the callback (as a slow disk would).
        files[filePath] = structuredClone(data)
        resolveWrite = () => callback?.()
      },
    }
    const persistence = createPersistence({
      dataPath: NAVY,
      isMain: true,
      legacyDataPath: LEGACY,
      readFile: readFrom(files),
      writer,
    })

    // Unload while the initial migration write is still pending.
    persistence.start(store)
    await flush()
    persistence.stop()

    // The write completes after unload: no config import for the stale run.
    resolveWrite()
    await flush()
    expect(config[DISPLAY_FLEET_NAME_CONFIG]).toBeUndefined()
    expect(files[NAVY]).toBeTruthy()

    // A fresh load sees the authoritative file and imports the option.
    const readFile = readFrom(files)
    const second = createPersistence({
      dataPath: NAVY,
      isMain: true,
      legacyDataPath: LEGACY,
      readFile,
      writer,
    })
    second.start(store)
    await waitFor(() => sliceOf(store).ready)
    expect(sliceOf(store).planner.current).toEqual([[5]])
    expect(config[DISPLAY_FLEET_NAME_CONFIG]).toBe(true)
    second.stop()
  })

  it('surfaces a corrupt Navy file as an error', async () => {
    const store = createStore()
    const readFile = vi.fn(async () => {
      throw new SyntaxError('Unexpected token')
    })
    const onError = vi.fn()
    const persistence = createPersistence({
      dataPath: NAVY,
      isMain: true,
      legacyDataPath: LEGACY,
      onError,
      readFile,
    })
    persistence.start(store)
    await waitFor(() => sliceOf(store).error !== null)
    expect(onError).toHaveBeenCalledTimes(1)
  })

  it('surfaces an access-denied Navy read as an error', async () => {
    const store = createStore()
    const readFile = vi.fn(async () => {
      throw Object.assign(new Error('EACCES'), { code: 'EACCES' })
    })
    const onError = vi.fn()
    const persistence = createPersistence({
      dataPath: NAVY,
      isMain: true,
      legacyDataPath: LEGACY,
      onError,
      readFile,
    })
    persistence.start(store)
    await waitFor(() => sliceOf(store).error !== null)
    expect(onError).toHaveBeenCalledTimes(1)
  })
})
