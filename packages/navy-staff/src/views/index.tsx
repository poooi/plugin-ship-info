// tslint:disable jsx-no-lambda

import {
  Button,
  ButtonGroup,
  Callout,
  Classes,
  HTMLSelect,
  InputGroup,
  Intent,
  Menu,
  MenuItem,
  Position,
} from '@blueprintjs/core'
import { get } from 'lodash'
import { rgba } from 'polished'
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import type { Action } from 'redux'
import type { ThunkDispatch } from 'redux-thunk'
import styled, { createGlobalStyle } from 'styled-components'
import { Dialog, Popover } from 'views/components/etc/overlay'
import { extensionSelectorFactory, IState } from 'views/utils/selectors'

import { shipSuperTypeMap } from '@poi-plugins/shared/ship-types'
import { poiSurface } from '@poi-plugins/shared/ui/styles'
import { formatRevisionTime, HistorySelector, opLabel, UndoRedo } from './history'
import { Area } from './planner/area'
import { ShipGrid } from './planner/ship-grid'
import { REMOVE_TARGET, ShipList, ShipListControls } from './planner/ship-list'
import { resolveAreaLabel } from './planner/types'
import { DISPLAY_FLEET_NAME_CONFIG, PLUGIN_KEY } from './plugin-identity'
import { ReferenceTools, ShareTools } from './reference'
import { captureReference } from './reference/capture'
import { buildMasterReadings, buildSearch } from './search'
import { SyncBar, syncSourceSelector } from './sync'
import { ViewToggle } from './view-toggle'
import {
  applyShipBatch,
  createWorkspace,
  duplicateWorkspace,
  onDeleteWorkspace,
  onRenameWorkspace,
  onRestore,
  onSelectWorkspace,
} from './workspace/actions'
import {
  capturedDisplayContent,
  editingDisplayContentSelector,
  liveRosterAvailableSelector,
  loadedAccountIdSelector,
  rawRosterShipsSelector,
  selectedWorkspaceIdSelector,
  selectedWorkspaceSelector,
  workspacesSelector,
  type DisplayContent,
} from './workspace/selectors'

export { reducer } from './redux'

const NavGlobalStyle = createGlobalStyle`
  .navy-staff-scrollable {
    ::-webkit-scrollbar {
      height: 16px;
      width: 16px;
    }

    ::-webkit-scrollbar-thumb {
      background: ${(props) => props.theme.BLUE1};
      height: 16px;
      width: 16px;
    }
  }
`

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
`

const PlanHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5em;
  padding: 0.5em 0;
  flex-wrap: wrap;
  border-bottom: 1px solid rgba(128, 128, 128, 0.3);
  margin-bottom: 0.5em;
`

// Compact top navigation: a text+icon button group, not underlined tabs.
const NavBar = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5em;
  padding: 0.25em 0;

  /* Generous horizontal padding keeps the page labels easy to hit. */
  .nav-buttons .bp6-button {
    padding-left: 24px;
    padding-right: 24px;
  }
`

const HeaderSpacer = styled.div`
  flex: 1 1 0;
  min-width: 0;
`

// Keep Undo/Redo together so a narrow header never splits them across lines.
const UndoGroup = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  flex: none;
`

const FieldLabel = styled.span`
  font-size: 0.85em;
  opacity: 0.8;
  flex: none;
`

const Body = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1em;
`

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75em;
  flex-wrap: wrap;
  margin-bottom: 0.5em;
`

const HelpContent = styled.div`
  max-width: 280px;
  padding: 8px 10px;
  font-size: 0.85em;
  line-height: 1.4;
`

const AreaList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
`

const Palette = styled.div`
  position: sticky;
  /* Body has 1em top padding; offset the sticky position by the same amount so
     scrolled cards cannot show through the padding strip above the palette. */
  top: -1em;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 0.75em;
  flex-wrap: wrap;
  ${(props) =>
    poiSurface(
      rgba(props.theme.variant === 'dark' ? '#000' : '#fff', 0.75),
    )}
  padding: 6px 1em;
  margin-bottom: 0.75em;
`

const SetupHint = styled.div`
  margin-top: 0.5em;
  display: flex;
  flex-direction: column;
  gap: 0.25em;
  align-items: flex-start;
`

const Muted = styled.span`
  font-size: 0.85em;
  opacity: 0.8;
`

// Workspace management: a labeled selector, a New-workspace action, and a
// workspace-actions menu. Rename and delete use focused dialogs and identify
// the target workspace before confirmation. Pending rename/delete is cancelled
// when the selection, account, read-only state, or load gate changes.
const WorkspaceManager = ({
  accountId,
  disabled,
  readOnly,
}: {
  accountId: string | null
  disabled: boolean
  readOnly: boolean
}) => {
  const dispatch = useDispatch<ThunkDispatch<IState, unknown, Action>>()
  const workspaces = useSelector(workspacesSelector)
  const selectedId = useSelector(selectedWorkspaceIdSelector)
  const { t } = useTranslation('poi-plugin-navy-staff')

  const [renameOpen, setRenameOpen] = useState(false)
  const [renameTarget, setRenameTarget] = useState<string | null>(null)
  const [nameDraft, setNameDraft] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const selected = workspaces.find((workspace) => workspace.id === selectedId)
  const deleteTargetWorkspace = workspaces.find((w) => w.id === deleteTarget)
  const deleteTargetName = deleteTargetWorkspace
    ? deleteTargetWorkspace.revisions[deleteTargetWorkspace.cursor].content.name
    : ''
  const inactive = disabled || readOnly

  const closeDialogs = useCallback(() => {
    setRenameOpen(false)
    setRenameTarget(null)
    setDeleteTarget(null)
  }, [])

  useEffect(() => {
    closeDialogs()
  }, [selectedId, accountId, disabled, readOnly, closeDialogs])

  const confirmRename = () => {
    if (!renameTarget || nameDraft.trim().length === 0) return
    dispatch(
      onRenameWorkspace({
        id: renameTarget,
        name: nameDraft,
        now: new Date().toISOString(),
      }),
    )
    closeDialogs()
  }

  const openRename = () => {
    if (!selected || inactive) return
    setNameDraft(selected.revisions[selected.cursor].content.name)
    setRenameTarget(selected.id)
    setRenameOpen(true)
  }

  const openDelete = () => {
    if (!selected || inactive) return
    setDeleteTarget(selected.id)
  }

  return (
    <>
      <FieldLabel>{t('Workspace')}</FieldLabel>
      <HTMLSelect
        aria-label={t('Workspace')}
        disabled={disabled}
        style={{ flex: '1 1 10em', maxWidth: '18em', minWidth: '7em' }}
        value={selectedId}
        onChange={(event) => dispatch(onSelectWorkspace({ id: event.currentTarget.value }))}
      >
        {workspaces.length === 0 && <option value="">{t('No workspace')}</option>}
        {workspaces.map((workspace) => (
          <option key={workspace.id} value={workspace.id}>
            {workspace.revisions[workspace.cursor].content.name}
          </option>
        ))}
      </HTMLSelect>

      <Button
        disabled={disabled}
        icon="add"
        onClick={() => dispatch(createWorkspace(`${t('Workspace')} ${workspaces.length + 1}`))}
      >
        {t('New workspace')}
      </Button>

      <Popover
        position={Position.BOTTOM_LEFT}
        content={
          <Menu>
            <MenuItem disabled={!selected || inactive} icon="edit" onClick={openRename} text={t('Rename')} />
            <MenuItem
              disabled={!selected || inactive}
              icon="duplicate"
              onClick={() => selected && dispatch(duplicateWorkspace(selected.id))}
              text={t('Duplicate')}
            />
            <MenuItem
              disabled={!selected || inactive}
              icon="trash"
              intent={Intent.DANGER}
              onClick={openDelete}
              text={t('Delete')}
            />
          </Menu>
        }
      >
        <Button aria-label={t('Workspace actions')} disabled={!selected || disabled} icon="more" />
      </Popover>

      <Dialog isOpen={renameOpen && !inactive} title={t('Rename workspace')} onClose={closeDialogs}>
        <div className={Classes.DIALOG_BODY}>
          <InputGroup
            autoFocus
            aria-label={t('Workspace name')}
            value={nameDraft}
            onChange={(event) => setNameDraft(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                confirmRename()
              }
            }}
          />
          <div style={{ marginTop: '0.75em', display: 'flex', gap: '0.5em' }}>
            <Button intent={Intent.PRIMARY} disabled={nameDraft.trim().length === 0} onClick={confirmRename}>
              {t('Confirm')}
            </Button>
            <Button onClick={closeDialogs}>{t('Cancel')}</Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        isOpen={Boolean(deleteTarget) && !inactive}
        title={t('Delete workspace')}
        onClose={closeDialogs}
      >
        <div className={Classes.DIALOG_BODY}>
          <p>{t('Delete "{{name}}" permanently?', { name: deleteTargetName ?? '' })}</p>
          <div style={{ marginTop: '0.75em', display: 'flex', gap: '0.5em' }}>
            <Button
              intent={Intent.DANGER}
              onClick={() => {
                if (!deleteTarget) return
                dispatch(onDeleteWorkspace({ id: deleteTarget }))
                closeDialogs()
              }}
            >
              {t('Delete permanently')}
            </Button>
            <Button onClick={closeDialogs}>{t('Cancel')}</Button>
          </div>
        </div>
      </Dialog>
    </>
  )
}

export type PlanView = 'area' | 'list' | 'grid'
type PlanTask = null | 'history' | 'update'

const noop = () => undefined

// Plan views: Area View, Ship List (batch selection), and the Grid Palette.
// The list and palette share search/type/status filters. The list owns the
// target select; the grid shows its own palette target. Selection never edits;
// only Apply on the list commits (one revision).
const PlanViews = ({
  canSynchronize,
  display,
  onBatch,
  onClearSelection,
  onOpenSynchronize,
  onSelectAll,
  onToggleSelection,
  onViewChange,
  previewOnly = false,
  query,
  readOnly,
  selection,
  statusFilter,
  target,
  typeFilter,
  view,
  onQueryChange,
  onStatusFilterChange,
  onTargetChange,
  onTypeFilterChange,
}: {
  canSynchronize: boolean
  display: DisplayContent
  onBatch: (target: string | null, shipIds: number[]) => void
  onClearSelection: () => void
  onOpenSynchronize: () => void
  onSelectAll: (ids: number[]) => void
  onToggleSelection: (shipId: number) => void
  onViewChange: (view: PlanView) => void
  previewOnly?: boolean
  query: string
  readOnly: boolean
  selection: Set<number>
  statusFilter: string
  target: string
  typeFilter: string
  view: PlanView
  onQueryChange: (value: string) => void
  onStatusFilterChange: (value: string) => void
  onTargetChange: (value: string) => void
  onTypeFilterChange: (value: string) => void
}) => {
  const displayFleetName = useSelector((state: IState) =>
    get(state.config, DISPLAY_FLEET_NAME_CONFIG, false),
  )
  const liveAvailable = useSelector(liveRosterAvailableSelector)
  const { t } = useTranslation('poi-plugin-navy-staff')

  // Master readings come from the current host data only (never persisted), so
  // historical rows search by their master ID reading as well.
  const constShips = useSelector((state: IState) =>
    get(state, ['const', '$ships']) as
      | Record<string, { api_name?: unknown; api_yomi?: unknown }>
      | undefined,
  )
  const masterReadings = useMemo(
    () => buildMasterReadings(constShips),
    [constShips],
  )
  const search = useMemo(
    () =>
      buildSearch(
        display.gridShips.map((row) => {
          const reading =
            row.masterId !== null ? masterReadings.get(row.masterId) : undefined
          return {
            aliases: [t(row.name ?? '', { ns: 'resources' })],
            id: row.ownedId,
            identifiers: [row.ownedId, row.masterId],
            level: row.level,
            name: row.name ?? '',
            romaji: reading?.romaji,
            type: row.record?.typeLabel ?? '',
            typeLabel:
              row.superTypeIndex >= 0
                ? t(shipSuperTypeMap[row.superTypeIndex].name)
                : t('Unknown type'),
            yomi: reading?.yomi,
          }
        }),
      ),
    [display.gridShips, masterReadings, t],
  )
  const filteredRows = useMemo(() => {
    const matched = new Set(search(query).map((entry) => entry.id as number))
    return display.gridShips.filter((row) => {
      if (!matched.has(row.ownedId)) return false
      if (typeFilter !== 'all' && String(row.superTypeIndex) !== typeFilter) return false
      const assigned = row.assignedColor !== null
      if (statusFilter === 'assigned' && !assigned) return false
      if (statusFilter === 'unassigned' && assigned) return false
      return true
    })
  }, [display.gridShips, search, query, typeFilter, statusFilter])
  const filteredDisplay: DisplayContent = { ...display, gridShips: filteredRows }

  const areaChoices = display.areas.map((area) => ({
    color: area.color,
    id: area.id,
    label: resolveAreaLabel(area, displayFleetName),
  }))

  // A stale destination (e.g. its area was undone away) is treated as "choose
  // destination" everywhere: the select value, Apply enablement, grid behaviour,
  // and the dispatched batch target all use this validated value.
  const targetValid =
    target === '' ||
    target === REMOVE_TARGET ||
    display.areas.some((area) => area.id === target)
  const effectiveTarget = targetValid ? target : ''
  const gridFill =
    effectiveTarget === '' || effectiveTarget === REMOVE_TARGET ? null : effectiveTarget
  const gridChosen = effectiveTarget !== ''
  const batchTarget = effectiveTarget === REMOVE_TARGET ? null : effectiveTarget

  const typeChoices = shipSuperTypeMap.map((group, index) => ({ index, name: group.name }))

  const filters = (
    <>
      <InputGroup
        leftIcon="search"
        placeholder={t('Search')}
        value={query}
        onChange={(event) => onQueryChange(event.currentTarget.value)}
      />
      <HTMLSelect aria-label={t('Type')} value={typeFilter} onChange={(event) => onTypeFilterChange(event.currentTarget.value)}>
        <option value="all">{t('All')}</option>
        {typeChoices.map((choice) => (
          <option key={choice.index} value={String(choice.index)}>
            {t(choice.name)}
          </option>
        ))}
      </HTMLSelect>
      <HTMLSelect
        aria-label={t('Assignment')}
        value={statusFilter}
        onChange={(event) => onStatusFilterChange(event.currentTarget.value)}
      >
        <option value="all">{t('All')}</option>
        <option value="unassigned">{t('Unassigned')}</option>
        <option value="assigned">{t('Assigned')}</option>
      </HTMLSelect>
    </>
  )

  const targetSelect = (
    <HTMLSelect
      aria-label={t('Assign to')}
      value={effectiveTarget}
      onChange={(event) => onTargetChange(event.currentTarget.value)}
    >
      <option value="">{t('Choose destination')}</option>
      <option value={REMOVE_TARGET}>{t('Remove assignment')}</option>
      {display.areas.map((area) => (
        <option key={area.id} value={area.id}>
          {resolveAreaLabel(area, displayFleetName)}
        </option>
      ))}
    </HTMLSelect>
  )

  if (display.areas.length === 0 && !previewOnly) {
    return (
      <Callout>
        <div>{t('No areas captured')}</div>
        <Muted>{t('planSetupSyncHint')}</Muted>
        {!readOnly && (
          <SetupHint>
            <Button icon="refresh" disabled={!canSynchronize} onClick={onOpenSynchronize}>
              {t('Go to Synchronize')}
            </Button>
            {!canSynchronize && (
              <Muted>{t('planSetupNoAreaData')}</Muted>
            )}
          </SetupHint>
        )}
      </Callout>
    )
  }

  return (
    <div>
      {!previewOnly && (
        <>
          <Toolbar>
            <ViewToggle
              value={view}
              onChange={(next) => onViewChange(next)}
              labels={{
                area: t('Area View'),
                grid: t('Grid Palette'),
                list: t('Ship List'),
              }}
            />
            <FieldLabel>{t('Area labels')}</FieldLabel>
            <HTMLSelect
              aria-label={t('Area labels')}
              value={displayFleetName ? 'fleet' : 'map'}
              onChange={(event) =>
                window.config.set(DISPLAY_FLEET_NAME_CONFIG, event.currentTarget.value === 'fleet')
              }
            >
              <option value="map">{t('Show original')}</option>
              <option value="fleet">{t('Show translation')}</option>
            </HTMLSelect>
            <HeaderSpacer />
            <Popover
              position={Position.BOTTOM_RIGHT}
              content={
                <HelpContent role="tooltip" aria-label={t('Help')} data-testid="plan-help">
                  {view === 'list' ? t('helpContentList') : t('helpContent')}
                </HelpContent>
              }
            >
              <Button icon="help" minimal aria-label={t('Help')} />
            </Popover>
          </Toolbar>
        </>
      )}

      {display.areas.length === 0 ? (
        <Callout>{t('No areas captured')}</Callout>
      ) : view === 'area' ? (
        <AreaList>
          {display.areas.map((area) => (
            <Area
              key={area.id}
              area={area}
              others={areaChoices.filter((choice) => choice.id !== area.id)}
              displayFleetName={displayFleetName}
              readOnly={readOnly}
              canAdd={liveAvailable}
            />
          ))}
        </AreaList>
      ) : view === 'list' ? (
        <div data-testid="ship-list">
          {!previewOnly && !readOnly && (
            <Palette>
              {filters}
              <ShipListControls
                areas={display.areas}
                displayFleetName={displayFleetName}
                target={effectiveTarget}
                onTargetChange={onTargetChange}
                selected={selection}
                onSelectAll={() => onSelectAll(filteredRows.map((row) => row.ownedId))}
                onClear={onClearSelection}
                onApply={() => onBatch(batchTarget, [...selection])}
              />
            </Palette>
          )}
          <ShipList
            ships={filteredRows}
            areas={display.areas}
            displayFleetName={displayFleetName}
            readOnly={readOnly}
            selected={selection}
            onToggle={onToggleSelection}
          />
        </div>
      ) : (
        <>
          {!previewOnly && !readOnly && (
            <Palette>
              {filters}
              {!readOnly && targetSelect}
            </Palette>
          )}
          <ShipGrid
            display={filteredDisplay}
            fill={gridFill}
            fillChosen={gridChosen}
            readOnly={readOnly}
          />
        </>
      )}
    </div>
  )
}

const HistoryTask = ({
  display,
  revisionId,
  cursorRevisionId,
  onRevisionChange,
  onRestoreState,
  onShareState,
  onReturn,
}: {
  display: DisplayContent
  revisionId: string
  cursorRevisionId: string
  onRevisionChange: (id: string) => void
  onRestoreState: () => void
  onShareState: () => void
  onReturn: () => void
}) => {
  const { t } = useTranslation('poi-plugin-navy-staff')
  const [view, setView] = useState<PlanView>('area')
  const canRestore = Boolean(revisionId) && revisionId !== cursorRevisionId
  return (
    <div data-testid="history-task">
      <Toolbar>
        <HistorySelector value={revisionId} onChange={onRevisionChange} />
        <HeaderSpacer />
        <Button text={t('Return to current plan')} onClick={onReturn} />
        <Button text={t('Restore this state')} disabled={!canRestore} onClick={onRestoreState} />
        <Button text={t('Share this state')} onClick={onShareState} />
      </Toolbar>
      <Callout intent={Intent.NONE}>{t('HistoryReadonlyNotice')}</Callout>
      <PlanViews
        canSynchronize={false}
        display={display}
        onBatch={noop}
        onClearSelection={noop}
        onOpenSynchronize={noop}
        onSelectAll={noop}
        onToggleSelection={noop}
        onViewChange={setView}
        query=""
        readOnly
        selection={new Set()}
        statusFilter="all"
        target=""
        typeFilter="all"
        view={view}
        onQueryChange={noop}
        onStatusFilterChange={noop}
        onTargetChange={noop}
        onTypeFilterChange={noop}
      />
    </div>
  )
}

const NavyStaffContent = () => {
  const [activeTab, setActiveTab] = useState('plan')
  const [planTask, setPlanTask] = useState<PlanTask>(null)
  const [historyRevId, setHistoryRevId] = useState<string | null>(null)
  const [shareSource, setShareSource] = useState<{ workspaceId: string; revisionId: string } | null>(null)
  const [selection, setSelection] = useState<Set<number>>(() => new Set())

  // Plan view + shared list/grid filter state lives here so a History/Update
  // detour never loses it.
  const [planView, setPlanView] = useState<PlanView>('area')
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [planTarget, setPlanTarget] = useState('')

  const { t } = useTranslation('poi-plugin-navy-staff')
  const dispatch = useDispatch<ThunkDispatch<IState, unknown, Action>>()
  const slice = useSelector(extensionSelectorFactory(PLUGIN_KEY)) as
    | { error?: string | null; ready?: boolean }
    | undefined
  const workspace = useSelector(selectedWorkspaceSelector)
  const selectedWorkspaceId = useSelector(selectedWorkspaceIdSelector)
  const loadedAccountId = useSelector(loadedAccountIdSelector)
  const editingDisplay = useSelector(editingDisplayContentSelector)
  const rawRosterShips = useSelector(rawRosterShipsSelector)
  const displayFleetName = useSelector((state: IState) =>
    get(state.config, DISPLAY_FLEET_NAME_CONFIG, false),
  )
  const canSynchronize = useSelector(syncSourceSelector) !== null

  const workspaceName = workspace?.revisions[workspace.cursor].content.name ?? ''
  const cursorRevisionId = workspace?.revisions[workspace.cursor]?.id ?? ''

  const clearSelection = () => setSelection(new Set())
  const toggleSelection = (shipId: number) => {
    setSelection((prev) => {
      const next = new Set(prev)
      if (next.has(shipId)) next.delete(shipId)
      else next.add(shipId)
      return next
    })
  }
  const selectAll = (ids: number[]) => setSelection(new Set(ids))

  // Per-page scroll positions. A newly opened page starts at the top; returning
  // to a page restores where it was. Never persisted.
  const bodyRef = useRef<HTMLDivElement>(null)
  const scrollPositions = useRef<Record<string, number>>({})
  const handleTabChange = useCallback(
    (next: string) => {
      if (bodyRef.current) scrollPositions.current[activeTab] = bodyRef.current.scrollTop
      setActiveTab(next)
    },
    [activeTab],
  )
  useEffect(() => {
    const body = bodyRef.current
    if (!body) return
    body.scrollTop = scrollPositions.current[activeTab] ?? 0
  }, [activeTab])

  // Selection is transient: drop it when the account/workspace changes, when a
  // different revision becomes the editable cursor (undo/redo/restore), or when
  // leaving the Plan page.
  useEffect(() => {
    setSelection(new Set())
    setPlanTask(null)
    setHistoryRevId(null)
    setShareSource(null)
    setPlanTarget('')
    scrollPositions.current = {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWorkspaceId, loadedAccountId])

  useEffect(() => {
    clearSelection()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursorRevisionId])

  useEffect(() => {
    if (activeTab !== 'plan') clearSelection()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  const handleBatch = (target: string | null, shipIds: number[]) => {
    dispatch(applyShipBatch({ target, shipIds }))
    clearSelection()
  }

  // Share source: the current editable plan, or an explicit historical revision
  // chosen from History. It never changes the editable cursor.
  const shareSourceRevision = useMemo(() => {
    if (!shareSource || !workspace || shareSource.workspaceId !== workspace.id) return undefined
    return workspace.revisions.find((revision) => revision.id === shareSource.revisionId)
  }, [shareSource, workspace])
  const shareSourceMissing = Boolean(shareSource && !shareSourceRevision)

  const shareDisplay = shareSourceRevision
    ? capturedDisplayContent(shareSourceRevision.content)
    : editingDisplay
  const shareSourceLabel = shareSourceMissing
    ? t('Share source unavailable', { name: workspaceName })
    : shareSourceRevision
      ? t('Share history source', {
          name: workspaceName,
          label: `${opLabel(shareSourceRevision.op, t)} · ${formatRevisionTime(shareSourceRevision.time)}`,
        })
      : t('Share current plan source', { name: workspaceName })

  const captureShareReference = useCallback(
    () =>
      captureReference(shareDisplay, {
        captureTime:
          shareSourceRevision?.time ??
          workspace?.revisions[workspace.cursor]?.time ??
          new Date().toISOString(),
        displayFleetName,
        exportTime: new Date().toISOString(),
        locale: window.language,
        rawShips: shareSourceRevision ? undefined : rawRosterShips,
        title: shareDisplay.name,
      }),
    [shareDisplay, displayFleetName, shareSourceRevision, rawRosterShips, workspace],
  )

  // History task previews the chosen revision (or the cursor) read-only.
  const historyRevisionId = historyRevId ?? cursorRevisionId
  const historyRevision = workspace?.revisions.find((revision) => revision.id === historyRevisionId)
  const historyDisplay = historyRevision
    ? capturedDisplayContent(historyRevision.content)
    : editingDisplay

  const gated = (content: React.ReactNode) =>
    slice?.error ? (
      <Callout intent={Intent.DANGER}>{t('loadError')}</Callout>
    ) : slice?.ready ? (
      content
    ) : (
      <Callout>{t('loading')}</Callout>
    )

  const gateDisabled = !slice?.ready || Boolean(slice?.error)

  const clearOnFilter = (setter: (value: string) => void) => (value: string) => {
    setter(value)
    clearSelection()
  }

  return (
    <Wrapper id="poi-plugin-navy-staff">
      <NavGlobalStyle />
      <NavBar role="navigation" aria-label={t('Navy Staff sections')}>
        <ButtonGroup className="nav-buttons">
          <Button
            active={activeTab === 'plan'}
            aria-pressed={activeTab === 'plan'}
            icon="projects"
            text={t('Plan')}
            onClick={() => handleTabChange('plan')}
          />
          <Button
            active={activeTab === 'reference'}
            aria-pressed={activeTab === 'reference'}
            icon="book"
            text={t('Reference')}
            onClick={() => handleTabChange('reference')}
          />
          <Button
            active={activeTab === 'share'}
            aria-pressed={activeTab === 'share'}
            icon="share"
            text={t('Share')}
            onClick={() => handleTabChange('share')}
          />
        </ButtonGroup>
      </NavBar>
      <Body ref={bodyRef} className="navy-staff-scrollable">
        <div style={{ display: activeTab === 'plan' ? undefined : 'none' }}>
          {gated(
            <>
              <PlanHeader>
                <WorkspaceManager
                  accountId={loadedAccountId}
                  disabled={gateDisabled}
                  readOnly={planTask === 'history'}
                />
                <HeaderSpacer />
                <UndoGroup>
                  <UndoRedo disabled={gateDisabled || planTask === 'history'} />
                </UndoGroup>
                <Button
                  text={t('History')}
                  disabled={gateDisabled || !workspace}
                  onClick={() => {
                    clearSelection()
                    setHistoryRevId(null)
                    setPlanTask('history')
                  }}
                />
                <Button
                  text={t('Update from game')}
                  disabled={gateDisabled || !workspace}
                  onClick={() => {
                    clearSelection()
                    setPlanTask('update')
                  }}
                />
              </PlanHeader>
              {planTask === 'history' ? (
                <HistoryTask
                  display={historyDisplay}
                  revisionId={historyRevId ?? ''}
                  cursorRevisionId={cursorRevisionId}
                  onRevisionChange={(id) => setHistoryRevId(id)}
                  onRestoreState={() => {
                    if (!workspace || !historyRevId) return
                    dispatch(onRestore({ id: historyRevId, now: new Date().toISOString() }))
                    setPlanTask(null)
                    setHistoryRevId(null)
                  }}
                  onShareState={() => {
                    if (!workspace) return
                    setShareSource({ revisionId: historyRevisionId, workspaceId: workspace.id })
                    setPlanTask(null)
                    setHistoryRevId(null)
                    setActiveTab('share')
                  }}
                  onReturn={() => {
                    setPlanTask(null)
                    setHistoryRevId(null)
                  }}
                />
              ) : planTask === 'update' ? (
                <Toolbar>
                  <Button text={t('Return to current plan')} onClick={() => setPlanTask(null)} />
                </Toolbar>
              ) : (
                <PlanViews
                  canSynchronize={canSynchronize}
                  display={editingDisplay}
                  onBatch={handleBatch}
                  onClearSelection={clearSelection}
                  onOpenSynchronize={() => {
                    clearSelection()
                    setPlanTask('update')
                  }}
                  onSelectAll={selectAll}
                  onToggleSelection={toggleSelection}
                  onViewChange={(next) => {
                    setPlanView(next)
                    clearSelection()
                  }}
                  query={query}
                  readOnly={false}
                  selection={selection}
                  statusFilter={statusFilter}
                  target={planTarget}
                  typeFilter={typeFilter}
                  view={planView}
                  onQueryChange={clearOnFilter(setQuery)}
                  onStatusFilterChange={clearOnFilter(setStatusFilter)}
                  onTargetChange={setPlanTarget}
                  onTypeFilterChange={clearOnFilter(setTypeFilter)}
                />
              )}
              {/* Update review stays mounted while hidden so a corrected mapping
                  / prepared batch survives a Plan detour. A History inspection
                  passes historyPreview to discard it, as before. */}
              <div style={{ display: planTask === 'update' ? undefined : 'none' }}>
                {gated(<SyncBar historyPreview={planTask === 'history'} />)}
              </div>
            </>
          )}
        </div>

        {/* Reference and Share stay mounted while hidden so an opened reference
            and a generated share text survive page changes independently. */}
        <div style={{ display: activeTab === 'reference' ? undefined : 'none' }}>
          <ReferenceTools />
        </div>
        <div style={{ display: activeTab === 'share' ? undefined : 'none' }}>
          <ShareTools
            disabled={!(slice?.ready && !slice?.error && workspace) || shareSourceMissing}
            onCapture={captureShareReference}
            onUseCurrent={shareSource ? () => setShareSource(null) : undefined}
            sourceLabel={shareSourceLabel}
          />
        </div>
      </Body>
    </Wrapper>
  )
}

export const reactClass = () => <NavyStaffContent />
