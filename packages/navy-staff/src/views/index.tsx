// tslint:disable jsx-no-lambda

import {
  Button,
  Callout,
  Classes,
  HTMLSelect,
  InputGroup,
  Intent,
  Menu,
  MenuItem,
  Position,
  Switch,
  Tab,
  Tabs,
} from '@blueprintjs/core'
import { get } from 'lodash'
import { rgba } from 'polished'
import React, {
  RefObject,
  useCallback,
  useContext,
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
import { WindowEnv } from 'views/components/etc/window-env'
import { extensionSelectorFactory, IState } from 'views/utils/selectors'

import { poiSurface } from '@poi-plugins/ship-info-shared/ui/styles'
import { HistorySelector, UndoRedo } from './history'
import { captureRect } from './planner/capture'
import { Area } from './planner/area'
import { ShipGrid } from './planner/ship-grid'
import { resolveAreaLabel } from './planner/types'
import { DISPLAY_FLEET_NAME_CONFIG, PLUGIN_KEY } from './plugin-identity'
import { ReferenceTools } from './reference'
import { captureReference } from './reference/capture'
import { SyncBar, syncSourceSelector } from './sync'
import {
  createWorkspace,
  duplicateWorkspace,
  onDeleteWorkspace,
  onRenameWorkspace,
  onSelectWorkspace,
} from './workspace/actions'
import {
  PreviewContext,
  type PreviewTarget,
} from './workspace/preview'
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

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5em;
  padding: 0.5em 1em;
  flex-wrap: wrap;
  border-bottom: 1px solid rgba(128, 128, 128, 0.3);
`

const HeaderSpacer = styled.div`
  flex: 1 1 0;
  min-width: 0;
`

const FieldLabel = styled.span`
  font-size: 0.85em;
  opacity: 0.8;
  flex: none;
`

const PreviewNote = styled.span`
  font-size: 0.85em;
  opacity: 0.9;
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

const ToolbarSpacer = styled.div`
  flex: 1 1 0;
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

const Palette = styled.div<{ color: string }>`
  position: sticky;
  top: 0;
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
  border-left: 8px solid ${(props) => props.color || '#000'};

  :hover {
    background-color: var(
      --poi-background-color-opaque,
      ${(props) => (props.theme.variant === 'dark' ? '#000' : '#fff')}
    );
  }
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
  // Controls that mutate or navigate the loaded data are unavailable until the
  // slice is ready and error-free.
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
            <MenuItem
              disabled={!selected || inactive}
              icon="edit"
              onClick={openRename}
              text={t('Rename')}
            />
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
        <Button
          aria-label={t('Workspace actions')}
          disabled={!selected || disabled}
          icon="more"
        />
      </Popover>

      <Dialog
        isOpen={renameOpen && !inactive}
        title={t('Rename workspace')}
        onClose={closeDialogs}
      >
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
            <Button
              intent={Intent.PRIMARY}
              disabled={nameDraft.trim().length === 0}
              onClick={confirmRename}
            >
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
          <p>
            {t('Delete "{{name}}" permanently?', {
              name: deleteTargetName ?? '',
            })}
          </p>
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

const PlanToolbar = ({
  captureSection,
}: {
  captureSection: RefObject<HTMLDivElement>
}) => {
  const displayFleetName = useSelector((state: IState) =>
    get(state.config, DISPLAY_FLEET_NAME_CONFIG, false),
  )
  const { t } = useTranslation('poi-plugin-navy-staff')
  const { window: displayWindow } = useContext(WindowEnv)

  const handleChangeDisplayFleetName = useCallback(() => {
    window.config.set(DISPLAY_FLEET_NAME_CONFIG, !displayFleetName)
  }, [displayFleetName])

  const capture = useCallback(() => {
    if (captureSection.current) captureRect(captureSection.current)
  }, [captureSection])

  return (
    <Toolbar>
      <Switch
        checked={displayFleetName}
        label={t('Show fleet name')}
        onChange={handleChangeDisplayFleetName}
      />
      {!displayWindow.isMain && (
        <Button intent={Intent.PRIMARY} minimal onClick={capture}>
          {t('Save to image')}
        </Button>
      )}
      <ToolbarSpacer />
      <Popover
        position={Position.BOTTOM_RIGHT}
        content={
          <HelpContent
            role="tooltip"
            aria-label={t('Help')}
            data-testid="plan-help"
          >
            {t('helpContent')}
          </HelpContent>
        }
      >
        <Button icon="help" minimal aria-label={t('Help')} />
      </Popover>
    </Toolbar>
  )
}

const PlannerViews = ({
  canSynchronize,
  captureSection,
  display,
  fill,
  onFillChange,
  onOpenSynchronize,
  readOnly,
  view,
  onViewChange,
}: {
  canSynchronize?: boolean
  captureSection: RefObject<HTMLDivElement>
  display: DisplayContent
  fill: string | null
  onFillChange: (fill: string | null) => void
  onOpenSynchronize?: () => void
  readOnly: boolean
  view: string
  onViewChange: (view: string) => void
}) => {
  const displayFleetName = useSelector((state: IState) =>
    get(state.config, DISPLAY_FLEET_NAME_CONFIG, false),
  )
  const liveAvailable = useSelector(liveRosterAvailableSelector)
  const { t } = useTranslation('poi-plugin-navy-staff')

  const areaChoices = display.areas.map((area) => ({
    color: area.color,
    id: area.id,
    label: resolveAreaLabel(area, displayFleetName),
  }))

  // Never submit a stale palette target: a fill that no longer names an area in
  // the current display is treated as None.
  const effectiveFill = display.areas.some((area) => area.id === fill) ? fill : null
  const fillArea = display.areas.find((area) => area.id === effectiveFill)

  return (
    <div>
      <Tabs
        id="navy-staff-view"
        selectedTabId={view}
        onChange={(tab: string) => onViewChange(tab)}
      >
        <Tab id="area" title={t('Area View')} />
        <Tab id="grid" title={t('Ship Grid')} />
      </Tabs>

      {display.areas.length === 0 ? (
        <Callout>
          <div>{t('No areas captured')}</div>
          <Muted>
            {t('Synchronize to capture the current event areas into this plan.')}
          </Muted>
          {onOpenSynchronize && (
            <SetupHint>
              <Button
                icon="refresh"
                disabled={canSynchronize === false}
                onClick={onOpenSynchronize}
              >
                {t('Go to Synchronize')}
              </Button>
              {canSynchronize === false && (
                <Muted>
                  {t('Area data is not available yet. Load the game map data first.')}
                </Muted>
              )}
            </SetupHint>
          )}
        </Callout>
      ) : view === 'area' ? (
        <div ref={captureSection}>
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
        </div>
      ) : (
        <div>
          {!readOnly && (
            <Palette color={fillArea?.color ?? '#000'}>
              <FieldLabel>{t('Assign to')}</FieldLabel>
              <HTMLSelect
                aria-label={t('Assign to')}
                style={{ flex: '1 1 10em', maxWidth: '18em', minWidth: '7em' }}
                value={effectiveFill ?? ''}
                onChange={(event) => {
                  const value = event.currentTarget.value
                  onFillChange(value === '' ? null : value)
                }}
              >
                <option value="">{t('None')}</option>
                {display.areas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {resolveAreaLabel(area, displayFleetName)}
                  </option>
                ))}
              </HTMLSelect>
            </Palette>
          )}
          <ShipGrid
            display={display}
            fill={effectiveFill}
            readOnly={readOnly}
            ref={captureSection as RefObject<any>}
          />
        </div>
      )}
    </div>
  )
}

const PlanTab = ({
  display,
  fill,
  onFillChange,
  onOpenSynchronize,
  readOnly,
  view,
  onViewChange,
}: {
  display: DisplayContent
  fill: string | null
  onFillChange: (fill: string | null) => void
  onOpenSynchronize: () => void
  readOnly: boolean
  view: string
  onViewChange: (view: string) => void
}) => {
  const captureSection = useRef<HTMLDivElement>(null)
  const canSynchronize = useSelector(syncSourceSelector) !== null

  return (
    <div>
      <PlanToolbar captureSection={captureSection} />
      <PlannerViews
        canSynchronize={canSynchronize}
        captureSection={captureSection}
        display={display}
        fill={fill}
        onFillChange={onFillChange}
        onOpenSynchronize={onOpenSynchronize}
        readOnly={readOnly}
        view={view}
        onViewChange={onViewChange}
      />
    </div>
  )
}

const HistoryTab = ({ display }: { display: DisplayContent }) => {
  const [view, setView] = useState('area')
  const [fill, setFill] = useState<string | null>(null)
  const captureSection = useRef<HTMLDivElement>(null)

  return (
    <div>
      <Toolbar>
        <HistorySelector />
      </Toolbar>
      <PlannerViews
        captureSection={captureSection}
        display={display}
        fill={fill}
        onFillChange={setFill}
        readOnly
        view={view}
        onViewChange={setView}
      />
    </div>
  )
}

const ShareTab = ({
  displayName,
  exportDisabled,
  onExportCapture,
  previewing,
}: {
  displayName: string
  exportDisabled: boolean
  onExportCapture: () => ReturnType<typeof captureReference>
  previewing: boolean
}) => {
  const { t } = useTranslation('poi-plugin-navy-staff')
  const exportTitle = previewing
    ? t('Export previewed revision')
    : t('Export current workspace')
  const exportDescription = previewing
    ? t('Exports the previewed revision of "{{name}}". The plan stays read-only.', {
        name: displayName,
      })
    : t('Exports "{{name}}" as it is now.', { name: displayName })
  return (
    <ReferenceTools
      exportDescription={exportDescription}
      exportDisabled={exportDisabled}
      exportTitle={exportTitle}
      onExportCapture={onExportCapture}
    />
  )
}

const NavyStaffContent = () => {
  const [activeTab, setActiveTab] = useState('plan')
  // Plan view/fill live here so switching pages never resets the chosen grid
  // view or palette target (the plan page unmounts while another page is shown).
  const [planView, setPlanView] = useState('area')
  const [planFill, setPlanFill] = useState<string | null>(null)
  const [preview, setPreview] = useState<PreviewTarget | null>(null)
  const { t } = useTranslation('poi-plugin-navy-staff')
  const slice = useSelector(extensionSelectorFactory(PLUGIN_KEY)) as
    | { error?: string | null; ready?: boolean }
    | undefined
  const workspace = useSelector(selectedWorkspaceSelector)
  const workspaces = useSelector(workspacesSelector)
  const selectedWorkspaceId = useSelector(selectedWorkspaceIdSelector)
  const loadedAccountId = useSelector(loadedAccountIdSelector)
  const editingDisplay = useSelector(editingDisplayContentSelector)

  const previewRevision = useMemo(() => {
    if (!preview || !workspace || preview.workspaceId !== workspace.id) return undefined
    return workspace.revisions.find((revision) => revision.id === preview.revisionId)
  }, [preview, workspace])

  // An account switch closes any preview, even if a revision id happened to
  // coincide across accounts.
  useEffect(() => {
    setPreview(null)
  }, [loadedAccountId])

  // The palette target belongs to one workspace/account; a switch clears it so a
  // stale area id can never be submitted for a different display.
  useEffect(() => {
    setPlanFill(null)
  }, [selectedWorkspaceId, loadedAccountId])

  // Each page keeps its own transient scroll position; a newly opened page
  // starts at the top and returning to a page restores where it was. Never
  // persisted, and reset on an account/workspace switch.
  const bodyRef = useRef<HTMLDivElement>(null)
  const scrollPositions = useRef<Record<string, number>>({})
  const handleTabChange = useCallback(
    (next: string) => {
      if (bodyRef.current) {
        scrollPositions.current[activeTab] = bodyRef.current.scrollTop
      }
      setActiveTab(next)
    },
    [activeTab],
  )
  useEffect(() => {
    const body = bodyRef.current
    if (!body) return
    body.scrollTop = scrollPositions.current[activeTab] ?? 0
  }, [activeTab])
  useEffect(() => {
    scrollPositions.current = {}
    if (bodyRef.current) bodyRef.current.scrollTop = 0
  }, [selectedWorkspaceId, loadedAccountId])

  // A preview is closed when the workspace switches or its target disappears
  // (an edit after undo truncates the redo tail). The selected id is a
  // dependency so a preview never reappears when returning to a workspace.
  useEffect(() => {
    if (!preview) return
    if (preview.workspaceId !== selectedWorkspaceId) {
      setPreview(null)
      return
    }
    const target = workspaces.find((w) => w.id === preview.workspaceId)
    if (!target || !target.revisions.some((r) => r.id === preview.revisionId)) {
      setPreview(null)
    }
  }, [preview, workspaces, selectedWorkspaceId])

  const previewing = Boolean(previewRevision)
  const display = previewRevision
    ? capturedDisplayContent(previewRevision.content)
    : editingDisplay

  // History always renders a captured snapshot: the previewed revision when one
  // is open, otherwise the current cursor revision. It never overlays the live
  // roster (levels, fleet badges, live-only ships), unlike editing in Plan.
  const historyRevision = previewRevision ?? workspace?.revisions[workspace.cursor]
  const historyDisplay = historyRevision
    ? capturedDisplayContent(historyRevision.content)
    : editingDisplay

  const contextValue = useMemo(
    () => ({ setTarget: setPreview, target: preview }),
    [preview],
  )

  // Reference tools stay mounted regardless of planning readiness: import and
  // viewing work with no account, workspace, or master data loaded (unknown
  // masters render `???`). Export needs a ready selected workspace.
  const rawRosterShips = useSelector(rawRosterShipsSelector)
  const displayFleetName = useSelector((state: IState) =>
    get(state.config, DISPLAY_FLEET_NAME_CONFIG, false),
  )
  const captureReferenceForExport = useCallback(
    () =>
      captureReference(display, {
        captureTime:
          previewRevision?.time ??
          workspace?.revisions[workspace.cursor]?.time ??
          new Date().toISOString(),
        displayFleetName,
        exportTime: new Date().toISOString(),
        locale: window.language,
        // Current export overlays raw owned values (gated to a matching loaded
        // account); a historical preview keeps the captured values.
        rawShips: previewRevision ? undefined : rawRosterShips,
        title: display.name,
      }),
    [display, displayFleetName, previewRevision, rawRosterShips, workspace],
  )

  const gated = (content: React.ReactNode) =>
    slice?.error ? (
      <Callout intent={Intent.DANGER}>{t('loadError')}</Callout>
    ) : slice?.ready ? (
      content
    ) : (
      <Callout>{t('loading')}</Callout>
    )

  // Workspace mutation and undo/redo are unavailable until the slice is ready
  // and error-free; the manager itself is always visible in the header.
  const gateDisabled = !slice?.ready || Boolean(slice?.error)

  return (
    <Wrapper id="poi-plugin-navy-staff">
      <NavGlobalStyle />
      <PreviewContext.Provider value={contextValue}>
        <Header>
          <WorkspaceManager
            accountId={loadedAccountId}
            disabled={gateDisabled}
            readOnly={previewing}
          />
          <HeaderSpacer />
          <UndoRedo disabled={gateDisabled} />
          {previewing && (
            <>
              <PreviewNote>
                {t('Viewing an earlier revision (read-only)')}
              </PreviewNote>
              <Button onClick={() => setPreview(null)}>{t('Exit preview')}</Button>
            </>
          )}
        </Header>
        <Tabs
          id="navy-staff-pages"
          selectedTabId={activeTab}
          onChange={handleTabChange}
        >
          <Tab id="plan" title={t('Plan')} />
          <Tab id="history" title={t('History')} />
          <Tab id="sync" title={t('Synchronize')} />
          <Tab id="share" title={t('Share & reference')} />
        </Tabs>
        <Body ref={bodyRef} className="navy-staff-scrollable">
          {activeTab === 'plan' &&
            gated(
              <PlanTab
                display={display}
                fill={planFill}
                onFillChange={setPlanFill}
                onOpenSynchronize={() => handleTabChange('sync')}
                onViewChange={setPlanView}
                readOnly={previewing}
                view={planView}
              />,
            )}
          {activeTab === 'history' && gated(<HistoryTab display={historyDisplay} />)}
          {/* Synchronize stays mounted while hidden so a corrected mapping or
              prepared preview survives a detour to Plan; its own reset key
              still discards it on account/workspace/source/preview changes. */}
          <div style={{ display: activeTab === 'sync' ? undefined : 'none' }}>
            {gated(<SyncBar historyPreview={previewing} />)}
          </div>
          {/* Share & reference stays mounted while hidden so an imported
              reference and the import draft survive page changes. */}
          <div style={{ display: activeTab === 'share' ? undefined : 'none' }}>
            <ShareTab
              displayName={display.name}
              exportDisabled={!(slice?.ready && !slice?.error && workspace)}
              onExportCapture={captureReferenceForExport}
              previewing={previewing}
            />
          </div>
        </Body>
      </PreviewContext.Provider>
    </Wrapper>
  )
}

export const reactClass = () => <NavyStaffContent />
