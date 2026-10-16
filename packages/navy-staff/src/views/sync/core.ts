// Pure manual-synchronization core (no host, no dispatch, no persistence).
//
// Two independent batches, per docs/navy-staff-workspaces-design.md sections 4-5:
//   - area metadata sync   ("update area information")
//   - actual sortie-tag sync ("apply actual sortie tags")
//
// prepare* freezes the exact source, mapping, base workspace/revision and the
// transient loaded account, plus the candidate roster fields it decided from,
// the resulting content, and the operation to append. accept* compares those
// frozen values with the current inputs; it never recomputes from newer host
// data. Tag slots are mapping hints only: continuity across events is never
// inferred, only confirmed by the user. Storage is one file per account; the
// account id is current-session freshness, never a per-workspace owner.

import type {
  NavyArea,
  NavyOperation,
  NavyShipRecord,
  NavyWorkspaceContent,
} from '../workspace/types'

export type AreaSyncOperation = Extract<NavyOperation, { kind: 'update-areas' }>
export type TagSyncOperation = Extract<NavyOperation, { kind: 'apply-tags' }>

/** One captured host group. `slot` is the original tag-slot hint (0-based). */
export interface SyncSourceArea {
  slot: number
  label: string
  fleetLabels: Record<string, string>
  color: string
}

export interface SyncSourceSnapshot {
  areas: ReadonlyArray<SyncSourceArea>
  /**
   * Transient caller-supplied generation marker. Never a persisted event id and
   * never a continuity claim; it only lets a replaced source/session with
   * identical contents invalidate an open confirmation.
   */
  sourceId?: string | null
}

/** A caller-supplied, visible, correctable one-to-one mapping entry. */
export interface SlotAreaMappingEntry {
  slot: number
  areaId: string
}

export type SlotMappingInput = ReadonlyArray<SlotAreaMappingEntry>

export interface RosterShip {
  ownedId: number
  /** Source slot the ship is tagged with, or null when untagged. */
  tagSlot: number | null
  masterId: number | null
  name: string | null
  typeId: number | null
  typeLabel: string | null
  level: number | null
}

export interface RosterSample {
  /** Loaded account-file id the roster belongs to. */
  accountId: string | null
  ships: ReadonlyArray<RosterShip>
}

/** The frozen base state a prepared batch was computed from. */
export interface SyncWorkspaceSnapshot {
  workspaceId: string
  /** Revision id at the editable cursor when the batch was prepared. */
  revisionId: string
  /** Transient loaded-account-file id; current-session freshness only. */
  accountId: string | null
  content: NavyWorkspaceContent
}

export type NormalizedMapping = ReadonlyArray<
  Readonly<{ slot: number; areaId: string }>
>

export interface FrozenSource {
  readonly areas: ReadonlyArray<SyncSourceArea>
  readonly sourceId: string | null
}

export interface FrozenRosterShip {
  readonly ownedId: number
  readonly tagSlot: number | null
  readonly masterId: number | null
  readonly name: string | null
  readonly typeId: number | null
  readonly typeLabel: string | null
  readonly level: number | null
}

export interface AreaSyncSummary {
  readonly added: ReadonlyArray<string>
  readonly updated: ReadonlyArray<string>
  readonly unchanged: ReadonlyArray<string>
  readonly retained: ReadonlyArray<string>
}

export interface PreparedAreaSync {
  readonly kind: 'areas'
  readonly workspaceId: string
  readonly baseRevisionId: string
  readonly accountId: string | null
  readonly source: FrozenSource
  readonly mapping: NormalizedMapping
  /** The frozen next content; equals the input content when `changed` is false. */
  readonly nextContent: NavyWorkspaceContent
  readonly summary: AreaSyncSummary
  readonly changed: boolean
  readonly operation: AreaSyncOperation
}

export interface TagSyncSummary {
  readonly added: ReadonlyArray<number>
  readonly moved: ReadonlyArray<number>
  readonly unchanged: ReadonlyArray<number>
}

export interface PreparedTagSync {
  readonly kind: 'tags'
  readonly workspaceId: string
  readonly baseRevisionId: string
  readonly accountId: string | null
  /**
   * Full captured source used for freshness. Labels and colors are shown to the
   * user and participate in the explicit confirmation.
   */
  readonly source: FrozenSource
  readonly mapping: NormalizedMapping
  readonly roster: ReadonlyArray<FrozenRosterShip>
  readonly nextContent: NavyWorkspaceContent
  readonly summary: TagSyncSummary
  readonly changed: boolean
  readonly operation: TagSyncOperation
}

export type SyncStaleReason =
  | 'WORKSPACE_CHANGED'
  | 'REVISION_CHANGED'
  | 'ACCOUNT_CHANGED'
  | 'SOURCE_CHANGED'
  | 'MAPPING_CHANGED'
  | 'ROSTER_CHANGED'

export interface SyncFreshness {
  readonly fresh: boolean
  readonly reasons: ReadonlyArray<SyncStaleReason>
}

export interface SyncAcceptance {
  readonly fresh: boolean
  readonly reasons: ReadonlyArray<SyncStaleReason>
  readonly apply: {
    readonly content: NavyWorkspaceContent
    readonly operation: AreaSyncOperation | TagSyncOperation
  } | null
}

export interface AreaSyncInput {
  workspace: SyncWorkspaceSnapshot
  source: SyncSourceSnapshot
  mapping: SlotMappingInput
  now: string
  createAreaId: () => string
}

export interface AreaSyncCurrent {
  workspace: SyncWorkspaceSnapshot
  source: SyncSourceSnapshot
  mapping: SlotMappingInput
}

export interface TagSyncInput {
  workspace: SyncWorkspaceSnapshot
  source: SyncSourceSnapshot
  mapping: SlotMappingInput
  roster: RosterSample
  now: string
}

export interface TagSyncCurrent {
  workspace: SyncWorkspaceSnapshot
  source: SyncSourceSnapshot
  mapping: SlotMappingInput
  roster: RosterSample
}

export type SyncErrorCode =
  | 'MAPPING_SLOT_CONFLICT'
  | 'MAPPING_AREA_CONFLICT'
  | 'UNKNOWN_AREA'
  | 'UNKNOWN_SLOT'
  | 'DUPLICATE_SOURCE_SLOT'
  | 'DUPLICATE_ROSTER_SHIP'
  | 'INVALID_SLOT'
  | 'INVALID_TAG_SLOT'
  | 'ACCOUNT_MISMATCH'

export class SyncError extends Error {
  readonly code: SyncErrorCode

  constructor(code: SyncErrorCode, message: string) {
    super(message)
    this.name = 'SyncError'
    this.code = code
  }
}

export const isSyncError = (error: unknown): error is SyncError =>
  error instanceof SyncError

// --- Helpers -----------------------------------------------------------------

const isNonNegativeInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0

const isNonNegativeIntegerOrNull = (value: unknown): value is number | null =>
  value === null || isNonNegativeInteger(value)

const sameStringRecord = (
  a: Record<string, string>,
  b: Record<string, string>,
): boolean => {
  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)
  if (aKeys.length !== bKeys.length) return false
  return aKeys.every((key) => b[key] === a[key])
}

const sourceSlots = (source: SyncSourceSnapshot): number[] => {
  const slots: number[] = []
  const seen = new Set<number>()
  for (const area of source.areas) {
    if (!isNonNegativeInteger(area.slot)) {
      throw new SyncError('INVALID_SLOT', `source slot ${String(area.slot)} is invalid`)
    }
    if (seen.has(area.slot)) {
      throw new SyncError('DUPLICATE_SOURCE_SLOT', `source slot ${area.slot} is duplicated`)
    }
    seen.add(area.slot)
    slots.push(area.slot)
  }
  return slots
}

const freezeSource = (source: SyncSourceSnapshot): FrozenSource => {
  sourceSlots(source)
  return {
    areas: source.areas.map((area) => ({
      color: area.color,
      fleetLabels: { ...area.fleetLabels },
      label: area.label,
      slot: area.slot,
    })),
    sourceId: source.sourceId ?? null,
  }
}

// Validates the caller's visible mapping and returns it sorted by slot.
const normalizeMapping = (
  mapping: SlotMappingInput,
  content: NavyWorkspaceContent,
  source: SyncSourceSnapshot,
): NormalizedMapping => {
  const slots = new Set(sourceSlots(source))
  const areaIds = new Set(content.areas.map((area) => area.id))
  const seenSlots = new Set<number>()
  const seenAreas = new Set<string>()
  const normalized = mapping.map((entry) => {
    if (!isNonNegativeInteger(entry.slot)) {
      throw new SyncError('INVALID_SLOT', `mapping slot ${String(entry.slot)} is invalid`)
    }
    if (!areaIds.has(entry.areaId)) {
      throw new SyncError('UNKNOWN_AREA', `mapping area ${entry.areaId} does not exist`)
    }
    if (!slots.has(entry.slot)) {
      throw new SyncError('UNKNOWN_SLOT', `mapping slot ${entry.slot} is not in the source`)
    }
    if (seenSlots.has(entry.slot)) {
      throw new SyncError('MAPPING_SLOT_CONFLICT', `slot ${entry.slot} is mapped twice`)
    }
    if (seenAreas.has(entry.areaId)) {
      throw new SyncError('MAPPING_AREA_CONFLICT', `area ${entry.areaId} is mapped twice`)
    }
    seenSlots.add(entry.slot)
    seenAreas.add(entry.areaId)
    return { areaId: entry.areaId, slot: entry.slot }
  })
  return normalized.sort((a, b) => a.slot - b.slot)
}

const freezeRoster = (roster: RosterSample): FrozenRosterShip[] => {
  const seen = new Set<number>()
  return roster.ships.map((ship) => {
    if (!isNonNegativeInteger(ship.ownedId)) {
      throw new SyncError('INVALID_SLOT', `owned id ${String(ship.ownedId)} is invalid`)
    }
    if (!isNonNegativeIntegerOrNull(ship.tagSlot)) {
      throw new SyncError(
        'INVALID_TAG_SLOT',
        `owned id ${ship.ownedId} has an invalid tag slot`,
      )
    }
    if (seen.has(ship.ownedId)) {
      throw new SyncError(
        'DUPLICATE_ROSTER_SHIP',
        `owned id ${ship.ownedId} appears twice in the roster sample`,
      )
    }
    seen.add(ship.ownedId)
    return {
      level: ship.level,
      masterId: ship.masterId,
      name: ship.name,
      ownedId: ship.ownedId,
      tagSlot: ship.tagSlot,
      typeId: ship.typeId,
      typeLabel: ship.typeLabel,
    }
  })
}

// --- Area metadata synchronization -------------------------------------------

export const prepareAreaSync = (input: AreaSyncInput): PreparedAreaSync => {
  const { workspace, source, mapping, now } = input
  const content = workspace.content
  const frozen = freezeSource(source)
  const normalized = normalizeMapping(mapping, content, source)

  const mappedBySlot = new Map(normalized.map((entry) => [entry.slot, entry.areaId]))
  const mappedAreaIds = new Set(normalized.map((entry) => entry.areaId))
  // Every source slot is claimed after the update: by a mapped area or by a new
  // area for an unmapped slot. A retained area holding any of these slots as its
  // old hint must not keep competing for it.
  const claimedSlots = new Set(frozen.areas.map((area) => area.slot))

  const indexById = new Map(content.areas.map((area, index) => [area.id, index]))
  const nextAreas: NavyArea[] = content.areas.map((area) => area)

  const added: string[] = []
  const updated: string[] = []
  const unchanged: string[] = []

  for (const sourceArea of frozen.areas) {
    const areaId = mappedBySlot.get(sourceArea.slot)
    if (areaId === undefined) continue
    const index = indexById.get(areaId)
    if (index === undefined) continue
    const local = content.areas[index]
    const metadataSame =
      local.label === sourceArea.label &&
      local.color === sourceArea.color &&
      local.tagSlot === sourceArea.slot &&
      sameStringRecord(local.fleetLabels, sourceArea.fleetLabels)
    if (metadataSame) {
      unchanged.push(areaId)
    } else {
      updated.push(areaId)
      nextAreas[index] = {
        capturedAt: now,
        color: sourceArea.color,
        fleetLabels: { ...sourceArea.fleetLabels },
        id: local.id,
        label: sourceArea.label,
        tagSlot: sourceArea.slot,
      }
    }
  }

  const assignments: Record<string, number[]> = {}
  for (const [areaId, ids] of Object.entries(content.assignments)) {
    assignments[areaId] = [...ids]
  }

  for (const sourceArea of frozen.areas) {
    if (mappedBySlot.has(sourceArea.slot)) continue
    const id = input.createAreaId()
    if (indexById.has(id) || assignments[id] !== undefined) {
      throw new SyncError('UNKNOWN_AREA', `fresh area id ${id} already exists`)
    }
    added.push(id)
    nextAreas.push({
      capturedAt: now,
      color: sourceArea.color,
      fleetLabels: { ...sourceArea.fleetLabels },
      id,
      label: sourceArea.label,
      tagSlot: sourceArea.slot,
    })
    assignments[id] = []
  }

  const retained: string[] = []
  for (const [areaId, index] of indexById) {
    if (mappedAreaIds.has(areaId)) continue
    const area = nextAreas[index]
    if (claimedSlots.has(area.tagSlot)) {
      nextAreas[index] = { ...area, tagSlot: -1 }
      updated.push(areaId)
    }
    retained.push(areaId)
  }

  const changed = added.length > 0 || updated.length > 0
  const nextContent: NavyWorkspaceContent = changed
    ? { ...content, areas: nextAreas, assignments }
    : content

  return {
    accountId: workspace.accountId,
    baseRevisionId: workspace.revisionId,
    changed,
    kind: 'areas',
    mapping: normalized,
    nextContent,
    operation: { addedAreaIds: [...added], kind: 'update-areas', updatedAreaIds: [...updated] },
    source: frozen,
    summary: { added, retained, unchanged, updated },
    workspaceId: workspace.workspaceId,
  }
}

// --- Actual sortie-tag synchronization ---------------------------------------

export const prepareTagSync = (input: TagSyncInput): PreparedTagSync => {
  const { workspace, source, mapping, roster, now } = input
  if (workspace.accountId === null || workspace.accountId !== roster.accountId) {
    throw new SyncError(
      'ACCOUNT_MISMATCH',
      'actual tags require the loaded account and roster to describe the same account',
    )
  }

  const content = workspace.content
  const frozen = freezeSource(source)
  const normalized = normalizeMapping(mapping, content, source)
  const frozenRoster = freezeRoster(roster)

  const mappedBySlot = new Map(normalized.map((entry) => [entry.slot, entry.areaId]))
  const areaIds = new Set(content.areas.map((area) => area.id))

  const assignments: Record<string, number[]> = {}
  for (const [areaId, ids] of Object.entries(content.assignments)) {
    assignments[areaId] = [...ids]
  }
  const ships: Record<string, NavyShipRecord> = { ...content.ships }

  const locate = (ownedId: number): string | null => {
    for (const areaId of areaIds) {
      if ((assignments[areaId] ?? []).includes(ownedId)) return areaId
    }
    return null
  }

  const added: number[] = []
  const moved: number[] = []
  const unchanged: number[] = []

  for (const ship of frozenRoster) {
    if (ship.tagSlot === null) continue
    const targetId = mappedBySlot.get(ship.tagSlot)
    if (targetId === undefined) continue

    const currentAreaId = locate(ship.ownedId)
    if (currentAreaId === targetId) {
      unchanged.push(ship.ownedId)
      continue
    }

    for (const areaId of areaIds) {
      const ids = assignments[areaId] ?? []
      if (ids.includes(ship.ownedId)) {
        assignments[areaId] = ids.filter((id) => id !== ship.ownedId)
      }
    }
    assignments[targetId] = [...(assignments[targetId] ?? []), ship.ownedId]
    ships[String(ship.ownedId)] = {
      level: ship.level,
      masterId: ship.masterId,
      name: ship.name,
      observedAt: now,
      ownedId: ship.ownedId,
      typeId: ship.typeId,
      typeLabel: ship.typeLabel,
    }
    if (currentAreaId === null) added.push(ship.ownedId)
    else moved.push(ship.ownedId)
  }

  const changed = added.length > 0 || moved.length > 0
  const nextContent: NavyWorkspaceContent = changed
    ? { ...content, assignments, ships }
    : content

  return {
    accountId: workspace.accountId,
    baseRevisionId: workspace.revisionId,
    changed,
    kind: 'tags',
    mapping: normalized,
    nextContent,
    operation: {
      addedOwnedIds: [...added],
      kind: 'apply-tags',
      movedOwnedIds: [...moved],
    },
    roster: frozenRoster,
    source: frozen,
    summary: { added, moved, unchanged },
    workspaceId: workspace.workspaceId,
  }
}

// --- Freshness / acceptance --------------------------------------------------

const sortMapping = (
  mapping: SlotMappingInput,
): ReadonlyArray<{ slot: number; areaId: string }> =>
  mapping
    .map((entry) => ({ areaId: entry.areaId, slot: entry.slot }))
    .sort((a, b) => a.slot - b.slot)

const sameMapping = (
  prepared: NormalizedMapping,
  current: SlotMappingInput,
): boolean => {
  const next = sortMapping(current)
  if (prepared.length !== next.length) return false
  return prepared.every(
    (entry, index) =>
      entry.slot === next[index].slot && entry.areaId === next[index].areaId,
  )
}

const sameSource = (
  prepared: FrozenSource,
  current: SyncSourceSnapshot,
): boolean => {
  if (prepared.sourceId !== (current.sourceId ?? null)) return false
  if (prepared.areas.length !== current.areas.length) return false
  return prepared.areas.every((area, index) => {
    const other = current.areas[index]
    return (
      area.slot === other.slot &&
      area.label === other.label &&
      area.color === other.color &&
      sameStringRecord(area.fleetLabels, other.fleetLabels)
    )
  })
}

const sameFrozenShip = (a: FrozenRosterShip, b: RosterShip): boolean =>
  a.ownedId === b.ownedId &&
  a.tagSlot === b.tagSlot &&
  a.masterId === b.masterId &&
  a.name === b.name &&
  a.typeId === b.typeId &&
  a.typeLabel === b.typeLabel &&
  a.level === b.level

const sameRoster = (
  prepared: ReadonlyArray<FrozenRosterShip>,
  current: RosterSample,
): boolean => {
  if (prepared.length !== current.ships.length) return false
  const byId = new Map(current.ships.map((ship) => [ship.ownedId, ship]))
  if (byId.size !== current.ships.length) return false
  return prepared.every((ship) => {
    const other = byId.get(ship.ownedId)
    return other !== undefined && sameFrozenShip(ship, other)
  })
}

export const areaSyncFreshness = (
  prepared: PreparedAreaSync,
  current: AreaSyncCurrent,
): SyncFreshness => {
  const reasons: SyncStaleReason[] = []
  if (prepared.workspaceId !== current.workspace.workspaceId) {
    reasons.push('WORKSPACE_CHANGED')
  }
  if (prepared.baseRevisionId !== current.workspace.revisionId) {
    reasons.push('REVISION_CHANGED')
  }
  if (prepared.accountId !== current.workspace.accountId) {
    reasons.push('ACCOUNT_CHANGED')
  }
  if (!sameSource(prepared.source, current.source)) {
    reasons.push('SOURCE_CHANGED')
  }
  if (!sameMapping(prepared.mapping, current.mapping)) {
    reasons.push('MAPPING_CHANGED')
  }
  return { fresh: reasons.length === 0, reasons }
}

export const tagSyncFreshness = (
  prepared: PreparedTagSync,
  current: TagSyncCurrent,
): SyncFreshness => {
  const reasons: SyncStaleReason[] = []
  if (prepared.workspaceId !== current.workspace.workspaceId) {
    reasons.push('WORKSPACE_CHANGED')
  }
  if (prepared.baseRevisionId !== current.workspace.revisionId) {
    reasons.push('REVISION_CHANGED')
  }
  if (
    prepared.accountId !== current.roster.accountId ||
    prepared.accountId !== current.workspace.accountId
  ) {
    reasons.push('ACCOUNT_CHANGED')
  }
  if (!sameSource(prepared.source, current.source)) {
    reasons.push('SOURCE_CHANGED')
  }
  if (!sameMapping(prepared.mapping, current.mapping)) {
    reasons.push('MAPPING_CHANGED')
  }
  if (!sameRoster(prepared.roster, current.roster)) {
    reasons.push('ROSTER_CHANGED')
  }
  return { fresh: reasons.length === 0, reasons }
}

const acceptance = (
  freshness: SyncFreshness,
  apply: SyncAcceptance['apply'],
): SyncAcceptance => ({
  apply: freshness.fresh ? apply : null,
  fresh: freshness.fresh,
  reasons: freshness.reasons,
})

export const acceptAreaSync = (
  prepared: PreparedAreaSync,
  current: AreaSyncCurrent,
): SyncAcceptance => {
  const freshness = areaSyncFreshness(prepared, current)
  const apply =
    freshness.fresh && prepared.changed
      ? { content: prepared.nextContent, operation: prepared.operation }
      : null
  return acceptance(freshness, apply)
}

export const acceptTagSync = (
  prepared: PreparedTagSync,
  current: TagSyncCurrent,
): SyncAcceptance => {
  const freshness = tagSyncFreshness(prepared, current)
  const apply =
    freshness.fresh && prepared.changed
      ? { content: prepared.nextContent, operation: prepared.operation }
      : null
  return acceptance(freshness, apply)
}
