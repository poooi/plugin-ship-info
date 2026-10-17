// Thunks that capture host data. Plain action creators live in ./creators and
// are re-exported here for convenience.

import type { Action } from 'redux'
import type { ThunkAction } from 'redux-thunk'

import type { IState } from 'views/utils/selectors'
import { shipTypeLabelKeys } from '@poi-plugins/ship-info-shared/ship-types'

import { shipMenuDataSelector } from '../planner/selectors'
import { freshWorkspaceAreas } from './capture'
import {
  onAddShip,
  onBatchAssign,
  onCreateWorkspace,
  onMoveShip,
  onRemoveShip,
  onRenameWorkspace,
} from './creators'
import { contentAtCursor } from './operations'
import {
  liveRosterAvailableSelector,
  navyDataSelector,
  selectedWorkspaceSelector,
} from './selectors'
import {
  createRevision,
  createWorkspace as buildWorkspace,
  newNavyId,
  type NavyShipRecord,
  type NavyWorkspace,
} from './types'

export { NAVY_ACTIONS } from './action-types'
export {
  onAddShip,
  onBatchAssign,
  onCreateWorkspace,
  onDeleteWorkspace,
  onMoveShip,
  onRedo,
  onRemoveShip,
  onRenameWorkspace,
  onRestore,
  onSelectWorkspace,
  onUndo,
} from './creators'

// --- Thunks ------------------------------------------------------------------

type NavyThunk = ThunkAction<void, IState, unknown, Action>

// Live enrichment is only allowed while the live roster is available (the
// loaded account file matches the host). A mismatched roster must never
// overwrite saved records.
const recordForShip = (
  state: IState,
  shipId: number,
  now: string,
): NavyShipRecord | null => {
  if (!liveRosterAvailableSelector(state)) return null
  const live = shipMenuDataSelector(state).find((item) => item.id === shipId)
  if (!live) return null
  return {
    level: live.lv,
    masterId: live.shipId,
    name: live.name,
    observedAt: now,
    ownedId: shipId,
    typeId: live.typeId,
    typeLabel: shipTypeLabelKeys[live.typeId] ?? null,
  }
}

export const createWorkspace = (name: string): NavyThunk => (dispatch, getState) => {
  const state = getState()
  const now = new Date().toISOString()
  const workspace = buildWorkspace({
    areas: freshWorkspaceAreas(state, now),
    name,
    now,
    op: { kind: 'create' },
  })
  dispatch(onCreateWorkspace({ workspace }))
}

export const duplicateWorkspace = (id: string): NavyThunk => (dispatch, getState) => {
  const found = navyDataSelector(getState()).workspaces.find((w) => w.id === id)
  if (!found) return
  const now = new Date().toISOString()
  const content = contentAtCursor(found)
  const duplicate: NavyWorkspace = {
    createdAt: now,
    cursor: 0,
    id: newNavyId('ws'),
    revisions: [
      createRevision(
        { from: found.id, kind: 'duplicate' },
        {
          ...content,
          areas: content.areas.map((area) => ({ ...area })),
          assignments: Object.fromEntries(
            Object.entries(content.assignments).map(([key, ids]) => [key, [...ids]]),
          ),
          ships: { ...content.ships },
        },
        now,
      ),
    ],
  }
  dispatch(onCreateWorkspace({ workspace: duplicate }))
}

export const addShipToArea = (areaId: string, shipId: number): NavyThunk => (
  dispatch,
  getState,
) => {
  const now = new Date().toISOString()
  const record = recordForShip(getState(), shipId, now)
  if (!record) return
  dispatch(onAddShip({ areaId, now, record, shipId }))
}

export const assignShip = (shipId: number, areaId: string | null): NavyThunk => (
  dispatch,
  getState,
) => {
  const state = getState()
  const workspace = selectedWorkspaceSelector(state)
  if (!workspace) return
  const current = contentAtCursor(workspace)
  const now = new Date().toISOString()
  const fromAreaId = current.areas
    .map((area) => area.id)
    .find((id) => (current.assignments[id] ?? []).includes(shipId))

  if (areaId === null) {
    if (fromAreaId) dispatch(onRemoveShip({ areaId: fromAreaId, now, shipId }))
    return
  }
  if (fromAreaId === areaId) return
  if (!fromAreaId) {
    dispatch(addShipToArea(areaId, shipId))
    return
  }
  const record = recordForShip(state, shipId, now) ?? undefined
  dispatch(onMoveShip({ fromAreaId, now, record, shipId, toAreaId: areaId }))
}

export const removeShipFromArea = (areaId: string, shipId: number): NavyThunk => (
  dispatch,
) => {
  dispatch(onRemoveShip({ areaId, now: new Date().toISOString(), shipId }))
}

/**
 * Batch assignment from the ship list. Assigns (or removes, when `target` is
 * null) the eligible listed ships as one revision; a no-op batch appends
 * nothing in the reducer.
 *
 * Eligibility mirrors the single-ship rules under the existing account/load
 * boundary: an already-assigned ship may be moved without a live record, while
 * an unassigned ship may only be added when a matching live record exists
 * (missing-roster and cached-unassigned ships are skipped). Only ships that
 * actually change are sent, so records are captured for real additions only.
 */
export const applyShipBatch = ({
  target,
  shipIds,
}: {
  target: string | null
  shipIds: number[]
}): NavyThunk => (dispatch, getState) => {
  if (shipIds.length === 0) return
  const state = getState()
  const workspace = selectedWorkspaceSelector(state)
  if (!workspace) return
  const content = contentAtCursor(workspace)
  const now = new Date().toISOString()
  const eligible: number[] = []
  const records: NavyShipRecord[] = []

  for (const shipId of shipIds) {
    const currentAreaId = content.areas
      .map((area) => area.id)
      .find((areaId) => (content.assignments[areaId] ?? []).includes(shipId))

    if (target === null) {
      // Removal only applies to a currently assigned ship.
      if (currentAreaId) eligible.push(shipId)
      continue
    }
    if (currentAreaId) {
      if (currentAreaId === target) continue // same-area no-op: never enrich
      eligible.push(shipId)
      // A changed move is enriched with the live record when the roster is
      // available, exactly like a single move; a captured ship keeps its saved
      // values when the live record is unavailable.
      const movedRecord = recordForShip(state, shipId, now)
      if (movedRecord) records.push(movedRecord)
      continue
    }
    // Addition requires a live record, exactly as addShipToArea does.
    const record = recordForShip(state, shipId, now)
    if (record) {
      eligible.push(shipId)
      records.push(record)
    }
  }

  if (eligible.length === 0) return
  dispatch(onBatchAssign({ now, records, shipIds: eligible, target }))
}
