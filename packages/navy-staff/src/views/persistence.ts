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
  ACCOUNT_DIR,
  isAccountFileName,
  listAccountFiles as defaultListAccountFiles,
} from './account'
import {
  ACTIONS,
  DISPLAY_FLEET_NAME_CONFIG,
  LEGACY_DATA_PATH,
  LEGACY_DISPLAY_FLEET_NAME_CONFIG,
  PLUGIN_KEY,
} from './plugin-identity'
import {
  migrateV1ToV2,
  navyDataFromLegacyPlanner,
  readLegacyPlanner,
  type LegacyPlannerData,
} from './workspace/migration'
import { emptyNavyData, type NavyData, type NavyWorkspace } from './workspace/types'

// Ordered file-format migrations; version 0 is an absent `version` field and the
// current version is the step count. Step 0 stamps v1; step 1 converts the v1
// planner shape into the version 2 workspace root.
const migrations: readonly PersistedMigration[] = [(data) => data, migrateV1ToV2]
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

const isStringArray = (value: unknown): value is number[] =>
  Array.isArray(value) && value.every((id) => Number.isInteger(id))

const isNullableString = (value: unknown): value is string | null =>
  value === null || typeof value === 'string'
const isNullableInt = (value: unknown): value is number | null =>
  value === null || Number.isInteger(value)

const parseArea = (value: unknown, reason: 'invalid'): string => {
  if (!isRecord(value)) {
    throw toPersistedDataError(reason, 'area is not an object', undefined)
  }
  const { id, label, fleetLabels, color, tagSlot, capturedAt } = value
  if (typeof id !== 'string' || id.length === 0) {
    throw toPersistedDataError(reason, 'area has no id', undefined)
  }
  if (typeof label !== 'string' || typeof color !== 'string') {
    throw toPersistedDataError(reason, 'area label/color is not a string', undefined)
  }
  if (!isRecord(fleetLabels) || !Object.values(fleetLabels).every((v) => typeof v === 'string')) {
    throw toPersistedDataError(reason, 'area fleetLabels are malformed', undefined)
  }
  if (!Number.isInteger(tagSlot) || typeof capturedAt !== 'string') {
    throw toPersistedDataError(reason, 'area slot/time is malformed', undefined)
  }
  return id
}

const parseShipRecord = (value: unknown, reason: 'invalid'): void => {
  if (!isRecord(value)) {
    throw toPersistedDataError(reason, 'ship record is not an object', undefined)
  }
  const { ownedId, masterId, name, typeId, typeLabel, level, observedAt } = value
  if (
    !Number.isInteger(ownedId) ||
    !isNullableInt(masterId) ||
    !isNullableString(name) ||
    !isNullableInt(typeId) ||
    !isNullableString(typeLabel) ||
    !isNullableInt(level) ||
    typeof observedAt !== 'string'
  ) {
    throw toPersistedDataError(reason, 'ship record is malformed', undefined)
  }
}

const parseWorkspace = (value: unknown, reason: 'invalid'): NavyWorkspace => {
  if (!isRecord(value)) {
    throw toPersistedDataError(reason, 'workspace is not an object', undefined)
  }
  const { id, createdAt, revisions, cursor } = value
  if (typeof id !== 'string' || id.length === 0) {
    throw toPersistedDataError(reason, 'workspace has no id', undefined)
  }
  if (typeof createdAt !== 'string') {
    throw toPersistedDataError(reason, 'workspace has no createdAt', undefined)
  }
  if (!Array.isArray(revisions) || revisions.length === 0) {
    throw toPersistedDataError(reason, 'workspace has no revisions', undefined)
  }
  if (
    typeof cursor !== 'number' ||
    !Number.isInteger(cursor) ||
    cursor < 0 ||
    cursor >= revisions.length
  ) {
    throw toPersistedDataError(reason, 'workspace cursor is out of range', undefined)
  }
  const revisionIds = new Set<string>()
  for (const revision of revisions) {
    if (!isRecord(revision) || !isRecord(revision.content) || !isRecord(revision.op)) {
      throw toPersistedDataError(reason, 'revision is malformed', undefined)
    }
    if (typeof revision.id !== 'string' || typeof revision.time !== 'string') {
      throw toPersistedDataError(reason, 'revision has no id/time', undefined)
    }
    if (revisionIds.has(revision.id)) {
      throw toPersistedDataError(reason, 'duplicate revision id', undefined)
    }
    revisionIds.add(revision.id)
    const content = revision.content
    if (
      typeof content.name !== 'string' ||
      !Array.isArray(content.areas) ||
      !isRecord(content.assignments) ||
      !isRecord(content.ships)
    ) {
      throw toPersistedDataError(reason, 'revision content is malformed', undefined)
    }
    const areaIds = new Set<string>()
    for (const area of content.areas) {
      const areaId = parseArea(area, reason)
      if (areaIds.has(areaId)) {
        throw toPersistedDataError(reason, 'duplicate area id', undefined)
      }
      areaIds.add(areaId)
    }
    for (const [key, ids] of Object.entries(content.assignments)) {
      if (!areaIds.has(key)) {
        throw toPersistedDataError(
          reason,
          'assignment references an unknown area',
          undefined,
        )
      }
      if (!isStringArray(ids)) {
        throw toPersistedDataError(reason, 'assignment is malformed', undefined)
      }
    }
    for (const record of Object.values(content.ships)) {
      parseShipRecord(record, reason)
    }
  }
  return value as unknown as NavyWorkspace
}

// The Navy file is authoritative: an existing but invalid/unreadable file is an
// error and never falls back to the legacy file.
export const parseNavyData = (raw: unknown): NavyData => {
  if (!isRecord(raw)) {
    throw toPersistedDataError('invalid', 'persisted data is not an object', undefined)
  }
  const { selectedWorkspaceId, workspaces, legacyArchive } = raw
  if (typeof selectedWorkspaceId !== 'string') {
    throw toPersistedDataError('invalid', 'persisted data has no selected workspace', undefined)
  }
  if (!Array.isArray(workspaces)) {
    throw toPersistedDataError('invalid', 'persisted workspaces are not an array', undefined)
  }
  if (legacyArchive !== undefined && !isRecord(legacyArchive)) {
    throw toPersistedDataError('invalid', 'persisted legacyArchive is not an object', undefined)
  }
  const parsed = workspaces.map((workspace) => parseWorkspace(workspace, 'invalid'))
  const workspaceIds = new Set<string>()
  for (const workspace of parsed) {
    if (workspaceIds.has(workspace.id)) {
      throw toPersistedDataError('invalid', 'duplicate workspace id', undefined)
    }
    workspaceIds.add(workspace.id)
  }
  const selectedExists = parsed.some((workspace) => workspace.id === selectedWorkspaceId)
  if (parsed.length === 0 ? selectedWorkspaceId !== '' : !selectedExists) {
    throw toPersistedDataError(
      'invalid',
      'selected workspace does not exist',
      undefined,
    )
  }
  return {
    legacyArchive: (legacyArchive as Record<string, unknown>) ?? {},
    selectedWorkspaceId,
    workspaces: parsed,
  }
}

// Legacy import reads only planner.current/archive, never bookmarks or UI. A
// legacy file without a planner is treated as an empty plan; a present but
// invalid planner is an error.
export const parseLegacyPlanner = (raw: unknown): LegacyPlannerData => {
  if (!isRecord(raw)) {
    throw toPersistedDataError('legacy', 'legacy data is not an object', undefined)
  }
  validateLegacyVersion(raw)
  if (!('planner' in raw) || raw.planner === undefined) {
    return { archive: {}, current: [] }
  }
  try {
    return readLegacyPlanner(raw)
  } catch (error) {
    throw toPersistedDataError('legacy', 'legacy planner is invalid', error)
  }
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

const actions: PersistenceActions<NavyData> = {
  init: (data) => ({ data: { navy: data }, type: ACTIONS.init }),
  loadError: () => ({ error: 'load', type: ACTIONS.loadError }),
  loadStart: () => ({ type: ACTIONS.loadStart }),
  ready: () => ({ type: ACTIONS.ready }),
}

export interface NavyPersistenceOptions {
  /** Account-scoped file to read and write. */
  dataPath: string
  isMain?: boolean
  onError?: (error: PersistedDataError) => void
  onWriteError?: (error: PersistedDataError) => void
  readFile?: (filePath: string) => Promise<unknown>
  select?: (state: unknown) => unknown
  writer?: EngineOptions<NavyData>['writer']
  /** Lists the account directory (override in tests). */
  listAccountFiles?: (dir: string) => Promise<string[]>
  /** Legacy Ship Info file (override in tests). */
  legacyShipInfoDataPath?: string
}

const EMPTY_DATA = emptyNavyData()

const readLegacyShipInfo = async (
  context: Parameters<NonNullable<EngineOptions<NavyData>['load']>>[0],
  legacyShipInfoDataPath: string,
): Promise<NavyData | undefined> => {
  let raw: unknown
  try {
    raw = await context.readFile(legacyShipInfoDataPath)
  } catch (error) {
    if (isEnoent(error)) return undefined
    throw toPersistedDataError('legacy', 'failed to read legacy Ship Info data', error)
  }
  return navyDataFromLegacyPlanner(parseLegacyPlanner(raw))
}

/**
 * Initializes a fresh account file. The engine already drained the writer before
 * calling load, so the directory listing reflects flushed writes.
 *
 * The released Ship Info plan goes to the first initialized account only: if any
 * account-shaped file already exists, start empty rather than copy the same
 * owned IDs into a second account. Directory presence alone is not consumption
 * (a failed initialization can retry).
 */
const initializeAccountFile = async (
  context: Parameters<NonNullable<EngineOptions<NavyData>['load']>>[0],
  listAccountFiles: (dir: string) => Promise<string[]>,
  legacyShipInfoDataPath: string,
): Promise<NavyData> => {
  const files = await listAccountFiles(ACCOUNT_DIR)
  const navy = files.some(isAccountFileName)
    ? EMPTY_DATA
    : (await readLegacyShipInfo(context, legacyShipInfoDataPath)) ?? EMPTY_DATA

  if (context.isStale()) {
    return EMPTY_DATA
  }

  try {
    await context.writeAndWait(context.dataPath, {
      ...navy,
      version: CURRENT_VERSION,
    })
  } catch (error) {
    throw toPersistedDataError(
      'migrate',
      'failed to write the initialized persisted data',
      error,
    )
  }
  return navy
}

export const createPersistence = (options: NavyPersistenceOptions) => {
  const listAccountFiles = options.listAccountFiles ?? defaultListAccountFiles
  const legacyShipInfoDataPath =
    options.legacyShipInfoDataPath ?? LEGACY_DATA_PATH

  return createEngine<NavyData>({
    actions,
    dataPath: options.dataPath,
    isMain: options.isMain,
    onError: options.onError,
    onWriteError: options.onWriteError,
    readFile: options.readFile,
    select: options.select ?? extensionSelectorFactory(PLUGIN_KEY),
    writer: options.writer,
    // Persist the explicit durable root only; never the whole runtime slice.
    prepareWrite: (slice) => {
      const navy = (slice?.navy ?? EMPTY_DATA) as NavyData
      return {
        legacyArchive: navy.legacyArchive,
        selectedWorkspaceId: navy.selectedWorkspaceId,
        version: CURRENT_VERSION,
        workspaces: navy.workspaces,
      }
    },
    load: async (context) => {
      let navy: NavyData
      try {
        const raw = await context.readFile(context.dataPath)
        if (context.isStale()) {
          return EMPTY_DATA
        }
        if (!isRecord(raw)) {
          throw toPersistedDataError(
            'invalid',
            'persisted data is not an object',
            undefined,
          )
        }
        // The account file exists: never fall back to a legacy source. Migrate
        // before validating the current format; a current file is unchanged.
        let migrated: Record<string, unknown>
        try {
          migrated = migratePersistedVersion(raw, migrations)
        } catch (error) {
          if (error instanceof PersistedDataError) throw error
          throw toPersistedDataError('invalid', 'persisted migration failed', error)
        }
        navy = parseNavyData(migrated)
        if (migrated !== raw) {
          if (context.isStale()) {
            return navy
          }
          try {
            await context.writeAndWait(context.dataPath, migrated)
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
          return EMPTY_DATA
        }
        navy = await initializeAccountFile(
          context,
          listAccountFiles,
          legacyShipInfoDataPath,
        )
      }

      if (context.isStale()) {
        return navy
      }
      // Import the legacy display option only when it is still unset.
      applyLegacyDisplayFleetName()
      return navy
    },
  })
}
