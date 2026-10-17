import { Button, HTMLSelect, Intent } from '@blueprintjs/core'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import type { Action } from 'redux'
import type { ThunkDispatch } from 'redux-thunk'
import type { IState } from 'views/utils/selectors'

import { onRedo, onUndo } from './workspace/creators'
import {
  canRedoSelector,
  canUndoSelector,
  cursorSelector,
  revisionsSelector,
  selectedWorkspaceSelector,
} from './workspace/selectors'
import type { NavyOperation } from './workspace/types'

export const opLabel = (
  op: NavyOperation,
  t: (key: string, options?: any) => string,
): string => {
  switch (op.kind) {
    case 'initial':
      return t('Initial state')
    case 'migrated':
      return t('Migrated plan')
    case 'create':
      return t('Created')
    case 'duplicate':
      return t('Duplicated')
    case 'rename':
      return t('Renamed to {{name}}', { name: op.name })
    case 'add-ship':
      return t('Added ship {{id}}', { id: op.shipId })
    case 'remove-ship':
      return t('Removed ship {{id}}', { id: op.shipId })
    case 'move-ship':
      return t('Moved ship {{id}}', { id: op.shipId })
    case 'restore':
      return t('Restored earlier revision')
    case 'update-areas':
      return t('Updated area information')
    case 'apply-tags':
      return t('Applied actual sortie tags')
    case 'batch-assign':
      if (op.assigned > 0 && op.removed > 0) {
        return t('Assigned {{assigned}} and removed {{removed}} ships', {
          assigned: op.assigned,
          removed: op.removed,
        })
      }
      if (op.removed > 0) return t('Removed {{count}} ships', { count: op.removed })
      return t('Assigned {{count}} ships', { count: op.assigned })
    default:
      return t('Edited')
  }
}

export const formatRevisionTime = (time: string): string => {
  const date = new Date(time)
  if (Number.isNaN(date.getTime())) return time
  try {
    return date.toLocaleString(window.language || undefined)
  } catch {
    return date.toISOString()
  }
}

// Undo/redo stay in the Plan header so they are reachable while editing. They
// move the durable cursor; a History inspection is a separate task that never
// changes the editable cursor.
export const UndoRedo = ({ disabled = false }: { disabled?: boolean }) => {
  const dispatch = useDispatch<ThunkDispatch<IState, unknown, Action>>()
  const canUndo = useSelector(canUndoSelector)
  const canRedo = useSelector(canRedoSelector)
  const { t } = useTranslation('poi-plugin-navy-staff')

  return (
    <>
      <Button
        aria-label={t('Undo')}
        disabled={disabled || !canUndo}
        icon="undo"
        onClick={() => dispatch(onUndo())}
      />
      <Button
        aria-label={t('Redo')}
        disabled={disabled || !canRedo}
        icon="redo"
        onClick={() => dispatch(onRedo())}
      />
    </>
  )
}

// A controlled revision selector for the History task. It only reports the
// chosen revision; restoring or sharing is an explicit action in the task.
export const HistorySelector = ({
  value,
  onChange,
}: {
  value: string
  onChange: (revisionId: string) => void
}) => {
  const workspace = useSelector(selectedWorkspaceSelector)
  const revisions = useSelector(revisionsSelector)
  const cursor = useSelector(cursorSelector)
  const { t } = useTranslation('poi-plugin-navy-staff')

  if (!workspace || revisions.length === 0) return null
  const currentRevisionId = revisions[cursor]?.id

  return (
    <HTMLSelect
      aria-label={t('History')}
      value={value || currentRevisionId}
      onChange={(event) => onChange(event.currentTarget.value)}
    >
      {revisions.map((revision, index) => (
        <option key={revision.id} value={revision.id}>
          {`${index + 1}. ${opLabel(revision.op, t)} — ${formatRevisionTime(revision.time)}`}
        </option>
      ))}
    </HTMLSelect>
  )
}
