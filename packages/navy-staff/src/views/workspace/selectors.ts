// Workspace selectors. They derive the selected workspace's content, history
// position, and display content. Editing display content is overlaid with the
// live roster only when the workspace owner matches the loaded account.

import { get } from 'lodash'
import { createSelector } from 'reselect'

import { extensionSelectorFactory, IState } from 'views/utils/selectors'

import { shipFleetIdMapSelector } from '@poi-plugins/ship-info-shared/fleet'
import { PLUGIN_KEY } from '../plugin-identity'
import { shipMenuDataSelector, type IPlannerShipData } from '../planner/selectors'
import { hostOwnerMemberId } from './capture'
import {
  buildDisplayContent,
  emptyDisplayContent,
  type DisplayContent,
  type WorkspaceAreaView,
  type WorkspaceShipRow,
} from './display'
import { contentAtCursor } from './operations'
import {
  emptyNavyData,
  type NavyArea,
  type NavyData,
  type NavyRevision,
  type NavyWorkspace,
  type NavyWorkspaceContent,
} from './types'

export type { DisplayContent, WorkspaceAreaView, WorkspaceShipRow }

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

export const revisionsSelector = createSelector(
  [selectedWorkspaceSelector],
  (workspace): NavyRevision[] => workspace?.revisions ?? [],
)

export const cursorSelector = createSelector(
  [selectedWorkspaceSelector],
  (workspace): number => workspace?.cursor ?? 0,
)

export const canUndoSelector = createSelector(
  [selectedWorkspaceSelector],
  (workspace): boolean => Boolean(workspace && workspace.cursor > 0),
)

export const canRedoSelector = createSelector(
  [selectedWorkspaceSelector],
  (workspace): boolean =>
    Boolean(workspace && workspace.cursor < workspace.revisions.length - 1),
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

/** Display content for the editable current revision (live overlay when owned). */
export const editingDisplayContentSelector = createSelector(
  [selectedContentSelector, ownerStatusSelector, liveRowsByIdSelector, fleetIdMapSelector],
  (content, ownerStatus, liveById, fleetIdMap): DisplayContent =>
    content
      ? buildDisplayContent(content, {
          allowLive: ownerStatus.matches,
          fleetIdMap,
          liveById,
        })
      : emptyDisplayContent(),
)

export const areaViewsSelector = createSelector(
  [editingDisplayContentSelector],
  (display): WorkspaceAreaView[] => display.areas,
)

export const gridRowsSelector = createSelector(
  [editingDisplayContentSelector],
  (display): WorkspaceShipRow[] => display.gridShips,
)

export const areasSelector = createSelector(
  [selectedContentSelector],
  (content): NavyArea[] => content?.areas ?? [],
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

/** Live picker rows, empty unless the owner matches. */
export const livePickerRowsSelector = createSelector(
  [liveRowsByIdSelector],
  (liveById): IPlannerShipData[] => [...liveById.values()],
)

/**
 * Read-only display content for a captured revision. Live data is never used,
 * so previews and reference exports show only captured records.
 */
export const capturedDisplayContent = (
  content: NavyWorkspaceContent,
): DisplayContent => buildDisplayContent(content, { allowLive: false })
