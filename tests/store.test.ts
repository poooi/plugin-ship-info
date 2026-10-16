import fs from 'fs'
import path from 'path'
import { legacy_createStore } from 'redux'
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// The host exposes a plugin's state at `state.ext[pluginKey]._`
// (poi's extensionSelectorFactory). Model that exact shape so a shallow mock
// cannot hide a wrong slice lookup.
vi.mock('views/utils/selectors', () => ({
  extensionSelectorFactory: (key: string) => (state: any) =>
    state?.ext?.[key]?._ ?? {},
}))

import type { PersistenceWriter } from '../packages/ship-info/src/views/persistence'
import { createPersistence } from '../packages/ship-info/src/views/persistence'
import { ACTIONS, PLUGIN_KEY } from '../packages/ship-info/src/views/plugin-identity'
import { onAddShip } from '../packages/ship-info/src/views/planner/redux'
import { reducer as pluginReducer } from '../packages/ship-info/src/views/redux'

type PluginSlice = {
  bookmark: Record<string, any>
  error: string | null
  planner: { archive: object; current: number[][] }
  ready: boolean
  ui: Record<string, any>
}

const rootReducer = (state: any = { ext: {} }, action: any) => {
  const current: any = state.ext?.[PLUGIN_KEY]?._
  const next = pluginReducer(current, action)
  if (next === current) {
    return state
  }
  return { ...state, ext: { ...state.ext, [PLUGIN_KEY]: { _: next } } }
}

const createStore = () => legacy_createStore(rootReducer)

const sliceOf = (store: { getState: () => any }): PluginSlice =>
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
const eacces = () => Object.assign(new Error('EACCES'), { code: 'EACCES' })

const VALID = {
  bookmark: { alpha: { name: 'alpha' } },
  planner: { archive: { old: [[9]] }, current: [[1, 2]] },
  ready: true,
  ui: { isExtend: false },
}

// A UI-state change that always produces a new plugin slice without needing a
// populated planner (the reducer requires initialized areas for ship edits).
const change = () => ({
  isExtend: false,
  type: `@@${PLUGIN_KEY}@extend`,
})

const createRecordingWriter = () => {
  const writes: Array<{
    callback?: (error?: unknown) => void
    data: any
    path: string
  }> = []
  const writer: PersistenceWriter = {
    write: (filePath, data, _options, callback) => {
      writes.push({ callback, data, path: filePath })
    },
  }
  return { writer, writes }
}

const createGateWriter = () => {
  const writes: Array<{
    callback?: (error?: unknown) => void
    data: any
    path: string
  }> = []
  const outstanding: Array<{ promise: Promise<void>; resolve: () => void }> = []
  const writer: PersistenceWriter = {
    drain: async () => {
      await Promise.all(outstanding.map((gate) => gate.promise))
    },
    write: (filePath, data, _options, callback) => {
      let resolve!: () => void
      const promise = new Promise<void>((res) => {
        resolve = res
      })
      outstanding.push({ promise, resolve })
      writes.push({ callback, data, path: filePath })
    },
  }
  return { writer, writes, outstanding }
}

describe('persistence load', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    errorSpy.mockRestore()
  })

  it('loads a valid file, dispatches init then ready, and does not write', async () => {
    const store = createStore()
    const readFile = vi.fn(async () => structuredClone(VALID))
    const { writer, writes } = createRecordingWriter()
    const persistence = createPersistence({ isMain: true, readFile, writer })

    persistence.start(store)

    await waitFor(() => sliceOf(store).ready)
    const slice = sliceOf(store)
    expect(slice.planner.current).toEqual([[1, 2]])
    expect(slice.planner.archive).toEqual({ old: [[9]] })
    expect(slice.bookmark.alpha).toEqual({ name: 'alpha' })
    expect(slice.error).toBeNull()
    expect(writes).toHaveLength(0)
    expect(errorSpy).not.toHaveBeenCalled()
  })

  it('initializes safely on ENOENT and enables saving', async () => {
    const store = createStore()
    const readFile = vi.fn(async () => {
      throw enoent()
    })
    const { writer } = createRecordingWriter()
    const persistence = createPersistence({ isMain: true, readFile, writer })

    persistence.start(store)

    await waitFor(() => sliceOf(store).ready)
    expect(sliceOf(store).error).toBeNull()
    expect(errorSpy).not.toHaveBeenCalled()
  })

  it('surfaces corrupt JSON and disables saving', async () => {
    const store = createStore()
    const readFile = vi.fn(async () => {
      throw new SyntaxError('Unexpected token n in JSON')
    })
    const onError = vi.fn()
    const { writer, writes } = createRecordingWriter()
    const persistence = createPersistence({
      isMain: true,
      onError,
      readFile,
      writer,
    })

    persistence.start(store)

    await waitFor(() => sliceOf(store).error !== null)
    expect(sliceOf(store).ready).toBe(false)
    expect(onError).toHaveBeenCalledTimes(1)
    expect(errorSpy).toHaveBeenCalled()

    store.dispatch(change())
    await flush()
    expect(writes).toHaveLength(0)
  })

  it('rejects an invalid persisted shape and disables saving', async () => {
    for (const bad of [
      { planner: { current: [null] } },
      { planner: { current: [['bad']] } },
      { planner: { current: 'nope' } },
      { planner: [] },
      { bookmark: 'nope' },
      { ui: 42 },
      'not an object',
    ]) {
      const store = createStore()
      const readFile = vi.fn(async () => bad)
      const onError = vi.fn()
      const { writer, writes } = createRecordingWriter()
      const persistence = createPersistence({
        isMain: true,
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

  it('surfaces an access-denied read as a load error', async () => {
    const store = createStore()
    const readFile = vi.fn(async () => {
      throw eacces()
    })
    const onError = vi.fn()
    const persistence = createPersistence({ isMain: true, onError, readFile })

    persistence.start(store)

    await waitFor(() => sliceOf(store).error !== null)
    expect(sliceOf(store).ready).toBe(false)
    expect(onError).toHaveBeenCalledTimes(1)
  })

  it('never writes before a successful init', async () => {
    const store = createStore()
    let resolveRead!: (value: unknown) => void
    const readFile = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveRead = resolve
        }),
    )
    const { writer, writes } = createRecordingWriter()
    const persistence = createPersistence({ isMain: true, readFile, writer })

    persistence.start(store)
    store.dispatch(change())
    await flush()
    expect(writes).toHaveLength(0)

    resolveRead(structuredClone(VALID))
    await waitFor(() => sliceOf(store).ready)

    store.dispatch(change())
    await flush()
    expect(writes).toHaveLength(1)
  })

  it('does not dispatch a stale load after stop (pending load cancellation)', async () => {
    const store = createStore()
    let resolveRead!: (value: unknown) => void
    const readFile = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveRead = resolve
        }),
    )
    const { writer, writes } = createRecordingWriter()
    const persistence = createPersistence({ isMain: true, readFile, writer })

    persistence.start(store)
    await flush()
    expect(readFile).toHaveBeenCalledTimes(1)

    persistence.stop()
    resolveRead(structuredClone(VALID))
    await flush()

    expect(sliceOf(store).ready).toBe(false)
    expect(sliceOf(store).planner.current).toEqual([])
    expect(writes).toHaveLength(0)
  })

  it('loads fresh data on a restart after unload', async () => {
    const store = createStore()
    const readFile = vi
      .fn()
      .mockResolvedValueOnce({ planner: { current: [[1]] } })
      .mockResolvedValueOnce({ planner: { current: [[2, 3]] } })
    const { writer } = createRecordingWriter()
    const persistence = createPersistence({ isMain: true, readFile, writer })

    persistence.start(store)
    await waitFor(() => sliceOf(store).ready)
    expect(sliceOf(store).planner.current).toEqual([[1]])

    persistence.stop()
    persistence.start(store)
    await waitFor(() => sliceOf(store).planner.current[0]?.[0] === 2)
    expect(sliceOf(store).planner.current).toEqual([[2, 3]])
    expect(readFile).toHaveBeenCalledTimes(2)
  })

  it('clears a previous load error on a successful restart', async () => {
    const store = createStore()
    const readFile = vi
      .fn()
      .mockRejectedValueOnce(new SyntaxError('bad json'))
      .mockResolvedValueOnce({ planner: { current: [[4]] } })
    const persistence = createPersistence({ isMain: true, readFile })

    persistence.start(store)
    await waitFor(() => sliceOf(store).error !== null)

    persistence.stop()
    persistence.start(store)
    await waitFor(() => sliceOf(store).ready)
    expect(sliceOf(store).error).toBeNull()
    expect(sliceOf(store).planner.current).toEqual([[4]])
  })

  it('is a read-only consumer in standalone (non-main) windows', async () => {
    const store = createStore()
    const readFile = vi.fn()
    const { writer, writes } = createRecordingWriter()
    const persistence = createPersistence({ isMain: false, readFile, writer })

    persistence.start(store)
    await flush()
    expect(readFile).not.toHaveBeenCalled()

    store.dispatch(change())
    await flush()
    expect(writes).toHaveLength(0)
  })

  it('reports write failures through onWriteError, not onError', async () => {
    const store = createStore()
    const readFile = vi.fn(async () => {
      throw enoent()
    })
    const onError = vi.fn()
    const onWriteError = vi.fn()
    const writer: PersistenceWriter = {
      write: (_filePath, _data, _options, callback) => {
        callback?.(new Error('EACCES: permission denied'))
      },
    }
    const persistence = createPersistence({
      isMain: true,
      onError,
      onWriteError,
      readFile,
      writer,
    })

    persistence.start(store)
    await waitFor(() => sliceOf(store).ready)
    store.dispatch(change())
    await flush()

    expect(onWriteError).toHaveBeenCalledTimes(1)
    expect(onWriteError.mock.calls[0][0].reason).toBe('write')
    expect(onError).not.toHaveBeenCalled()
  })

  it('waits for a pending save before reloading (unload/reload race)', async () => {
    const store = createStore()
    const { writer, writes, outstanding } = createGateWriter()
    const reads: string[] = []
    const readFile = vi.fn(async () => {
      reads.push('read')
      return { planner: { current: [[1]] } }
    })
    const persistence = createPersistence({ isMain: true, readFile, writer })

    persistence.start(store)
    await waitFor(() => sliceOf(store).ready)
    expect(reads).toHaveLength(1)

    // A user edit queues a save that has not settled yet.
    store.dispatch(onAddShip({ areaIndex: 0, shipId: 7 }))
    expect(writes).toHaveLength(1)
    expect(outstanding).toHaveLength(1)

    // Unload then reload while that save is still in flight.
    persistence.stop()
    persistence.start(store)
    await flush()

    // The reload must not read until the queued save has drained.
    expect(reads).toHaveLength(1)

    outstanding[0].resolve()
    await waitFor(() => reads.length === 2)
    expect(sliceOf(store).ready).toBe(true)
    // The queued save was kept, not dropped.
    expect(writes).toHaveLength(1)
    persistence.stop()
  })

  it('cancels a reload superseded while waiting for a pending save', async () => {
    const store = createStore()
    const { writer, outstanding } = createGateWriter()
    const reads: string[] = []
    const readFile = vi.fn(async () => {
      reads.push('read')
      return { planner: { current: [[1]] } }
    })
    const persistence = createPersistence({ isMain: true, readFile, writer })

    persistence.start(store)
    await waitFor(() => sliceOf(store).ready)
    store.dispatch(onAddShip({ areaIndex: 0, shipId: 7 }))

    persistence.stop()
    persistence.start(store) // superseded load, waiting on the gate
    persistence.stop() // unloaded again before the gate resolves

    outstanding[0].resolve()
    await flush()
    expect(reads).toHaveLength(1)
  })
})

describe('persistence integration with a real store and file', () => {
  const dir = fs.mkdtempSync(path.join((window as any).APPDATA_PATH, 'persist-'))

  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true })
  })

  it('loads a real file and saves changes without the transient error key', async () => {
    const file = path.join(dir, 'data.json')
    fs.writeFileSync(
      file,
      JSON.stringify({
        bookmark: { alpha: { name: 'alpha' } },
        planner: { archive: {}, current: [[1]] },
        ready: true,
        ui: {},
      }),
    )

    const store = createStore()
    const persistence = createPersistence({ dataPath: file, isMain: true })
    persistence.start(store)

    await waitFor(() => sliceOf(store).ready)
    expect(sliceOf(store).planner.current).toEqual([[1]])
    expect(sliceOf(store).bookmark.alpha).toEqual({ name: 'alpha' })

    store.dispatch(onAddShip({ areaIndex: 0, shipId: 9 }))
    await waitFor(() => {
      const saved = JSON.parse(fs.readFileSync(file, 'utf8'))
      return saved.planner?.current?.[0]?.includes(9) === true
    })

    const saved = JSON.parse(fs.readFileSync(file, 'utf8'))
    expect(saved).not.toHaveProperty('error')
    expect(saved.planner.current).toEqual([[1, 9]])
    persistence.stop()
  })

  it('creates the file on the first change after ENOENT', async () => {
    const file = path.join(dir, 'created.json')
    const store = createStore()
    const persistence = createPersistence({ dataPath: file, isMain: true })

    persistence.start(store)
    await waitFor(() => sliceOf(store).ready)
    expect(fs.existsSync(file)).toBe(false)

    store.dispatch(change())
    await waitFor(() => fs.existsSync(file))
    persistence.stop()
  })
})
