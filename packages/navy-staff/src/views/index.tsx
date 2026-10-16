// tslint:disable jsx-no-lambda

import {
  Button,
  Callout,
  Classes,
  Intent,
  Switch,
  Tab,
  Tabs,
} from '@blueprintjs/core'
import cls from 'classnames'
import { each, findIndex, get } from 'lodash'
import { rgba } from 'polished'
import React, {
  Dispatch,
  Ref,
  RefObject,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import { connect, DispatchProp, useSelector } from 'react-redux'
import { Action } from 'redux'
import { ThunkDispatch } from 'redux-thunk'
import styled, { createGlobalStyle } from 'styled-components'
import { WindowEnv } from 'views/components/etc/window-env'
import {
  extensionSelectorFactory,
  IState,
} from 'views/utils/selectors'

import { Checkbox, CheckboxLabel, CheckboxOption } from '@poi-plugins/ship-info-shared/ui/checkbox'
import { poiSurface } from '@poi-plugins/ship-info-shared/ui/styles'
import { captureRect } from './planner/capture'
import {
  onAddShip,
  onDisplaceShip,
  onDPInit,
  onRemoveShip,
} from './planner/redux'
import {
  deckPlannerCurrentSelector,
  deckPlannerShipMapSelector,
  shipMenuDataSelector,
} from './planner/selectors'
import { Area } from './planner/area'
import { ShipGrid } from './planner/ship-grid'
import { DISPLAY_FLEET_NAME_CONFIG, PLUGIN_KEY } from './plugin-identity'

export { reducer } from './redux'

// Self-contained scrollbar styling: Navy must not depend on Ship Info's global
// styles being mounted to look right (including in a detached window).
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

// Reconciles the plan with the host's tag/roster state. It must never run
// before the host roster has loaded, otherwise imported assignments would be
// silently erased. Out-of-range tags are handled by the reducer (which grows
// areas) instead of being dropped.
const reorderShips = (dispatch: Dispatch<any>, getState: () => any) => {
  const state = getState()
  const ships = shipMenuDataSelector(state)
  if (ships.length === 0) {
    return
  }
  const planMap = deckPlannerShipMapSelector(state)

  each(ships, ship => {
    if (ship.area! > 0) {
      if (!(ship.id in planMap)) {
        dispatch(
          onAddShip({
            areaIndex: ship.area! - 1,
            shipId: ship.id,
          }),
        )
      } else if (ship.area! - 1 !== planMap[ship.id]) {
        dispatch(
          onDisplaceShip({
            fromAreaIndex: planMap[ship.id],
            shipId: ship.id,
            toAreaIndex: ship.area! - 1,
          }),
        )
      }
    }
  })

  each(Object.keys(planMap), shipId => {
    if (findIndex(ships, ship => ship.id === +shipId) < 0) {
      dispatch(
        onRemoveShip({
          areaIndex: planMap[shipId],
          shipId: +shipId,
        }),
      )
    }
  })
}

const Palette = styled.div<{ color: string }>`
  position: sticky;
  top: 0;
  z-index: 20;
  ${props =>
    poiSurface(
      rgba(props.theme.variant === 'dark' ? '#000' : '#fff', 0.75),
    )}
  padding-left: 1em;
  border-left: 8px solid ${props => props.color || '#000'};

  /* Hover deliberately goes solid for readability, so it wants poi's
     always-opaque token rather than the vibrancy-aware one. */
  :hover {
    background-color: var(
      --poi-background-color-opaque,
      ${props => (props.theme.variant === 'dark' ? '#000' : '#fff')}
    );
  }
`

interface IPlannerContentProps extends DispatchProp {
  color: string[]
  displayFleetName: boolean
  mapname: string[]
  current: number[][]
  activeTab: string
  dispatch: ThunkDispatch<any, void, Action<any>>
}

const ActionPanel = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1em;
`

const PlannerContent = connect((state: IState) => {
  const displayFleetName = get(state.config, DISPLAY_FLEET_NAME_CONFIG, false)
  const mapname = displayFleetName
    ? get(state, ['fcd', 'shiptag', 'fleetname', window.language], [])
    : get(state, ['fcd', 'shiptag', 'mapname'], [])

  return {
    color: get(state, 'fcd.shiptag.color', []),
    current: deckPlannerCurrentSelector(state),
    displayFleetName,
    mapname,
  }
})(
  ({
    mapname,
    color,
    current,
    displayFleetName,
    dispatch,
    activeTab,
  }: IPlannerContentProps) => {
    useEffect(() => {
      if (current.length !== mapname.length) {
        dispatch(
          onDPInit({
            color,
            mapname,
          }),
        )
      }

      dispatch(reorderShips)
    })

    const { t } = useTranslation(['poi-plugin-navy-staff'])

    const handleChangeDisplayFleetName = useCallback(() => {
      window.config.set(DISPLAY_FLEET_NAME_CONFIG, !displayFleetName)
    }, [displayFleetName])

    const handleRefresh = useCallback(() => {
      dispatch(reorderShips)
    }, [dispatch])

    const areas = mapname.map((name, index) => ({
      areaIndex: index,
      color: color[index],
      name,
      ships: [],
    }))

    const [fill, setFill] = useState(-1)

    const captureSection = useRef<HTMLDivElement>(null)

    // The WindowEnv context `window` can be the detached external window, which
    // (blank, nodeIntegration=no) has no `config`; preference writes must use
    // the renderer's global `window.config`.
    const { window: displayWindow } = useContext(WindowEnv)

    const capture = useCallback(() => {
      if (captureSection.current) {
        captureRect(captureSection.current)
      }
    }, [])

    return (
      <div>
        <ActionPanel>
          <Button intent={Intent.PRIMARY} minimal onClick={handleRefresh}>
            {t('Refresh')}
          </Button>
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
        {activeTab === 'area' ? (
          <div>
            <div ref={captureSection}>
              {areas.map(area => (
                <Area
                  key={area.color}
                  area={area}
                  index={area.areaIndex}
                  others={areas.filter(
                    ({ areaIndex }) => areaIndex !== area.areaIndex,
                  )}
                />
              ))}
            </div>
          </div>
        ) : (
          <div>
            <Palette color={color[fill]}>
              <Checkbox>
                <CheckboxLabel>{t('Palette')}</CheckboxLabel>
                <CheckboxOption
                  key={-1}
                  checked={fill === -1}
                  onClick={() => setFill(-1)}
                >
                  {t('None')}
                </CheckboxOption>
                {areas.map(area => (
                  <CheckboxOption
                    key={area.color}
                    onClick={() => setFill(area.areaIndex)}
                    checked={fill === area.areaIndex}
                  >
                    {area.name}
                  </CheckboxOption>
                ))}
              </Checkbox>
            </Palette>
            <ShipGrid fill={fill} ref={captureSection as RefObject<any>} />
          </div>
        )}
      </div>
    )
  },
)

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

// The planner tabs are the plugin's main view (no sidebar button or modal).
// Everything that mutates the plan is gated on `ready` so edits cannot happen
// while the asynchronous load/migration is still running.
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
          <PlannerContent activeTab={activeTab} />
        ) : (
          <Callout>{t('loading')}</Callout>
        )}
      </Body>
    </Wrapper>
  )
}

export const reactClass = () => <NavyStaffContent />
