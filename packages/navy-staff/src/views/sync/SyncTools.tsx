// Sync toolbar. Two separate, explicit manual-synchronization flows, each with
// a reviewable preview. All pending state is React-local; committing re-checks
// current Redux state through an injected callback (the thunk) and appends one
// revision. Buttons are unavailable while a historical revision is previewed.

import {
  Button,
  ButtonGroup,
  Callout,
  Card,
  Checkbox,
  HTMLSelect,
  Intent,
  Tag,
} from '@blueprintjs/core'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import type { Action } from 'redux'
import type { ThunkDispatch } from 'redux-thunk'
import styled from 'styled-components'
import type { IState } from 'views/utils/selectors'

import type { NavyWorkspaceContent } from '../workspace/types'
import { commitSyncBatch, newSyncAreaId } from './actions'
import {
  isSyncError,
  prepareAreaSync,
  prepareTagSync,
  type AreaSyncOperation,
  type PreparedAreaSync,
  type PreparedTagSync,
  type RosterSample,
  type SlotMappingInput,
  type SyncAcceptance,
  type SyncSourceSnapshot,
  type SyncStaleReason,
  type SyncWorkspaceSnapshot,
  type TagSyncOperation,
} from './core'
import {
  addedAreaSources,
  areaUpdateDiffs,
  defaultSlotSelection,
  findAreaIdForShip,
  NO_MAPPING,
  STALE_MESSAGE_KEYS,
  syncErrorMessageKey,
  toMapping,
} from './logic'
import {
  selectedSyncWorkspaceSelector,
  syncRosterSelector,
  syncSourceSelector,
} from './selectors'

const SectionCard = styled(Card)`
  & + & {
    margin-top: 1em;
  }
`

const SectionTitle = styled.h4`
  margin: 0 0 0.25em;
`

const SectionDescription = styled.p`
  margin: 0 0 0.75em;
  opacity: 0.8;
  font-size: 0.9em;
`

const Panel = styled.div`
  margin-top: 0.75em;
  border: 1px solid rgba(128, 128, 128, 0.3);
  border-radius: 4px;
  padding: 0.75em;
  display: flex;
  flex-direction: column;
  gap: 0.5em;
`

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5em;
  flex-wrap: wrap;
`

const DiffRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5em;
  font-size: 0.9em;
  flex-wrap: wrap;
`

const SummaryLine = styled.div`
  font-size: 0.9em;
`

const Muted = styled.span`
  opacity: 0.8;
  font-size: 0.9em;
`

export type SyncMode = 'areas' | 'tags'
export type SyncOperation = AreaSyncOperation | TagSyncOperation

export interface SyncToolsProps {
  /** Selected workspace snapshot (content + loaded account id), or null. */
  workspace: SyncWorkspaceSnapshot | null
  /** Host area source, or null when unloaded. */
  source: SyncSourceSnapshot | null
  /** Active per-account roster, or null when no account/roster is loaded. */
  roster: RosterSample | null
  /** True while the editable workspace is previewing a historical revision. */
  historyPreview: boolean
  /** Allocates a fresh local area id. */
  createAreaId: () => string
  /** Re-validates against fresh state and commits one batch (the thunk). */
  onCommit: (
    prepared: PreparedAreaSync | PreparedTagSync,
    mapping: SlotMappingInput,
  ) => SyncAcceptance
  className?: string
}

const SummaryList = ({
  label,
  values,
  emptyLabel,
}: {
  label: string
  values: readonly string[]
  emptyLabel: string
}) => (
  <SummaryLine>
    <strong>{label}:</strong> {values.length > 0 ? values.join(', ') : emptyLabel}
  </SummaryLine>
)

export const SyncTools = ({
  workspace,
  source,
  roster,
  historyPreview,
  createAreaId,
  onCommit,
  className,
}: SyncToolsProps) => {
  const { t } = useTranslation('poi-plugin-navy-staff')
  const [mode, setMode] = useState<SyncMode | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [selection, setSelection] = useState<Record<number, string>>({})
  const [prepared, setPrepared] = useState<
    PreparedAreaSync | PreparedTagSync | null
  >(null)
  const [stale, setStale] = useState<readonly SyncStaleReason[] | null>(null)
  const [errorKey, setErrorKey] = useState<string | null>(null)

  // An open flow belongs to one workspace, account, and source. A history
  // preview, an account/workspace switch, or a replaced/unloaded host source
  // discards the pending batch instead of leaving Accept usable.
  const resetKey = `${workspace?.workspaceId ?? ''}|${workspace?.accountId ?? ''}|${
    historyPreview ? 'preview' : 'edit'
  }`
  useEffect(() => {
    setMode(null)
    setConfirmed(false)
    setPrepared(null)
    setStale(null)
    setErrorKey(null)
    setSelection({})
  }, [resetKey, source])

  // Session freshness only: the loaded account snapshot must equal the roster's
  // account. Never a per-workspace owner and never a user binding.
  const hasAccount = workspace !== null && workspace.accountId !== null
  const accountMatches =
    hasAccount && roster !== null && roster.accountId === workspace.accountId
  const rosterOtherAccount =
    hasAccount && roster !== null && roster.accountId !== workspace.accountId

  const mapping: SlotMappingInput = toMapping(selection)
  const areaLabel = (id: string): string =>
    workspace?.content.areas.find((area) => area.id === id)?.label ?? id

  const openMode = (next: SyncMode) => {
    setMode(next)
    setConfirmed(false)
    setPrepared(null)
    setStale(null)
    setErrorKey(null)
    setSelection(
      source && workspace ? defaultSlotSelection(source, workspace.content) : {},
    )
  }

  const closeMode = () => {
    setMode(null)
    setConfirmed(false)
    setPrepared(null)
    setStale(null)
    setErrorKey(null)
    setSelection({})
  }

  // Any mapping or confirmation change invalidates the pending batch; the user
  // must press Preview again to recompute it.
  const changeSelection = (slot: number, areaId: string) => {
    setSelection((current) => ({ ...current, [slot]: areaId }))
    setPrepared(null)
    setStale(null)
  }

  const handlePreview = () => {
    if (historyPreview || !workspace || !source || !confirmed || mode === null) return
    setStale(null)
    setErrorKey(null)
    const now = new Date().toISOString()
    try {
      if (mode === 'areas') {
        setPrepared(prepareAreaSync({ createAreaId, mapping, now, source, workspace }))
        return
      }
      if (!accountMatches || !roster) {
        setPrepared(null)
        setErrorKey('syncNoRoster')
        return
      }
      setPrepared(prepareTagSync({ mapping, now, roster, source, workspace }))
    } catch (error) {
      setPrepared(null)
      setErrorKey(isSyncError(error) ? syncErrorMessageKey(error.code) : 'syncFailed')
    }
  }

  const handleAccept = () => {
    if (historyPreview || !prepared) return
    const result = onCommit(prepared, mapping)
    if (!result.fresh) {
      setStale(result.reasons)
      return
    }
    closeMode()
  }

  const renderSummary = () => {
    if (!prepared || !workspace) return null
    if (prepared.kind === 'areas') {
      const diffs = areaUpdateDiffs(prepared, workspace.content)
      const added = addedAreaSources(prepared)
      return (
        <div data-testid="sync-area-summary">
          <SummaryLine>
            <strong>{t('Added areas')}:</strong>{' '}
            {added.length > 0 ? (
              added.map((area) => (
                <Tag key={area.label} minimal style={{ color: area.color }}>
                  {area.label}
                </Tag>
              ))
            ) : (
              t('No changes')
            )}
          </SummaryLine>
          <SummaryLine>
            <strong>{t('Updated areas')}:</strong>
          </SummaryLine>
          {diffs.length === 0 ? (
            <Muted>{t('No changes')}</Muted>
          ) : (
            diffs.map((diff) => (
              <DiffRow key={diff.areaId} data-testid="sync-area-diff">
                <Tag minimal style={{ color: diff.oldColor }}>
                  {diff.oldLabel}
                </Tag>
                <span>→</span>
                <Tag minimal style={{ color: diff.newColor }}>
                  {diff.newLabel}
                </Tag>
                {diff.fleetLabelChanges.map((change) => (
                  <Muted key={change.locale}>
                    {t('Fleet labels')} {change.locale}: {change.from || '—'} →{' '}
                    {change.to || '—'}
                  </Muted>
                ))}
              </DiffRow>
            ))
          )}
          <SummaryList
            label={t('Retained areas')}
            values={prepared.summary.retained.map(areaLabel)}
            emptyLabel={t('No changes')}
          />
        </div>
      )
    }
    const rosterById = new Map(prepared.roster.map((ship) => [ship.ownedId, ship]))
    const tagSlotToArea = new Map(mapping.map((entry) => [entry.slot, entry.areaId]))
    const describe = (ownedId: number): string => {
      const ship = rosterById.get(ownedId)
      const from = findAreaIdForShip(workspace.content, ownedId)
      const to =
        ship && ship.tagSlot !== null
          ? tagSlotToArea.get(ship.tagSlot) ?? null
          : null
      const fromLabel = from ? areaLabel(from) : t('Unassigned')
      const toLabel = to ? areaLabel(to) : t('Unassigned')
      return `#${ownedId}: ${fromLabel} → ${toLabel}`
    }
    return (
      <div data-testid="sync-tag-summary">
        <SummaryList
          label={t('Ship moves')}
          values={prepared.summary.moved.map(describe)}
          emptyLabel={t('No changes')}
        />
        <SummaryList
          label={t('Added ships')}
          values={prepared.summary.added.map(describe)}
          emptyLabel={t('No changes')}
        />
      </div>
    )
  }

  const renderFlow = () => (
    <Panel>
      <h6>{t('Slot mapping')}</h6>
      {source?.areas.map((area) => {
        const selectedId = selection[area.slot] ?? NO_MAPPING
        const local = workspace?.content.areas.find((a) => a.id === selectedId)
        return (
          <Row key={area.slot}>
            <Tag minimal style={{ color: area.color }}>
              {area.label}
            </Tag>
            <span>→</span>
            <HTMLSelect
              aria-label={`${t('Slot mapping')}: ${area.label}`}
              value={selectedId}
              onChange={(event) =>
                changeSelection(area.slot, event.currentTarget.value)
              }
            >
              <option value={NO_MAPPING}>
                {mode === 'areas' ? t('New area') : t('Ignore slot')}
              </option>
              {workspace?.content.areas.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </HTMLSelect>
            {local && (
              <Tag minimal style={{ color: local.color }}>
                {local.label}
              </Tag>
            )}
          </Row>
        )
      })}

      <Checkbox
        checked={confirmed}
        label={t('Confirm intended event')}
        onChange={(event) => {
          setConfirmed(event.currentTarget.checked)
          setPrepared(null)
          setStale(null)
        }}
      />

      <ButtonGroup>
        <Button
          intent={Intent.PRIMARY}
          disabled={historyPreview || !confirmed || !source}
          onClick={handlePreview}
        >
          {t('Preview changes')}
        </Button>
        <Button onClick={closeMode}>{t('Cancel')}</Button>
      </ButtonGroup>

      {errorKey && (
        <Callout intent={Intent.DANGER} data-testid="sync-error">
          {t(errorKey)}
        </Callout>
      )}

      {stale && (
        <Callout intent={Intent.WARNING} data-testid="sync-stale">
          <div>{t('Preview is stale. Refresh the preview.')}</div>
          <ul>
            {stale.map((reason) => (
              <li key={reason}>{t(STALE_MESSAGE_KEYS[reason])}</li>
            ))}
          </ul>
          <Button onClick={handlePreview}>{t('Refresh preview')}</Button>
        </Callout>
      )}

      {prepared && (
        <div data-testid="sync-preview">
          {renderSummary()}
          <Button
            intent={Intent.PRIMARY}
            disabled={historyPreview || stale !== null}
            onClick={handleAccept}
          >
            {t('Accept')}
          </Button>
        </div>
      )}
    </Panel>
  )

  return (
    <div className={className} data-testid="sync-tools">
      {historyPreview && <Callout>{t('History preview open')}</Callout>}
      {!historyPreview && rosterOtherAccount && (
        <Callout intent={Intent.WARNING}>{t('Different account')}</Callout>
      )}
      {!historyPreview && hasAccount && roster === null && (
        <Callout>{t('No loaded roster for this account.')}</Callout>
      )}

      <SectionCard>
        <SectionTitle>{t('Update area information')}</SectionTitle>
        <SectionDescription>{t('syncAreaDescription')}</SectionDescription>
        <Button
          icon="edit"
          active={mode === 'areas'}
          disabled={historyPreview || !workspace || !source}
          onClick={() => openMode('areas')}
        >
          {t('Update area information')}
        </Button>
        {mode === 'areas' && renderFlow()}
      </SectionCard>

      <SectionCard>
        <SectionTitle>{t('Apply actual sortie tags')}</SectionTitle>
        <SectionDescription>{t('syncTagDescription')}</SectionDescription>
        <Button
          icon="tag"
          active={mode === 'tags'}
          disabled={historyPreview || !workspace || !source || !accountMatches}
          onClick={() => openMode('tags')}
        >
          {t('Apply actual sortie tags')}
        </Button>
        {mode === 'tags' && renderFlow()}
      </SectionCard>
    </div>
  )
}

/** Connected toolbar: reads the store and commits through the durable thunk. */
export const SyncBar = ({ historyPreview }: { historyPreview: boolean }) => {
  const dispatch = useDispatch<ThunkDispatch<IState, unknown, Action>>()
  const workspace = useSelector(selectedSyncWorkspaceSelector)
  const source = useSelector(syncSourceSelector)
  const roster = useSelector(syncRosterSelector)

  return (
    <SyncTools
      workspace={workspace}
      source={source}
      roster={roster}
      historyPreview={historyPreview}
      createAreaId={newSyncAreaId}
      onCommit={(prepared, mapping) => dispatch(commitSyncBatch({ mapping, prepared }))}
    />
  )
}
