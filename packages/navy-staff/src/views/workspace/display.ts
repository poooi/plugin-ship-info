// Reusable display-content boundary. It turns one durable workspace content
// snapshot into read-only view models. Editing uses the live overlay when
// allowed; previews and future reference exports pass `allowLive: false` so they
// show captured records only.

import { reverseSuperTypeMap, type IPlannerShipData } from '../planner/selectors'
import type { NavyShipRecord, NavyWorkspaceContent } from './types'

export interface WorkspaceShipRow {
  ownedId: number
  masterId: number | null
  name: string | null
  typeId: number | null
  level: number | null
  /** Super-type index, or -1 for an unknown/missing type. */
  superTypeIndex: number
  /** True when this row was resolved from the live roster. */
  live: boolean
  fleetId: number
  /**
   * Live sortie tag currently carried by the ship (1-based game
   * `api_sally_area`), or null when untagged/absent or live data is not
   * allowed. Purely informational: it never affects the planned assignment.
   */
  actualTag: number | null
  avatarOffset: number
  /** Assigned area color, or null when unassigned. */
  assignedColor: string | null
  record: NavyShipRecord | null
}

export interface WorkspaceAreaView {
  id: string
  label: string
  fleetLabels: Record<string, string>
  color: string
  tagSlot: number
  index: number
  ships: WorkspaceShipRow[]
}

export interface DisplayContent {
  name: string
  areas: WorkspaceAreaView[]
  /** Captured ships plus (only when live is allowed) eligible live-only ships. */
  gridShips: WorkspaceShipRow[]
}

export interface DisplayOptions {
  liveById?: Map<number, IPlannerShipData>
  fleetIdMap?: Record<number, number>
  /** Live owned ID to 1-based sortie tag, read from the raw roster. */
  tagByOwnedId?: Record<number, number>
  allowLive?: boolean
}

const emptyRow = (ownedId: number): WorkspaceShipRow => ({
  actualTag: null,
  assignedColor: null,
  avatarOffset: 0.555,
  fleetId: -1,
  level: null,
  live: false,
  masterId: null,
  name: null,
  ownedId,
  record: null,
  superTypeIndex: -1,
  typeId: null,
})

const buildRow = (
  ownedId: number,
  content: NavyWorkspaceContent,
  assignedColor: string | null,
  options: DisplayOptions,
): WorkspaceShipRow => {
  const live =
    options.allowLive && options.liveById ? options.liveById.get(ownedId) : undefined
  const record = content.ships[String(ownedId)] ?? null
  const typeId = live ? live.typeId : record?.typeId ?? null
  return {
    actualTag: options.allowLive ? options.tagByOwnedId?.[ownedId] ?? null : null,
    assignedColor,
    avatarOffset: live ? live.avatarOffset ?? 0.555 : 0.555,
    // Fleet badges are live-only; previews never show them.
    fleetId: live ? options.fleetIdMap?.[ownedId] ?? -1 : -1,
    level: live ? live.lv : record?.level ?? null,
    live: Boolean(live),
    masterId: live ? live.shipId : record?.masterId ?? null,
    name: live ? live.name : record?.name ?? null,
    ownedId,
    record,
    superTypeIndex: typeId !== null ? reverseSuperTypeMap[typeId] ?? -1 : -1,
    typeId,
  }
}

const assignedColorOf = (
  content: NavyWorkspaceContent,
  ownedId: number,
): string | null => {
  for (const area of content.areas) {
    if ((content.assignments[area.id] ?? []).includes(ownedId)) return area.color
  }
  return null
}

export const buildDisplayContent = (
  content: NavyWorkspaceContent,
  options: DisplayOptions = {},
): DisplayContent => {
  const areas = content.areas.map((area, index) => ({
    color: area.color,
    fleetLabels: area.fleetLabels,
    id: area.id,
    index,
    label: area.label,
    ships: (content.assignments[area.id] ?? []).map((id) =>
      buildRow(id, content, area.color, options),
    ),
    tagSlot: area.tagSlot,
  }))

  // Captured ships are exactly the ships referenced by this revision's
  // assignments. A removed ship disappears from a historical grid even though
  // its display record may remain cached in `content.ships`.
  const capturedIds: number[] = []
  const seen = new Set<number>()
  for (const area of content.areas) {
    for (const id of content.assignments[area.id] ?? []) {
      if (!seen.has(id)) {
        seen.add(id)
        capturedIds.push(id)
      }
    }
  }

  const gridShips = capturedIds.map((id) =>
    buildRow(id, content, assignedColorOf(content, id), options),
  )
  if (options.allowLive && options.liveById) {
    for (const id of options.liveById.keys()) {
      if (seen.has(id)) continue
      seen.add(id)
      gridShips.push(buildRow(id, content, null, options))
    }
  }

  return { areas, gridShips, name: content.name }
}

export const emptyDisplayContent = (): DisplayContent => ({
  areas: [],
  gridShips: [],
  name: '',
})

export { emptyRow }
