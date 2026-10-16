// Workspace selectors. They derive the selected workspace's content, area view
// models, and grid rows from captured data, optionally overlaid with the live
// roster only when the workspace owner matches the loaded account.

import { get } from 'lodash'
import { createSelector } from 'reselect'

import { extensionSelectorFactory, IState } from 'views/utils/selectors'

import { shipFleetIdMapSelector } from '@poi-plugins/ship-info-shared/fleet'
import { PLUGIN_KEY } from '../plugin-identity'
import {
  reverseSuperTypeMap,
  shipMenuDataSelector,
  type IPlannerShipData,
} from '../planner/selectors'
import { hostOwnerMemberId } from './capture'
import { contentAtCursor } from './operations'
import {
  emptyNavyData,
  type NavyArea,
  type NavyData,
  type NavyShipRecord,
  type NavyWorkspace,
  type NavyWorkspaceContent,
} from './types'

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
  avatarOffset: number
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

export const navyDataSelector = (state: IState): NavyData => {
  const slice = extensionSelectorFactory(PLUGIN_KEY)(state) as
    | { navy?: NavyData }
    | undefined
  return slice?.navy ?? emptyNavyData()
}

export const workspacesSelector = createSelector(
  [navyDataSelector],
  (navy) => navy.workspaces,
)

export const selectedWorkspaceIdSelector = createSelector(
  [navyDataSelector],
  (navy) => navy.selectedWorkspaceId,
)

export const selectedWorkspaceSelector = createSelector(
  [navyDataSelector],
  (navy): NavyWorkspace | undefined =>
    navy.workspaces.find((workspace) => workspace.id === navy.selectedWorkspaceId),
)

export const selectedContentSelector = createSelector(
  [selectedWorkspaceSelector],
  (workspace): NavyWorkspaceContent | undefined =>
    workspace ? contentAtCursor(workspace) : undefined,
)

export const ownerMemberIdSelector = (state: IState): string | null =>
  hostOwnerMemberId(state)

export interface OwnerStatus {
  hostOwnerMemberId: string | null
  matches: boolean
  workspaceOwnerMemberId: string | null
}

export const ownerStatusSelector = createSelector(
  [selectedWorkspaceSelector, ownerMemberIdSelector],
  (workspace, hostOwner): OwnerStatus => {
    const workspaceOwnerMemberId = workspace?.ownerMemberId ?? null
    return {
      hostOwnerMemberId: hostOwner,
      matches:
        workspaceOwnerMemberId !== null && workspaceOwnerMemberId === hostOwner,
      workspaceOwnerMemberId,
    }
  },
)

/** Live roster overlay, empty unless the selected workspace owner matches. */
const liveRowsByIdSelector = createSelector(
  [ownerStatusSelector, (state: IState) => shipMenuDataSelector(state)],
  (ownerStatus, liveRows): Map<number, IPlannerShipData> => {
    const map = new Map<number, IPlannerShipData>()
    if (!ownerStatus.matches) return map
    for (const row of liveRows) map.set(row.id, row)
    return map
  },
)

const fleetIdMapSelector = (state: IState): Record<number, number> =>
  get(state, 'info.ships') ? shipFleetIdMapSelector(state) : {}

const buildRow = (
  ownedId: number,
  content: NavyWorkspaceContent,
  liveById: Map<number, IPlannerShipData>,
  fleetIdMap: Record<number, number>,
): WorkspaceShipRow => {
  const record = content.ships[String(ownedId)] ?? null
  const live = liveById.get(ownedId)
  const typeId = live ? live.typeId : record?.typeId ?? null
  return {
    avatarOffset: live ? live.avatarOffset ?? 0.555 : 0.555,
    // Fleet badges are live-only; a mismatched account must not reveal them.
    fleetId: live ? fleetIdMap[ownedId] ?? -1 : -1,
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

export const areaViewsSelector = createSelector(
  [selectedContentSelector, liveRowsByIdSelector, fleetIdMapSelector],
  (content, liveById, fleetIdMap): WorkspaceAreaView[] => {
    if (!content) return []
    return content.areas.map((area, index) => ({
      color: area.color,
      fleetLabels: area.fleetLabels,
      id: area.id,
      index,
      label: area.label,
      ships: (content.assignments[area.id] ?? []).map((id) =>
        buildRow(id, content, liveById, fleetIdMap),
      ),
      tagSlot: area.tagSlot,
    }))
  },
)

export const assignedShipIdsSelector = createSelector(
  [selectedContentSelector],
  (content): Set<number> => {
    const ids = new Set<number>()
    if (!content) return ids
    for (const area of content.areas) {
      for (const id of content.assignments[area.id] ?? []) ids.add(id)
    }
    return ids
  },
)

/** Grid rows: saved referenced ships plus eligible live-only roster ships. */
export const gridRowsSelector = createSelector(
  [selectedContentSelector, liveRowsByIdSelector, fleetIdMapSelector],
  (content, liveById, fleetIdMap): WorkspaceShipRow[] => {
    if (!content) return []
    const rows: WorkspaceShipRow[] = []
    const seen = new Set<number>()
    for (const area of content.areas) {
      for (const id of content.assignments[area.id] ?? []) {
        if (seen.has(id)) continue
        seen.add(id)
        rows.push(buildRow(id, content, liveById, fleetIdMap))
      }
    }
    for (const id of liveById.keys()) {
      if (seen.has(id)) continue
      seen.add(id)
      rows.push(buildRow(id, content, liveById, fleetIdMap))
    }
    return rows
  },
)

/** Live picker rows, empty unless the owner matches. */
export const livePickerRowsSelector = createSelector(
  [liveRowsByIdSelector],
  (liveById): IPlannerShipData[] => [...liveById.values()],
)

export const areasSelector = createSelector(
  [selectedContentSelector],
  (content): NavyArea[] => content?.areas ?? [],
)

/** ownedId -> assigned area color, for grid background. */
export const assignedColorMapSelector = createSelector(
  [selectedContentSelector],
  (content): Record<number, string> => {
    const map: Record<number, string> = {}
    if (!content) return map
    for (const area of content.areas) {
      for (const id of content.assignments[area.id] ?? []) map[id] = area.color
    }
    return map
  },
)

export const findAreaIdForShipSelector = (
  state: IState,
  shipId: number,
): string | null => {
  const content = selectedContentSelector(state)
  if (!content) return null
  for (const area of content.areas) {
    if ((content.assignments[area.id] ?? []).includes(shipId)) return area.id
  }
  return null
}
