// Durable Navy Staff workspace model (file format version 2).
//
// The persisted root is `{ version, selectedWorkspaceId, workspaces, legacyArchive }`.
// A workspace owns identity metadata plus a list of full-state revisions and an
// editable cursor. Area assignments refer to stable local area IDs, and display
// records for referenced ships are stored alongside the plan so a workspace
// survives host data changes.

export const NAVY_DATA_VERSION = 2

/** A captured planning area (a sortie-tag group). */
export interface NavyArea {
  /** Stable local ID; assignments refer to this, never to a host array position. */
  id: string
  /** Captured map label (e.g. `E1`). */
  label: string
  /** Captured localized fleet labels, keyed by locale. May be partial. */
  fleetLabels: Record<string, string>
  /** Captured display color. */
  color: string
  /** Original host tag slot (0-based) as a mapping hint; -1 when unknown. */
  tagSlot: number
  /** Local capture time; not an upstream version. */
  capturedAt: string
}

/** Saved display record for an owned ship referenced by a plan. */
export interface NavyShipRecord {
  ownedId: number
  masterId: number | null
  /** Raw master name (or a captured label); null when unknown. */
  name: string | null
  typeId: number | null
  /** Captured type label; null when unknown. */
  typeLabel: string | null
  level: number | null
  observedAt: string
}

/** Editable workspace content. Renaming is part of content so it is undoable. */
export interface NavyWorkspaceContent {
  name: string
  areas: NavyArea[]
  /** areaId -> ordered owned ship IDs. A ship appears in at most one area. */
  assignments: Record<string, number[]>
  /** String(ownedId) -> saved display record. */
  ships: Record<string, NavyShipRecord>
}

export type NavyOperation =
  | { kind: 'initial' }
  | { kind: 'migrated' }
  | { kind: 'create' }
  | { kind: 'duplicate'; from: string }
  | { kind: 'rename'; name: string }
  | { kind: 'add-ship'; areaId: string; shipId: number }
  | { kind: 'remove-ship'; areaId: string; shipId: number }
  | { kind: 'move-ship'; fromAreaId: string; toAreaId: string; shipId: number }
  | { kind: 'restore'; from: string }

export interface NavyRevision {
  /** Stable revision ID; the history layer uses it as `previewRevisionId`. */
  id: string
  /** Operation time (ISO string). */
  time: string
  op: NavyOperation
  content: NavyWorkspaceContent
}

export interface NavyWorkspace {
  id: string
  createdAt: string
  revisions: NavyRevision[]
  /** Index of the editable revision. */
  cursor: number
}

/** Durable root state (version is stamped by persistence). */
export interface NavyData {
  selectedWorkspaceId: string
  workspaces: NavyWorkspace[]
  legacyArchive: Record<string, unknown>
}

export const NAVY_DEFAULT_AREA_COLOR = '#8a9ba8'

let idCounter = 0

/** Generates a local opaque workspace/area ID. */
export const newNavyId = (prefix: string): string => {
  idCounter += 1
  const random = Math.random().toString(36).slice(2, 10)
  return `${prefix}-${Date.now().toString(36)}-${random}-${idCounter}`
}

export const createEmptyContent = (name: string): NavyWorkspaceContent => ({
  areas: [],
  assignments: {},
  name,
  ships: {},
})

export const createRevision = (
  op: NavyOperation,
  content: NavyWorkspaceContent,
  time: string,
): NavyRevision => ({ content, id: newNavyId('rev'), op, time })

export const createWorkspace = ({
  areas,
  name,
  now,
  op = { kind: 'create' },
}: {
  areas: NavyArea[]
  name: string
  now: string
  op?: NavyOperation
}): NavyWorkspace => {
  const content: NavyWorkspaceContent = {
    areas,
    assignments: Object.fromEntries(areas.map((area) => [area.id, []])),
    name,
    ships: {},
  }
  return {
    createdAt: now,
    cursor: 0,
    id: newNavyId('ws'),
    revisions: [createRevision(op, content, now)],
  }
}

export const emptyNavyData = (): NavyData => ({
  legacyArchive: {},
  selectedWorkspaceId: '',
  workspaces: [],
})
