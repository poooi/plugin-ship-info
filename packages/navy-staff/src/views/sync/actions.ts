// Durable sync actions. Acceptance re-checks current Redux state (not rendered
// props) and only then dispatches one apply-sync action; the reducer verifies the
// target workspace and base revision before appending the single revision.

import type { Action } from 'redux'
import type { ThunkAction } from 'redux-thunk'

import type { IState } from 'views/utils/selectors'

import { onApplySync } from '../workspace/creators'
import { newNavyId } from '../workspace/types'
import {
  acceptAreaSync,
  acceptTagSync,
  type PreparedAreaSync,
  type PreparedTagSync,
  type SlotMappingInput,
  type SyncAcceptance,
  type SyncStaleReason,
} from './core'
import {
  selectedSyncWorkspaceSelector,
  syncRosterSelector,
  syncSourceSelector,
} from './selectors'

type NavyThunk<Result = void> = ThunkAction<Result, IState, unknown, Action>

const stale = (reason: SyncStaleReason): SyncAcceptance => ({
  apply: null,
  fresh: false,
  reasons: [reason],
})

/**
 * Re-validates a prepared batch against current state and appends it once.
 * Returns the acceptance result so the caller can surface a stale preview.
 */
export const commitSyncBatch = ({
  prepared,
  mapping,
}: {
  prepared: PreparedAreaSync | PreparedTagSync
  mapping: SlotMappingInput
}): NavyThunk<SyncAcceptance> => (dispatch, getState) => {
  const state = getState()
  const workspace = selectedSyncWorkspaceSelector(state)
  const source = syncSourceSelector(state)
  if (!workspace || !source) return stale('SOURCE_CHANGED')

  let result: SyncAcceptance
  if (prepared.kind === 'areas') {
    result = acceptAreaSync(prepared, { mapping, source, workspace })
  } else {
    const roster = syncRosterSelector(state)
    result = roster
      ? acceptTagSync(prepared, { mapping, roster, source, workspace })
      : stale('ROSTER_CHANGED')
  }

  if (result.fresh && result.apply) {
    dispatch(
      onApplySync({
        accountId: prepared.accountId,
        baseRevisionId: prepared.baseRevisionId,
        content: result.apply.content,
        now: new Date().toISOString(),
        operation: result.apply.operation,
        workspaceId: prepared.workspaceId,
      }),
    )
  }
  return result
}

/** Allocates a fresh local area id for area sync additions. */
export const newSyncAreaId = (): string => newNavyId('area')
