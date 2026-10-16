import { readJson } from 'fs-extra'
import { extensionSelectorFactory } from 'views/utils/selectors'

import FileWriter, { type WriteCallback } from './file-writer'
import { ACTIONS, DATA_PATH, PLUGIN_KEY } from './plugin-identity'

// Persistence and lifecycle ownership for Ship Info's saved state. This module
// is deliberately independent of the reducers: it only reads/writes the file,
// dispatches the lifecycle actions, and subscribes to the host store. The UI
// never loads or saves on mount.

export type PersistenceErrorReason = 'invalid' | 'read' | 'write'

export class PersistedDataError extends Error {
  public readonly reason: PersistenceErrorReason

  public readonly cause?: unknown

  public constructor(
    reason: PersistenceErrorReason,
    message: string,
    cause?: unknown,
  ) {
    super(message)
    this.name = 'PersistedDataError'
    this.reason = reason
    this.cause = cause
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isShipId = (value: unknown): value is number =>
  Number.isInteger(value)

// `current` is one array of integer ship ids per sally area. Anything else
// (nulls, non-integers, nested objects) would later crash rendering or be
// written back over the user's file, so it is rejected here.
const isShipIdArea = (value: unknown): value is number[] =>
  Array.isArray(value) && value.every(isShipId)

// File-read trust boundary: only the persisted shape this plugin understands is
// accepted. Anything else is treated as corrupt so the original file is
// preserved instead of being overwritten with defaults.
export const parsePersisted = (raw: unknown): Record<string, unknown> => {
  if (!isRecord(raw)) {
    throw new PersistedDataError('invalid', 'persisted data is not an object')
  }

  const result: Record<string, unknown> = {}

  if ('bookmark' in raw) {
    if (!isRecord(raw.bookmark)) {
      throw new PersistedDataError(
        'invalid',
        'persisted bookmark is not an object',
      )
    }
    result.bookmark = raw.bookmark
  }

  if ('planner' in raw) {
    const { planner } = raw
    if (!isRecord(planner)) {
      throw new PersistedDataError(
        'invalid',
        'persisted planner is not an object',
      )
    }
    if ('current' in planner) {
      if (!Array.isArray(planner.current)) {
        throw new PersistedDataError(
          'invalid',
          'persisted planner.current is not an array',
        )
      }
      if (!planner.current.every(isShipIdArea)) {
        throw new PersistedDataError(
          'invalid',
          'persisted planner.current is not an array of ship id arrays',
        )
      }
    }
    if ('archive' in planner && !isRecord(planner.archive)) {
      throw new PersistedDataError(
        'invalid',
        'persisted planner.archive is not an object',
      )
    }
    result.planner = planner
  }

  if ('ui' in raw) {
    if (!isRecord(raw.ui)) {
      throw new PersistedDataError('invalid', 'persisted ui is not an object')
    }
    result.ui = raw.ui
  }

  return result
}

const isEnoent = (error: unknown): boolean =>
  isRecord(error) && error.code === 'ENOENT'

export interface PersistenceStore {
  dispatch: (action: unknown) => unknown
  getState: () => any
  subscribe: (listener: () => void) => () => void
}

export interface PersistenceWriter {
  write: (
    path: string,
    data: unknown,
    options?: object,
    callback?: WriteCallback,
  ) => void
  drain?: () => Promise<void>
}

export interface PersistenceOptions {
  dataPath?: string
  /** Only the host main window owns the file; standalone windows stay read-only. */
  isMain?: boolean
  onError?: (error: PersistedDataError) => void
  onWriteError?: (error: PersistedDataError) => void
  readFile?: (filePath: string) => Promise<unknown>
  /** Selects the plugin slice from the host root state. */
  select?: (state: any) => any
  writer?: PersistenceWriter
}

export interface Persistence {
  readonly started: boolean
  start: (store: PersistenceStore) => void
  stop: () => void
}

const toPersistedDataError = (
  reason: PersistenceErrorReason,
  message: string,
  error: unknown,
): PersistedDataError =>
  error instanceof PersistedDataError
    ? error
    : new PersistedDataError(reason, message, error)

export const createPersistence = (
  options: PersistenceOptions = {},
): Persistence => {
  const dataPath = options.dataPath ?? DATA_PATH
  const readFile =
    options.readFile ?? ((filePath: string) => readJson(filePath))
  const select = options.select ?? extensionSelectorFactory(PLUGIN_KEY)
  const writer = options.writer ?? new FileWriter()

  let store: PersistenceStore | undefined
  let unsubscribe: (() => void) | undefined
  let lastSlice: any
  let generation = 0
  let started = false

  const report = (error: PersistedDataError) => {
    console.error(error.stack ?? error.message)
    options.onError?.(error)
  }

  const reportWrite = (error: unknown) => {
    const wrapped = toPersistedDataError(
      'write',
      'failed to write persisted data',
      error,
    )
    console.error(wrapped.stack ?? wrapped.message)
    if (options.onWriteError) {
      options.onWriteError(wrapped)
    } else {
      options.onError?.(wrapped)
    }
  }

  const isStale = (current: number) => current !== generation || !started

  const failLoad = (error: PersistedDataError) => {
    report(error)
    store?.dispatch({ error: 'load', type: ACTIONS.loadError })
  }

  const subscribe = () => {
    if (!store || unsubscribe) {
      return
    }
    lastSlice = select(store.getState())
    unsubscribe = store.subscribe(() => {
      if (!store) {
        return
      }
      const slice = select(store.getState())
      if (slice === lastSlice) {
        return
      }
      lastSlice = slice
      if (!slice?.ready) {
        return
      }
      // `error` is transient and must never be written to the user's file.
      const { error: _error, ...persisted } = slice
      writer.write(dataPath, persisted, undefined, (error) => {
        if (error) {
          reportWrite(error)
        }
      })
    })
  }

  const load = async (current: number) => {
    if (!store) {
      return
    }

    // A queued save from a previous lifecycle may still be in flight. Wait for
    // it to settle so this reload never reads a half-written file or hydrates
    // stale data; the generation check afterwards cancels an unload/reload race.
    await writer.drain?.()
    if (isStale(current)) {
      return
    }

    let raw: unknown
    try {
      raw = await readFile(dataPath)
    } catch (error) {
      if (isStale(current)) {
        return
      }
      if (isEnoent(error)) {
        // No saved file yet: initialize with defaults and enable saving.
        store.dispatch({ type: ACTIONS.ready })
        subscribe()
        return
      }
      failLoad(
        toPersistedDataError('read', 'failed to read persisted data', error),
      )
      return
    }

    if (isStale(current)) {
      return
    }

    let data: Record<string, unknown>
    try {
      data = parsePersisted(raw)
    } catch (error) {
      failLoad(toPersistedDataError('invalid', 'invalid persisted data', error))
      return
    }

    store.dispatch({ data, type: ACTIONS.init })
    store.dispatch({ type: ACTIONS.ready })
    subscribe()
  }

  const start = (nextStore: PersistenceStore) => {
    if (started) {
      return
    }
    started = true
    store = nextStore
    const current = ++generation
    if (!(options.isMain ?? window.isMain)) {
      // Standalone windows consume host state and never touch the file.
      return
    }
    // Reset transient ready/error so a reload can never save while this load is
    // still pending and a previous error does not linger.
    store.dispatch({ type: ACTIONS.loadStart })
    void load(current)
  }

  const stop = () => {
    if (!started) {
      return
    }
    started = false
    generation += 1
    unsubscribe?.()
    unsubscribe = undefined
    lastSlice = undefined
    store = undefined
  }

  return {
    get started() {
      return started
    },
    start,
    stop,
  }
}
