import { Button, HTMLSelect, Intent } from '@blueprintjs/core'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import type { Action } from 'redux'
import type { ThunkDispatch } from 'redux-thunk'
import styled from 'styled-components'
import type { IState } from 'views/utils/selectors'

import { onRedo, onRestore, onUndo } from './workspace/creators'
import { usePreview } from './workspace/preview'
import {
  canRedoSelector,
  canUndoSelector,
  cursorSelector,
  revisionsSelector,
  selectedWorkspaceSelector,
} from './workspace/selectors'
import type { NavyOperation } from './workspace/types'

const Bar = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5em;
  padding: 0.5em 1em 0;
  flex-wrap: wrap;
`

const PreviewNote = styled.span`
  font-size: 0.85em;
  opacity: 0.85;
`

const opLabel = (op: NavyOperation, t: (key: string, options?: any) => string): string => {
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
    default:
      return t('Edited')
  }
}

const formatTime = (time: string): string => {
  const date = new Date(time)
  if (Number.isNaN(date.getTime())) return time
  try {
    return date.toLocaleString(window.language || undefined)
  } catch {
    return date.toISOString()
  }
}

// Linear history controls. Undo/redo move the durable cursor; selecting another
// revision opens a transient read-only preview; restore appends one revision.
export const HistoryBar = () => {
  const dispatch = useDispatch<ThunkDispatch<IState, unknown, Action>>()
  const workspace = useSelector(selectedWorkspaceSelector)
  const revisions = useSelector(revisionsSelector)
  const cursor = useSelector(cursorSelector)
  const canUndo = useSelector(canUndoSelector)
  const canRedo = useSelector(canRedoSelector)
  const { target: preview, setTarget } = usePreview()
  const { t } = useTranslation('poi-plugin-navy-staff')

  if (!workspace || revisions.length === 0) return null

  const currentRevisionId = revisions[cursor]?.id
  const previewing = Boolean(
    preview &&
      preview.workspaceId === workspace.id &&
      revisions.some((revision) => revision.id === preview.revisionId),
  )

  const handleSelect = (value: string) => {
    if (value === currentRevisionId) {
      setTarget(null)
    } else {
      setTarget({ revisionId: value, workspaceId: workspace.id })
    }
  }

  return (
    <Bar>
      <Button
        aria-label={t('Undo')}
        disabled={!canUndo || previewing}
        icon="undo"
        onClick={() => dispatch(onUndo())}
      />
      <Button
        aria-label={t('Redo')}
        disabled={!canRedo || previewing}
        icon="redo"
        onClick={() => dispatch(onRedo())}
      />
      <HTMLSelect
        aria-label={t('History')}
        value={previewing ? preview!.revisionId : currentRevisionId}
        onChange={(event) => handleSelect(event.currentTarget.value)}
      >
        {revisions.map((revision, index) => (
          <option key={revision.id} value={revision.id}>
            {`${index + 1}. ${opLabel(revision.op, t)} — ${formatTime(revision.time)}`}
          </option>
        ))}
      </HTMLSelect>
      {previewing && (
        <>
          <PreviewNote>{t('Viewing an earlier revision (read-only)')}</PreviewNote>
          <Button
            intent={Intent.WARNING}
            onClick={() => {
              dispatch(
                onRestore({
                  id: preview!.revisionId,
                  now: new Date().toISOString(),
                }),
              )
              // Restore appends a new current revision, so leave preview and let
              // Undo operate on the restored revision immediately.
              setTarget(null)
            }}
          >
            {t('Restore this revision')}
          </Button>
          <Button onClick={() => setTarget(null)}>{t('Exit preview')}</Button>
        </>
      )}
    </Bar>
  )
}
