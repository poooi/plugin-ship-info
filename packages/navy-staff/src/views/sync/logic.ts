// Pure logic for the sync toolbar: slot-selection <-> mapping conversion, the
// default suggestion from saved slot hints, area diff descriptions, and
// message-key mapping. Kept free of React and host state.

import type { NavyWorkspaceContent } from '../workspace/types'
import type {
  PreparedAreaSync,
  SlotMappingInput,
  SyncSourceSnapshot,
  SyncStaleReason,
} from './core'

/** slot -> local area id, or `NO_MAPPING` for an entry with no mapping. */
export type SlotSelection = Readonly<Record<number, string>>

/**
 * Sentinel for "no mapping entry". In area sync the row offers this as
 * "New area"; in tag sync the same value means "Ignore (unmapped)" because tag
 * sync never creates areas.
 */
export const NO_MAPPING = ''

/**
 * Suggests an initial mapping from the saved `tagSlot` hints. Slots with no
 * local match default to no mapping; the user can correct any entry.
 */
export const defaultSlotSelection = (
  source: SyncSourceSnapshot,
  content: NavyWorkspaceContent,
): Record<number, string> => {
  const selection: Record<number, string> = {}
  for (const area of source.areas) {
    const match = content.areas.find((local) => local.tagSlot === area.slot)
    selection[area.slot] = match ? match.id : NO_MAPPING
  }
  return selection
}

/** Drops "no mapping" slots; only explicit slot -> area pairs become a mapping. */
export const toMapping = (selection: SlotSelection): SlotMappingInput =>
  Object.entries(selection)
    .filter(([, areaId]) => areaId !== NO_MAPPING)
    .map(([slot, areaId]) => ({ areaId, slot: Number(slot) }))

export const findAreaIdForShip = (
  content: NavyWorkspaceContent,
  shipId: number,
): string | null => {
  for (const area of content.areas) {
    if ((content.assignments[area.id] ?? []).includes(shipId)) return area.id
  }
  return null
}

export interface FleetLabelChange {
  readonly locale: string
  readonly from: string
  readonly to: string
}

/** A reviewable old -> new description for one updated mapped area. */
export interface AreaUpdateDiff {
  readonly areaId: string
  readonly oldLabel: string
  readonly newLabel: string
  readonly oldColor: string
  readonly newColor: string
  readonly fleetLabelChanges: ReadonlyArray<FleetLabelChange>
}

/**
 * Describes each updated mapped area as old -> new, including recolorings and
 * changed fleet labels, so the user can review what the batch will change.
 */
export const areaUpdateDiffs = (
  prepared: PreparedAreaSync,
  content: NavyWorkspaceContent,
): AreaUpdateDiff[] => {
  const localById = new Map(content.areas.map((area) => [area.id, area]))
  const slotByArea = new Map(
    prepared.mapping.map((entry) => [entry.areaId, entry.slot]),
  )
  const sourceBySlot = new Map(prepared.source.areas.map((area) => [area.slot, area]))
  const diffs: AreaUpdateDiff[] = []
  for (const areaId of prepared.summary.updated) {
    const slot = slotByArea.get(areaId)
    if (slot === undefined) continue
    const local = localById.get(areaId)
    const source = sourceBySlot.get(slot)
    if (!local || !source) continue
    const locales = new Set([
      ...Object.keys(local.fleetLabels),
      ...Object.keys(source.fleetLabels),
    ])
    const fleetLabelChanges = [...locales]
      .map((locale) => ({
        from: local.fleetLabels[locale] ?? '',
        locale,
        to: source.fleetLabels[locale] ?? '',
      }))
      .filter((change) => change.from !== change.to)
    diffs.push({
      areaId,
      fleetLabelChanges,
      newColor: source.color,
      newLabel: source.label,
      oldColor: local.color,
      oldLabel: local.label,
    })
  }
  return diffs
}

/** Source areas that will be added (no mapping entry). */
export const addedAreaSources = (
  prepared: PreparedAreaSync,
): ReadonlyArray<{ label: string; color: string }> => {
  const mapped = new Set(prepared.mapping.map((entry) => entry.slot))
  return prepared.source.areas
    .filter((area) => !mapped.has(area.slot))
    .map((area) => ({ color: area.color, label: area.label }))
}

/** One i18n key per stale reason, so the UI localizes each cause. */
export const STALE_MESSAGE_KEYS: Record<SyncStaleReason, string> = {
  ACCOUNT_CHANGED: 'staleAccountChanged',
  MAPPING_CHANGED: 'staleMappingChanged',
  REVISION_CHANGED: 'staleRevisionChanged',
  ROSTER_CHANGED: 'staleRosterChanged',
  SOURCE_CHANGED: 'staleSourceChanged',
  WORKSPACE_CHANGED: 'staleWorkspaceChanged',
}

const SYNC_ERROR_KEYS: Record<string, string> = {
  ACCOUNT_MISMATCH: 'syncAccountMismatch',
  DUPLICATE_ROSTER_SHIP: 'syncFailed',
  DUPLICATE_SOURCE_SLOT: 'syncMappingConflict',
  INVALID_SLOT: 'syncFailed',
  INVALID_TAG_SLOT: 'syncFailed',
  MAPPING_AREA_CONFLICT: 'syncMappingConflict',
  MAPPING_SLOT_CONFLICT: 'syncMappingConflict',
  UNKNOWN_AREA: 'syncMappingConflict',
  UNKNOWN_SLOT: 'syncMappingConflict',
}

/** Maps a SyncErrorCode to an i18n key; unknown codes fall back to `syncFailed`. */
export const syncErrorMessageKey = (code: string): string =>
  SYNC_ERROR_KEYS[code] ?? 'syncFailed'
