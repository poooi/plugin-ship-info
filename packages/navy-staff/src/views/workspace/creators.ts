// Plain action creators. Kept free of host selectors so reducers and node tests
// can use them without the host boundary; thunks live in ./actions.

import { NAVY_ACTIONS } from './action-types'
import type {
  NavyOperation,
  NavyShipRecord,
  NavyWorkspace,
  NavyWorkspaceContent,
} from './types'

export const onCreateWorkspace = ({ workspace }: { workspace: NavyWorkspace }) => ({
  type: NAVY_ACTIONS.create,
  workspace,
})

export const onRenameWorkspace = ({
  id,
  name,
  now,
}: {
  id: string
  name: string
  now: string
}) => ({
  type: NAVY_ACTIONS.rename,
  id,
  name,
  now,
})

export const onDeleteWorkspace = ({ id }: { id: string }) => ({
  type: NAVY_ACTIONS.delete,
  id,
})

export const onSelectWorkspace = ({ id }: { id: string }) => ({
  type: NAVY_ACTIONS.select,
  id,
})

export const onAddShip = ({
  areaId,
  shipId,
  record,
  now,
}: {
  areaId: string
  shipId: number
  record: NavyShipRecord
  now: string
}) => ({
  type: NAVY_ACTIONS.addShip,
  areaId,
  shipId,
  record,
  now,
})

export const onRemoveShip = ({
  areaId,
  shipId,
  now,
}: {
  areaId: string
  shipId: number
  now: string
}) => ({
  type: NAVY_ACTIONS.removeShip,
  areaId,
  shipId,
  now,
})

export const onMoveShip = ({
  fromAreaId,
  toAreaId,
  shipId,
  record,
  now,
}: {
  fromAreaId: string
  toAreaId: string
  shipId: number
  record?: NavyShipRecord
  now: string
}) => ({
  type: NAVY_ACTIONS.moveShip,
  fromAreaId,
  toAreaId,
  shipId,
  record,
  now,
})

export const onUndo = () => ({ type: NAVY_ACTIONS.undo })

export const onRedo = () => ({ type: NAVY_ACTIONS.redo })

/**
 * Applies many ship assignments/removals as one revision. `target` is the local
 * area ID to assign into, or null to remove the listed ships from wherever they
 * are. `records` carries display records for newly placed live ships. The
 * reducer skips no-op changes and appends nothing when the content is unchanged.
 */
export const onBatchAssign = ({
  target,
  shipIds,
  records,
  now,
}: {
  target: string | null
  shipIds: number[]
  records: NavyShipRecord[]
  now: string
}) => ({
  type: NAVY_ACTIONS.batchAssign,
  target,
  shipIds,
  records,
  now,
})

export const onRestore = ({ id, now }: { id: string; now: string }) => ({
  type: NAVY_ACTIONS.restore,
  id,
  now,
})

/**
 * Applies one accepted sync batch as a single revision. The target workspace id
 * and the frozen base revision id travel in the action so the reducer only
 * appends when the workspace still sits on the accepted revision.
 */
export const onApplySync = ({
  workspaceId,
  baseRevisionId,
  accountId,
  content,
  operation,
  now,
}: {
  workspaceId: string
  baseRevisionId: string
  accountId: string | null
  content: NavyWorkspaceContent
  operation: NavyOperation
  now: string
}) => ({
  type: NAVY_ACTIONS.applySync,
  workspaceId,
  baseRevisionId,
  accountId,
  content,
  operation,
  now,
})
