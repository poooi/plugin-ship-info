import { AnyAction } from 'redux'

import { ACTIONS } from '../plugin-identity'
import { NAVY_ACTIONS } from './action-types'
import {
  appendRevision,
  contentAtCursor,
  contentFingerprint,
  moveShip,
  placeShip,
  removeShipFromArea,
  withName,
  withShipRecord,
} from './operations'
import { emptyNavyData, type NavyData, type NavyOperation, type NavyWorkspace, type NavyWorkspaceContent } from './types'

const replaceWorkspace = (navy: NavyData, next: NavyWorkspace): NavyData => ({
  ...navy,
  workspaces: navy.workspaces.map((workspace) =>
    workspace.id === next.id ? next : workspace,
  ),
})

const selectedWorkspace = (navy: NavyData): NavyWorkspace | undefined =>
  navy.workspaces.find((workspace) => workspace.id === navy.selectedWorkspaceId)

/**
 * Workspace reducer. Operation timestamps arrive in the action payload; the new
 * revision id is generated locally by `appendRevision`, so this is not a strict
 * replay-deterministic reducer.
 */
export const navyReducer = (
  state: NavyData = emptyNavyData(),
  action: AnyAction,
): NavyData => {
  switch (action.type) {
    case ACTIONS.init: {
      const navy = action.data?.navy as NavyData | undefined
      return navy ?? state
    }
    case NAVY_ACTIONS.create: {
      const workspace = action.workspace as NavyWorkspace
      return {
        ...state,
        selectedWorkspaceId: workspace.id,
        workspaces: [...state.workspaces, workspace],
      }
    }
    case NAVY_ACTIONS.select: {
      if (!state.workspaces.some((workspace) => workspace.id === action.id)) {
        return state
      }
      if (state.selectedWorkspaceId === action.id) return state
      return { ...state, selectedWorkspaceId: action.id as string }
    }
    case NAVY_ACTIONS.undo: {
      const workspace = selectedWorkspace(state)
      if (!workspace || workspace.cursor <= 0) return state
      return replaceWorkspace(state, { ...workspace, cursor: workspace.cursor - 1 })
    }
    case NAVY_ACTIONS.redo: {
      const workspace = selectedWorkspace(state)
      if (!workspace || workspace.cursor >= workspace.revisions.length - 1) {
        return state
      }
      return replaceWorkspace(state, { ...workspace, cursor: workspace.cursor + 1 })
    }
    case NAVY_ACTIONS.applySync: {
      const workspace = state.workspaces.find((w) => w.id === action.workspaceId)
      if (!workspace) return state
      // Accept only while the workspace still sits on the accepted base revision.
      if (workspace.revisions[workspace.cursor].id !== action.baseRevisionId) {
        return state
      }
      return replaceWorkspace(
        state,
        appendRevision(
          workspace,
          action.operation as NavyOperation,
          action.content as NavyWorkspaceContent,
          action.now as string,
        ),
      )
    }
    case NAVY_ACTIONS.restore: {
      const workspace = selectedWorkspace(state)
      if (!workspace) return state
      const target = workspace.revisions.find((revision) => revision.id === action.id)
      if (!target) return state
      const current = contentAtCursor(workspace)
      if (contentFingerprint(target.content) === contentFingerprint(current)) {
        return state
      }
      return replaceWorkspace(
        state,
        appendRevision(
          workspace,
          { from: action.id as string, kind: 'restore' },
          target.content,
          action.now as string,
        ),
      )
    }
    case NAVY_ACTIONS.delete: {
      const workspaces = state.workspaces.filter(
        (workspace) => workspace.id !== action.id,
      )
      if (workspaces.length === state.workspaces.length) return state
      const selectedWorkspaceId =
        state.selectedWorkspaceId === action.id
          ? workspaces[0]?.id ?? ''
          : state.selectedWorkspaceId
      return { ...state, selectedWorkspaceId, workspaces }
    }
    case NAVY_ACTIONS.rename: {
      // Honor the explicit target id; renaming must never fall back to whatever
      // workspace happens to be selected.
      const workspace = state.workspaces.find((w) => w.id === action.id)
      if (!workspace) return state
      const current = contentAtCursor(workspace)
      if (current.name === action.name) return state
      const content = withName(current, action.name as string)
      return replaceWorkspace(
        state,
        appendRevision(
          workspace,
          { kind: 'rename', name: action.name as string },
          content,
          action.now as string,
        ),
      )
    }
    case NAVY_ACTIONS.addShip: {
      const workspace = selectedWorkspace(state)
      if (!workspace) return state
      const before = contentAtCursor(workspace)
      const placed = placeShip(before, action.areaId as string, action.shipId as number)
      if (placed === before) return state
      const content = withShipRecord(placed, action.record)
      return replaceWorkspace(
        state,
        appendRevision(
          workspace,
          {
            areaId: action.areaId as string,
            kind: 'add-ship',
            shipId: action.shipId as number,
          },
          content,
          action.now as string,
        ),
      )
    }
    case NAVY_ACTIONS.removeShip: {
      const workspace = selectedWorkspace(state)
      if (!workspace) return state
      const before = contentAtCursor(workspace)
      const content = removeShipFromArea(
        before,
        action.areaId as string,
        action.shipId as number,
      )
      if (content === before) return state
      return replaceWorkspace(
        state,
        appendRevision(
          workspace,
          {
            areaId: action.areaId as string,
            kind: 'remove-ship',
            shipId: action.shipId as number,
          },
          content,
          action.now as string,
        ),
      )
    }
    case NAVY_ACTIONS.moveShip: {
      const workspace = selectedWorkspace(state)
      if (!workspace) return state
      const before = contentAtCursor(workspace)
      const moved = moveShip(
        before,
        action.fromAreaId as string,
        action.toAreaId as string,
        action.shipId as number,
      )
      if (moved === before) return state
      const content = action.record ? withShipRecord(moved, action.record) : moved
      return replaceWorkspace(
        state,
        appendRevision(
          workspace,
          {
            fromAreaId: action.fromAreaId as string,
            kind: 'move-ship',
            shipId: action.shipId as number,
            toAreaId: action.toAreaId as string,
          },
          content,
          action.now as string,
        ),
      )
    }
    default:
      return state
  }
}
