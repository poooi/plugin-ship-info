// tslint:disable jsx-no-lambda

import {
  Button,
  Callout,
  Classes,
  HTMLSelect,
  InputGroup,
  Intent,
  Switch,
  Tab,
  Tabs,
} from '@blueprintjs/core'
import cls from 'classnames'
import { get } from 'lodash'
import { rgba } from 'polished'
import React, {
  RefObject,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import type { Action } from 'redux'
import type { ThunkDispatch } from 'redux-thunk'
import styled, { createGlobalStyle } from 'styled-components'
import { WindowEnv } from 'views/components/etc/window-env'
import { extensionSelectorFactory, IState } from 'views/utils/selectors'

import { Checkbox, CheckboxLabel, CheckboxOption } from '@poi-plugins/ship-info-shared/ui/checkbox'
import { poiSurface } from '@poi-plugins/ship-info-shared/ui/styles'
import { captureRect } from './planner/capture'
import { Area } from './planner/area'
import { ShipGrid } from './planner/ship-grid'
import { resolveAreaLabel } from './planner/types'
import { DISPLAY_FLEET_NAME_CONFIG, PLUGIN_KEY } from './plugin-identity'
import {
  createWorkspace,
  duplicateWorkspace,
  onDeleteWorkspace,
  onRenameWorkspace,
  onSelectWorkspace,
} from './workspace/actions'
import {
  areaViewsSelector,
  ownerStatusSelector,
  selectedWorkspaceIdSelector,
  workspacesSelector,
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

const Palette = styled.div<{ color: string }>`
  position: sticky;
  top: 0;
  z-index: 20;
  ${(props) =>
    poiSurface(
      rgba(props.theme.variant === 'dark' ? '#000' : '#fff', 0.75),
    )}
  padding-left: 1em;
  border-left: 8px solid ${(props) => props.color || '#000'};

  :hover {
    background-color: var(
      --poi-background-color-opaque,
      ${(props) => (props.theme.variant === 'dark' ? '#000' : '#fff')}
    );
  }
`

const ActionPanel = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1em;
  flex-wrap: wrap;
`

const ManagerBar = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5em;
  padding: 0.5em 1em 0;
  flex-wrap: wrap;
`

const OwnerNote = styled.span`
  font-size: 0.85em;
  opacity: 0.8;
`

const WorkspaceManager = () => {
  const dispatch = useDispatch<ThunkDispatch<IState, unknown, Action>>()
  const workspaces = useSelector(workspacesSelector)
  const selectedId = useSelector(selectedWorkspaceIdSelector)
  const ownerStatus = useSelector(ownerStatusSelector)
  const { t } = useTranslation('poi-plugin-navy-staff')

  const [renaming, setRenaming] = useState(false)
  const [renameTarget, setRenameTarget] = useState<string | null>(null)
  const [nameDraft, setNameDraft] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const selected = workspaces.find((workspace) => workspace.id === selectedId)

  // A pending rename/delete must never apply to a different workspace than the
  // one it was opened for. Reset both whenever the selection changes.
  useEffect(() => {
    setRenaming(false)
    setRenameTarget(null)
    setDeleteTarget(null)
  }, [selectedId])

  const ownerNote = ownerStatus.matches
    ? t('Live roster linked')
    : ownerStatus.workspaceOwnerMemberId === null
      ? t('Saved data (owner unknown)')
      : t('Saved data (different account)')

  return (
    <ManagerBar>
      <HTMLSelect
        aria-label={t('Workspace')}
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

      {renaming && renameTarget ? (
        <>
          <InputGroup
            aria-label={t('Workspace name')}
            value={nameDraft}
            onChange={(event) => setNameDraft(event.currentTarget.value)}
          />
          <Button
            intent={Intent.PRIMARY}
            onClick={() => {
              dispatch(
                onRenameWorkspace({
                  id: renameTarget,
                  name: nameDraft,
                  now: new Date().toISOString(),
                }),
              )
              setRenaming(false)
              setRenameTarget(null)
            }}
          >
            {t('Confirm')}
          </Button>
          <Button
            onClick={() => {
              setRenaming(false)
              setRenameTarget(null)
            }}
          >
            {t('Cancel')}
          </Button>
        </>
      ) : (
        <>
          <Button
            icon="add"
            onClick={() => dispatch(createWorkspace(`${t('Workspace')} ${workspaces.length + 1}`))}
          >
            {t('New workspace')}
          </Button>
          <Button
            icon="edit"
            disabled={!selected}
            onClick={() => {
              if (!selected) return
              setNameDraft(selected.revisions[selected.cursor].content.name)
              setRenameTarget(selected.id)
              setRenaming(true)
            }}
          >
            {t('Rename')}
          </Button>
          <Button
            icon="duplicate"
            disabled={!selected}
            onClick={() => selected && dispatch(duplicateWorkspace(selected.id))}
          >
            {t('Duplicate')}
          </Button>
          {deleteTarget ? (
            <>
              <Button
                intent={Intent.DANGER}
                onClick={() => {
                  dispatch(onDeleteWorkspace({ id: deleteTarget }))
                  setDeleteTarget(null)
                }}
              >
                {t('Delete permanently')}
              </Button>
              <Button onClick={() => setDeleteTarget(null)}>{t('Cancel')}</Button>
            </>
          ) : (
            <Button
              icon="trash"
              disabled={!selected}
              onClick={() => selected && setDeleteTarget(selected.id)}
            >
              {t('Delete')}
            </Button>
          )}
        </>
      )}

      {selected && <OwnerNote>{ownerNote}</OwnerNote>}
    </ManagerBar>
  )
}

interface IPlannerContentProps {
  activeTab: string
}

const PlannerContent = ({ activeTab }: IPlannerContentProps) => {
  const dispatch = useDispatch<ThunkDispatch<IState, unknown, Action>>()
  const areas = useSelector(areaViewsSelector)
  const ownerStatus = useSelector(ownerStatusSelector)
  const displayFleetName = useSelector((state: IState) =>
    get(state.config, DISPLAY_FLEET_NAME_CONFIG, false),
  )
  const { t } = useTranslation('poi-plugin-navy-staff')
  const [fill, setFill] = useState<string | null>(null)
  const captureSection = useRef<HTMLDivElement>(null)
  const { window: displayWindow } = useContext(WindowEnv)

  const handleChangeDisplayFleetName = useCallback(() => {
    window.config.set(DISPLAY_FLEET_NAME_CONFIG, !displayFleetName)
  }, [displayFleetName])

  const capture = useCallback(() => {
    if (captureSection.current) captureRect(captureSection.current)
  }, [])

  const areaChoices = areas.map((area) => ({
    color: area.color,
    id: area.id,
    label: resolveAreaLabel(area, displayFleetName),
  }))

  const fillArea = areas.find((area) => area.id === fill)

  return (
    <div>
      <ActionPanel>
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
      </ActionPanel>
      <Callout intent={Intent.PRIMARY}>{t('helpContent')}</Callout>
      {areas.length === 0 ? (
        <Callout>{t('No areas captured')}</Callout>
      ) : activeTab === 'area' ? (
        <div>
          <div ref={captureSection}>
            {areas.map((area) => (
              <Area
                key={area.id}
                area={area}
                others={areaChoices.filter((choice) => choice.id !== area.id)}
                displayFleetName={displayFleetName}
                canAdd={ownerStatus.matches}
              />
            ))}
          </div>
        </div>
      ) : (
        <div>
          <Palette color={fillArea?.color ?? '#000'}>
            <Checkbox>
              <CheckboxLabel>{t('Palette')}</CheckboxLabel>
              <CheckboxOption key="none" checked={fill === null} onClick={() => setFill(null)}>
                {t('None')}
              </CheckboxOption>
              {areas.map((area) => (
                <CheckboxOption
                  key={area.id}
                  checked={fill === area.id}
                  onClick={() => setFill(area.id)}
                >
                  {resolveAreaLabel(area, displayFleetName)}
                </CheckboxOption>
              ))}
            </Checkbox>
          </Palette>
          <ShipGrid fill={fill} ref={captureSection as RefObject<any>} />
        </div>
      )}
    </div>
  )
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
`

const Body = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0 1em 1em;
`

const NavyStaffContent = () => {
  const [activeTab, setActiveTab] = useState('area')
  const { t } = useTranslation('poi-plugin-navy-staff')
  const slice = useSelector(extensionSelectorFactory(PLUGIN_KEY)) as
    | { error?: string | null; ready?: boolean }
    | undefined

  return (
    <Wrapper id="poi-plugin-navy-staff">
      <NavGlobalStyle />
      <Tabs
        id="navy-staff-content"
        selectedTabId={activeTab}
        onChange={(tab: string) => setActiveTab(tab)}
      >
        <Tab id="area" title={t('Area View')} />
        <Tab id="grid" title={t('Ship Grid')} />
      </Tabs>
      <Body className={cls(Classes.DIALOG_BODY, 'navy-staff-scrollable')}>
        {slice?.error ? (
          <Callout intent={Intent.DANGER}>{t('loadError')}</Callout>
        ) : slice?.ready ? (
          <>
            <WorkspaceManager />
            <PlannerContent activeTab={activeTab} />
          </>
        ) : (
          <Callout>{t('loading')}</Callout>
        )}
      </Body>
    </Wrapper>
  )
}

export const reactClass = () => <NavyStaffContent />
