// Workspace selectors. They derive the selected workspace's content, history
// position, and display content. Editing display content is overlaid with the
// live roster only when the loaded account file matches the current host.

import { get } from 'lodash'
import { createSelector } from 'reselect'

import { extensionSelectorFactory, IState } from 'views/utils/selectors'

import { shipFleetIdMapSelector } from '@poi-plugins/ship-info-shared/fleet'
import { normalizeMemberId } from '../account'
import { PLUGIN_KEY } from '../plugin-identity'
import { shipMenuDataSelector, type IPlannerShipData } from '../planner/selectors'
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

// The transient account file currently loaded, or null when not ready. It names
// the account whose data is in the slice; it is never persisted.
export const loadedAccountIdSelector = createSelector(
  [
    (state: IState) =>
      extensionSelectorFactory(PLUGIN_KEY)(state) as
        | { account?: string | null; ready?: boolean }
        | undefined,
  ],
  (slice): string | null => (slice?.ready ? slice.account ?? null : null),
)

/** Normalized member id currently reported by the host, or null. */
export const hostMemberIdSelector = (state: IState): string | null =>
  normalizeMemberId(get(state, 'info.basic.api_member_id'))

const rosterLoadedSelector = (state: IState): boolean => {
  const ships = get(state, 'info.ships')
  return Boolean(
    ships && typeof ships === 'object' && Object.keys(ships as object).length > 0,
  )
}

/**
 * Live roster data may be used only when the ready file account matches the
 * current host account and the roster has loaded. The account file itself is
 * the ownership boundary.
 */
export const liveRosterAvailableSelector = createSelector(
  [loadedAccountIdSelector, hostMemberIdSelector, rosterLoadedSelector],
  (loaded, host, rosterLoaded): boolean =>
    loaded !== null && host !== null && loaded === host && rosterLoaded,
)

/** Live roster overlay, empty unless the loaded account matches the host. */
const liveRowsByIdSelector = createSelector(
  [liveRosterAvailableSelector, (state: IState) => shipMenuDataSelector(state)],
  (available, liveRows): Map<number, IPlannerShipData> => {
    const map = new Map<number, IPlannerShipData>()
    if (!available) return map
    for (const row of liveRows) map.set(row.id, row)
    return map
  },
)

const fleetIdMapSelector = (state: IState): Record<number, number> =>
  get(state, 'info.ships') ? shipFleetIdMapSelector(state) : {}

/** Display content for the editable current revision (live overlay when live). */
export const editingDisplayContentSelector = createSelector(
  [selectedContentSelector, liveRosterAvailableSelector, liveRowsByIdSelector, fleetIdMapSelector],
  (content, liveAvailable, liveById, fleetIdMap): DisplayContent =>
    content
      ? buildDisplayContent(content, {
          allowLive: liveAvailable,
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

/** Live picker rows, empty unless the live roster is available. */
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
