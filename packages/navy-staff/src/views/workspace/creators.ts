// Plain action creators. Kept free of host selectors so reducers and node tests
// can use them without the host boundary; thunks live in ./actions.

import { NAVY_ACTIONS } from './action-types'
import type { NavyShipRecord, NavyWorkspace } from './types'

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
