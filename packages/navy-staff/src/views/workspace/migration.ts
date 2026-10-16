// Legacy -> version 2 conversion. The old format stored only positional group
// slots and owned ship IDs, so area labels and ship display records cannot be
// reconstructed. Neutral labels are used and ownership stays unknown; missing
// host data never blocks the structural migration.

import {
  NAVY_DEFAULT_AREA_COLOR,
  createEmptyContent,
  createRevision,
  newNavyId,
  type NavyData,
  type NavyWorkspace,
} from './types'

export interface LegacyPlannerData {
  archive: Record<string, unknown>
  current: number[][]
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const navyDataFromLegacyPlanner = (
  planner: LegacyPlannerData,
  now: string = new Date().toISOString(),
): NavyData => {
  const areas = planner.current.map((_ids, index) => ({
    capturedAt: now,
    color: NAVY_DEFAULT_AREA_COLOR,
    fleetLabels: {},
    id: newNavyId('area'),
    label: `Area ${index + 1}`,
    tagSlot: index,
  }))
  const assignments: Record<string, number[]> = {}
  areas.forEach((area, index) => {
    assignments[area.id] = [...planner.current[index]]
  })
  const content = { ...createEmptyContent('Plan'), areas, assignments }
  const workspace: NavyWorkspace = {
    createdAt: now,
    cursor: 0,
    id: newNavyId('ws'),
    ownerMemberId: null,
    revisions: [createRevision({ kind: 'migrated' }, content, now)],
  }
  return {
    legacyArchive: planner.archive,
    selectedWorkspaceId: workspace.id,
    workspaces: [workspace],
  }
}

/**
 * Reads a legacy `planner` value. Every owned ID must be an integer; invalid
 * data throws instead of being silently dropped.
 */
export const readLegacyPlanner = (raw: Record<string, unknown>): LegacyPlannerData => {
  const planner = raw.planner
  if (!isRecord(planner)) {
    throw new Error('persisted planner is not an object')
  }
  const { archive, current } = planner
  if (!Array.isArray(current)) {
    throw new Error('persisted planner.current is not an array of ship id arrays')
  }
  const validated = current.map((ids, index) => {
    if (!Array.isArray(ids)) {
      throw new Error(`persisted planner.current[${index}] is not an array`)
    }
    for (const id of ids) {
      if (!Number.isInteger(id)) {
        throw new Error(
          `persisted planner.current[${index}] contains a non-integer ship id`,
        )
      }
    }
    return [...ids]
  })
  if (archive !== undefined && !isRecord(archive)) {
    throw new Error('persisted planner.archive is not an object')
  }
  return { archive: (archive as Record<string, unknown>) ?? {}, current: validated }
}

/**
 * Ordered v1 -> v2 migration step. A v1/v0 Navy file must contain a `planner`;
 * a missing planner is invalid here (only the legacy absent-file import may
 * intentionally create an empty plan). `migratePersistedVersion` stamps the
 * version afterwards.
 */
export const migrateV1ToV2 = (
  raw: Record<string, unknown>,
): Record<string, unknown> => {
  if (raw.planner === undefined) {
    throw new Error('persisted data has no planner')
  }
  return { ...navyDataFromLegacyPlanner(readLegacyPlanner(raw)) }
}
