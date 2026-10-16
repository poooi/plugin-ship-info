import { extensionSelectorFactory } from 'views/utils/selectors'

import {
  createPersistence as createEngine,
  isEnoent,
  isRecord,
  migratePersistedVersion,
  toPersistedDataError,
  type PersistedMigration,
  type PersistenceActions,
  type PersistenceOptions as EngineOptions,
} from '@poi-plugins/ship-info-shared/persistence'
import { ACTIONS, DATA_PATH, PLUGIN_KEY } from './plugin-identity'

// Ordered file-format migrations; version 0 is an absent `version` field and the
// current version is the step count. Step 0 only stamps the version.
const migrations: readonly PersistedMigration[] = [(data) => data]
const CURRENT_VERSION = migrations.length

// Ship Info's persisted state is the table's bookmarks and transient UI marker.
// It no longer owns the planner: the legacy `planner` field is captured
// verbatim and written back unchanged so upgrading Ship Info (before the Navy
// Staff plugin is installed) never drops a user's plans.

export interface ParsedShipInfoData {
  bookmark?: Record<string, unknown>
  planner?: unknown
  ui?: Record<string, unknown>
}

// File-read trust boundary for the fields Ship Info owns. `planner` is treated
// as opaque legacy data (preserved verbatim, including explicit null) rather
// than validated here.
export const parsePersisted = (raw: unknown): ParsedShipInfoData => {
  if (!isRecord(raw)) {
    throw toPersistedDataError(
      'invalid',
      'persisted data is not an object',
      undefined,
    )
  }

  const result: ParsedShipInfoData = {}

  if ('bookmark' in raw) {
    if (!isRecord(raw.bookmark)) {
      throw toPersistedDataError(
        'invalid',
        'persisted bookmark is not an object',
        undefined,
      )
    }
    result.bookmark = raw.bookmark
  }

  if ('planner' in raw) {
    result.planner = raw.planner
  }

  if ('ui' in raw) {
    if (!isRecord(raw.ui)) {
      throw toPersistedDataError(
        'invalid',
        'persisted ui is not an object',
        undefined,
      )
    }
    result.ui = raw.ui
  }

  return result
}

/** Whether the loaded payload actually carried a legacy `planner` field. */
const hasPlanner = (data: ParsedShipInfoData): boolean =>
  Object.prototype.hasOwnProperty.call(data, 'planner')

const actions: PersistenceActions<ParsedShipInfoData> = {
  init: (data) => ({
    data: { bookmark: data.bookmark, ui: data.ui },
    type: ACTIONS.init,
  }),
  loadError: () => ({ error: 'load', type: ACTIONS.loadError }),
  loadStart: () => ({ type: ACTIONS.loadStart }),
  ready: () => ({ type: ACTIONS.ready }),
}

export type ShipInfoPersistenceOptions = Partial<
  Pick<
    EngineOptions<ParsedShipInfoData>,
    | 'dataPath'
    | 'isMain'
    | 'onError'
    | 'onWriteError'
    | 'readFile'
    | 'select'
    | 'writer'
  >
>

export const createPersistence = (
  options: ShipInfoPersistenceOptions = {},
) => {
  // Per-instance legacy payload: never module-global, and only updated after a
  // run is confirmed current (so a delayed stale load cannot overwrite it).
  let legacyPlanner: unknown
  let legacyPresent = false

  return createEngine<ParsedShipInfoData>({
    actions,
    dataPath: options.dataPath ?? DATA_PATH,
    isMain: options.isMain,
    onError: options.onError,
    onWriteError: options.onWriteError,
    readFile: options.readFile,
    select: options.select ?? extensionSelectorFactory(PLUGIN_KEY),
    writer: options.writer,
    prepareWrite: (slice) => {
      const { error: _error, ...persisted } = slice
      return {
        ...persisted,
        version: CURRENT_VERSION,
        ...(legacyPresent ? { planner: legacyPlanner } : {}),
      }
    },
    load: async (context) => {
      let raw: unknown
      try {
        raw = await context.readFile(context.dataPath)
      } catch (error) {
        if (isEnoent(error)) {
          if (!context.isStale()) {
            legacyPlanner = undefined
            legacyPresent = false
          }
          return {}
        }
        throw toPersistedDataError(
          'read',
          'failed to read persisted data',
          error,
        )
      }

      if (!isRecord(raw)) {
        throw toPersistedDataError(
          'invalid',
          'persisted data is not an object',
          undefined,
        )
      }

      // Migrate before validating the current format so a migration can reshape
      // an old layout. A current file is returned unchanged by the helper.
      const migrated = migratePersistedVersion(raw, migrations)
      const data = parsePersisted(migrated)

      // Upgrade is written before persistence is enabled; a current file is not
      // rewritten. The transient `error` field is stripped as on a normal save.
      if (migrated !== raw) {
        if (context.isStale()) {
          return data
        }
        const { error: _error, ...payload } = migrated
        try {
          await context.writeAndWait(context.dataPath, payload)
        } catch (error) {
          throw toPersistedDataError(
            'migrate',
            'failed to write migrated persisted data',
            error,
          )
        }
      }

      // Establish generation validity before mutating this instance's legacy
      // payload; a superseded run must not touch it.
      if (!context.isStale()) {
        legacyPresent = hasPlanner(data)
        legacyPlanner = data.planner
      }
      return data
    },
  })
}
