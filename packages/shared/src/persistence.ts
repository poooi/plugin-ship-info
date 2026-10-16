import { readJson } from 'fs-extra'

import FileWriter, { type WriteCallback } from './file-writer'

// Shared persistence engine. It owns the serialized write queue, the store
// subscription, the load/reload generation guard and the lifecycle dispatches
// (loadStart/init/ready/loadError). Each plugin supplies its own identity,
// persisted-shape validation and a loader that returns the data to dispatch;
// loaders throw a typed PersistedDataError to block saving. This stays a small
// engine rather than a plugin framework.

export type PersistenceErrorReason =
  | 'invalid'
  | 'legacy'
  | 'migrate'
  | 'read'
  | 'write'

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

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const isEnoent = (error: unknown): boolean =>
  isRecord(error) && error.code === 'ENOENT'

export const toPersistedDataError = (
  reason: PersistenceErrorReason,
  message: string,
  error: unknown,
): PersistedDataError =>
  error instanceof PersistedDataError
    ? error
    : new PersistedDataError(reason, message, error)

export type PersistedMigration = (
  data: Record<string, unknown>,
) => Record<string, unknown>

/**
 * Validates the top-level `version` (absent means 0) and runs the ordered
 * migration steps (`migrations[i]` upgrades `i` to `i+1`; content only, the
 * version is stamped by the helper). The current version is the step count, so
 * there is no separate knob to keep in sync. Malformed and unsupported future
 * versions are rejected before any write. Pure and side-effect free.
 */
export const migratePersistedVersion = (
  raw: Record<string, unknown>,
  migrations: readonly PersistedMigration[],
): Record<string, unknown> => {
  const currentVersion = migrations.length
  const rawVersion = raw.version
  let version: number
  if (rawVersion === undefined) {
    version = 0
  } else if (
    typeof rawVersion === 'number' &&
    Number.isInteger(rawVersion) &&
    rawVersion >= 0
  ) {
    version = rawVersion
  } else {
    throw toPersistedDataError(
      'invalid',
      'persisted version is not a non-negative integer',
      undefined,
    )
  }

  if (version > currentVersion) {
    throw toPersistedDataError(
      'invalid',
      `persisted version ${version} is newer than supported ${currentVersion}`,
      undefined,
    )
  }

  let data = raw
  for (let step = version; step < currentVersion; step += 1) {
    data = { ...migrations[step](data), version: step + 1 }
  }
  return data
}

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

/** Facilities a loader needs. It cannot reach the store or subscription. */
export interface LoadContext {
  readonly dataPath: string
  readFile: (filePath: string) => Promise<unknown>
  /** Queues a write and resolves once it settles (rejects on failure). */
  writeAndWait: (filePath: string, data: unknown) => Promise<void>
  /** True once this load has been superseded by a stop/reload. */
  isStale: () => boolean
}

export interface PersistenceActions<Data> {
  init: (data: Data) => unknown
  loadError: (error: PersistedDataError) => unknown
  loadStart: () => unknown
  ready: () => unknown
}

export interface PersistenceOptions<Data> {
  dataPath: string
  select: (state: any) => any
  /** Reads/validates/migrates and returns the data to dispatch to `init`. */
  load: (context: LoadContext) => Promise<Data>
  actions: PersistenceActions<Data>
  prepareWrite?: (slice: any) => unknown
  writer?: PersistenceWriter
  readFile?: (filePath: string) => Promise<unknown>
  /** Only the host main window owns the file; other windows stay read-only. */
  isMain?: boolean
  onError?: (error: PersistedDataError) => void
  onWriteError?: (error: PersistedDataError) => void
}

export interface Persistence {
  readonly started: boolean
  start: (store: PersistenceStore) => void
  stop: () => void
}

export const createPersistence = <Data>(
  options: PersistenceOptions<Data>,
): Persistence => {
  const { dataPath } = options
  const readFile =
    options.readFile ?? ((filePath: string) => readJson(filePath))
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

  const subscribe = () => {
    if (!store || unsubscribe) {
      return
    }
    lastSlice = options.select(store.getState())
    unsubscribe = store.subscribe(() => {
      if (!store) {
        return
      }
      const slice = options.select(store.getState())
      if (slice === lastSlice) {
        return
      }
      lastSlice = slice
      if (!slice?.ready) {
        return
      }
      const payload = options.prepareWrite ? options.prepareWrite(slice) : slice
      writer.write(dataPath, payload, undefined, (error) => {
        if (error) {
          reportWrite(error)
        }
      })
    })
  }

  const run = async (current: number) => {
    const isStale = () => current !== generation || !started
    const context: LoadContext = {
      dataPath,
      isStale,
      readFile,
      // Run-bound: a superseded generation must never enqueue a write (e.g. a
      // delayed legacy read must not overwrite a newer import or edit).
      writeAndWait: (filePath: string, data: unknown): Promise<void> => {
        if (isStale()) {
          return Promise.reject(
            new PersistedDataError('migrate', 'stale write refused'),
          )
        }
        return new Promise<void>((resolve, reject) => {
          writer.write(filePath, data, undefined, (error) => {
            if (error) {
              reject(error)
            } else {
              resolve()
            }
          })
        })
      },
    }

    // A queued save from a previous lifecycle may still be in flight. Wait for
    // it to settle so this reload never reads a half-written file or hydrates
    // stale data; the generation check cancels an unload/reload race.
    await writer.drain?.()
    if (isStale()) {
      return
    }

    let data: Data
    try {
      data = await options.load(context)
    } catch (error) {
      if (isStale()) {
        return
      }
      const wrapped = toPersistedDataError(
        'invalid',
        'failed to load persisted data',
        error,
      )
      report(wrapped)
      store?.dispatch(options.actions.loadError(wrapped))
      return
    }

    if (isStale()) {
      return
    }

    store?.dispatch(options.actions.init(data))
    store?.dispatch(options.actions.ready())
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
    store.dispatch(options.actions.loadStart())
    void run(current)
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
