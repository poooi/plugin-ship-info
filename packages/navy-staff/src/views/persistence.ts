import { extensionSelectorFactory } from 'views/utils/selectors'

import {
  createPersistence as createEngine,
  isEnoent,
  isRecord,
  migratePersistedVersion,
  PersistedDataError,
  toPersistedDataError,
  type PersistedMigration,
  type PersistenceActions,
  type PersistenceOptions as EngineOptions,
} from '@poi-plugins/ship-info-shared/persistence'
import {
  ACTIONS,
  DATA_PATH,
  DISPLAY_FLEET_NAME_CONFIG,
  LEGACY_DATA_PATH,
  LEGACY_DISPLAY_FLEET_NAME_CONFIG,
  PLUGIN_KEY,
} from './plugin-identity'

export interface PlannerData {
  archive: Record<string, unknown>
  current: number[][]
}

export interface ParsedNavyData {
  planner: PlannerData
}

// Ordered file-format migrations; version 0 is an absent `version` field and the
// current version is the step count. Step 0 only stamps the version.
const migrations: readonly PersistedMigration[] = [(data) => data]
const CURRENT_VERSION = migrations.length

// Legacy Ship Info sources are accepted unversioned (v0) or at v1; a future
// source version is rejected rather than silently imported.
const LEGACY_CURRENT_VERSION = 1

const validateLegacyVersion = (raw: Record<string, unknown>): void => {
  const version = raw.version
  if (version === undefined) {
    return
  }
  if (
    typeof version !== 'number' ||
    !Number.isInteger(version) ||
    version < 0 ||
    version > LEGACY_CURRENT_VERSION
  ) {
    throw toPersistedDataError(
      'legacy',
      'unsupported legacy persisted version',
      undefined,
    )
  }
}

const isShipId = (value: unknown): value is number => Number.isInteger(value)

const isShipIdArea = (value: unknown): value is number[] =>
  Array.isArray(value) && value.every(isShipId)

const parsePlanner = (
  planner: unknown,
  reason: 'invalid' | 'legacy',
): PlannerData => {
  if (!isRecord(planner)) {
    throw toPersistedDataError(
      reason,
      'persisted planner is not an object',
      undefined,
    )
  }
  const { archive, current } = planner
  if (!Array.isArray(current) || !current.every(isShipIdArea)) {
    throw toPersistedDataError(
      reason,
      'persisted planner.current is not an array of ship id arrays',
      undefined,
    )
  }
  if (archive !== undefined && !isRecord(archive)) {
    throw toPersistedDataError(
      reason,
      'persisted planner.archive is not an object',
      undefined,
    )
  }
  return { archive: (archive as Record<string, unknown>) ?? {}, current }
}

// The Navy file is authoritative: an existing but invalid/unreadable file is an
// error and never falls back to the legacy Ship Info file.
export const parseNavyPersisted = (raw: unknown): ParsedNavyData => {
  if (!isRecord(raw)) {
    throw toPersistedDataError(
      'invalid',
      'persisted data is not an object',
      undefined,
    )
  }
  if (!('planner' in raw)) {
    throw toPersistedDataError(
      'invalid',
      'persisted data has no planner',
      undefined,
    )
  }
  return { planner: parsePlanner(raw.planner, 'invalid') }
}

// Legacy import reads only planner.current/archive, never bookmarks or UI.
// A legacy file without a planner is treated as an empty plan.
export const parseLegacyPlanner = (raw: unknown): PlannerData => {
  if (!isRecord(raw)) {
    throw toPersistedDataError(
      'legacy',
      'legacy data is not an object',
      undefined,
    )
  }
  validateLegacyVersion(raw)
  if (!('planner' in raw) || raw.planner === undefined) {
    return { archive: {}, current: [] }
  }
  return parsePlanner(raw.planner, 'legacy')
}

const applyLegacyDisplayFleetName = (): void => {
  // Only import when the new value is unset, so an explicit false/true stays.
  if (window.config.get(DISPLAY_FLEET_NAME_CONFIG, undefined) !== undefined) {
    return
  }
  const legacy = window.config.get(
    LEGACY_DISPLAY_FLEET_NAME_CONFIG,
    undefined,
  )
  if (legacy !== undefined) {
    window.config.set(DISPLAY_FLEET_NAME_CONFIG, legacy)
  }
}

const actions: PersistenceActions<PlannerData> = {
  init: (data) => ({ data: { planner: data }, type: ACTIONS.init }),
  loadError: () => ({ error: 'load', type: ACTIONS.loadError }),
  loadStart: () => ({ type: ACTIONS.loadStart }),
  ready: () => ({ type: ACTIONS.ready }),
}

export type NavyPersistenceOptions = Partial<
  Pick<
    EngineOptions<PlannerData>,
    | 'dataPath'
    | 'isMain'
    | 'onError'
    | 'onWriteError'
    | 'readFile'
    | 'select'
    | 'writer'
  >
> & {
  /** Legacy Ship Info file to import from (override in tests). */
  legacyDataPath?: string
}

// Migration from the legacy Ship Info file. The new file must be written
// successfully before persistence is enabled; a failed initial write leaves
// saving disabled and the legacy file untouched.
const EMPTY_PLAN: PlannerData = { archive: {}, current: [] }

const migrateFromLegacy = async (
  context: Parameters<NonNullable<EngineOptions<PlannerData>['load']>>[0],
  legacyDataPath: string,
): Promise<PlannerData> => {
  let legacyRaw: unknown
  try {
    legacyRaw = await context.readFile(legacyDataPath)
  } catch (error) {
    if (isEnoent(error)) {
      legacyRaw = undefined
    } else {
      throw toPersistedDataError(
        'legacy',
        'failed to read legacy persisted data',
        error,
      )
    }
  }

  // A delayed legacy read from an unloaded generation must not write over a
  // newer import. The engine's writeAndWait also refuses stale writes.
  if (context.isStale()) {
    return EMPTY_PLAN
  }

  const plan =
    legacyRaw === undefined ? EMPTY_PLAN : parseLegacyPlanner(legacyRaw)

  if (context.isStale()) {
    return EMPTY_PLAN
  }

  try {
    await context.writeAndWait(context.dataPath, {
      planner: plan,
      ready: true,
      version: CURRENT_VERSION,
    })
  } catch (error) {
    throw toPersistedDataError(
      'migrate',
      'failed to write the migrated persisted data',
      error,
    )
  }

  return plan
}

export const createPersistence = (options: NavyPersistenceOptions = {}) => {
  const legacyDataPath = options.legacyDataPath ?? LEGACY_DATA_PATH
  return createEngine<PlannerData>({
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
      return { ...persisted, version: CURRENT_VERSION }
    },
    load: async (context) => {
      let plan: PlannerData
      try {
        const raw = await context.readFile(context.dataPath)
        if (context.isStale()) {
          return EMPTY_PLAN
        }
        if (!isRecord(raw)) {
          throw toPersistedDataError(
            'invalid',
            'persisted data is not an object',
            undefined,
          )
        }
        // The Navy file exists: never fall back to the legacy file. Migrate
        // before validating the current format; a current file is unchanged.
        const migrated = migratePersistedVersion(raw, migrations)
        plan = parseNavyPersisted(migrated).planner
        if (migrated !== raw) {
          if (context.isStale()) {
            return plan
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
      } catch (error) {
        if (error instanceof PersistedDataError) {
          throw error
        }
        if (!isEnoent(error)) {
          throw toPersistedDataError(
            'read',
            'failed to read persisted data',
            error,
          )
        }
        if (context.isStale()) {
          return EMPTY_PLAN
        }
        plan = await migrateFromLegacy(context, legacyDataPath)
      }

      if (context.isStale()) {
        return plan
      }
      // Import the legacy display option only when it is still unset. Doing
      // this on every successful current-generation load (not only inside
      // migration) resumes a config import that an unload interrupted after the
      // Navy file was already written, while preserving explicit false/true.
      applyLegacyDisplayFleetName()
      return plan
    },
  })
}
