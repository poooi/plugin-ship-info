// Pure content transformations and the single revision-append helper. UI callers
// and thunks build a next content object, then append it as one operation so the
// history layer added later needs no storage migration.

import type {
  NavyOperation,
  NavyShipRecord,
  NavyWorkspace,
  NavyWorkspaceContent,
} from './types'
import { createRevision } from './types'

export const contentAtCursor = (workspace: NavyWorkspace): NavyWorkspaceContent =>
  workspace.revisions[workspace.cursor].content

/**
 * Appends one operation at the editable cursor and moves the cursor to it.
 * Any redo tail is discarded, matching the design's linear-history rule.
 */
export const appendRevision = (
  workspace: NavyWorkspace,
  op: NavyOperation,
  content: NavyWorkspaceContent,
  time: string,
): NavyWorkspace => {
  const head = workspace.revisions.slice(0, workspace.cursor + 1)
  const revisions = [...head, createRevision(op, content, time)]
  return { ...workspace, cursor: revisions.length - 1, revisions }
}

const withoutShip = (
  assignments: Record<string, number[]>,
  shipId: number,
): Record<string, number[]> => {
  const next: Record<string, number[]> = {}
  for (const [areaId, ids] of Object.entries(assignments)) {
    next[areaId] = ids.filter((id) => id !== shipId)
  }
  return next
}

export const placeShip = (
  content: NavyWorkspaceContent,
  areaId: string,
  shipId: number,
): NavyWorkspaceContent => {
  if (!content.areas.some((area) => area.id === areaId)) return content
  // A ship already in this area is a no-op: never reorder or create a revision.
  if ((content.assignments[areaId] ?? []).includes(shipId)) return content
  const cleared = withoutShip(content.assignments, shipId)
  const current = cleared[areaId] ?? []
  return {
    ...content,
    assignments: { ...cleared, [areaId]: [...current, shipId] },
  }
}

export const removeShipFromArea = (
  content: NavyWorkspaceContent,
  areaId: string,
  shipId: number,
): NavyWorkspaceContent => {
  const ids = content.assignments[areaId]
  if (!ids || !ids.includes(shipId)) return content
  return {
    ...content,
    assignments: {
      ...content.assignments,
      [areaId]: ids.filter((id) => id !== shipId),
    },
  }
}

export const moveShip = (
  content: NavyWorkspaceContent,
  fromAreaId: string,
  toAreaId: string,
  shipId: number,
): NavyWorkspaceContent => {
  if (fromAreaId === toAreaId) return content
  if (!content.areas.some((area) => area.id === toAreaId)) return content
  // Stale command: the source must actually contain the ship.
  if (!(content.assignments[fromAreaId] ?? []).includes(shipId)) return content
  return placeShip(content, toAreaId, shipId)
}

export const withName = (
  content: NavyWorkspaceContent,
  name: string,
): NavyWorkspaceContent => ({ ...content, name })

export const withShipRecord = (
  content: NavyWorkspaceContent,
  record: NavyShipRecord,
): NavyWorkspaceContent => ({
  ...content,
  ships: { ...content.ships, [String(record.ownedId)]: record },
})

/** Stable serialization used to detect an unchanged restore target. */
export const contentFingerprint = (content: NavyWorkspaceContent): string =>
  JSON.stringify(content)
