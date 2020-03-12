// tslint:disable jsx-no-lambda

import { Button, Callout, Classes, Intent, Tab, Tabs } from '@blueprintjs/core'
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
import FontAwesome from 'react-fontawesome'
import { useTranslation } from 'react-i18next'
import { connect, DispatchProp } from 'react-redux'
import { Action } from 'redux'
import { observe } from 'redux-observers'
import { ThunkDispatch } from 'redux-thunk'
import styled from 'styled-components'
import { Dialog } from 'views/components/etc/overlay'
import { WindowEnv } from 'views/components/etc/window-env'
import { store } from 'views/create-store'

import {
  dataObserver,
  onAddShip,
  onDisplaceShip,
  onDPInit,
  onRemoveShip,
} from '../../redux'
import {
  deckPlannerCurrentSelector,
  deckPlannerShipMapSelector,
  shipMenuDataSelector,
} from '../../selectors'
import { captureRect } from '../../utils'
import { Checkbox, CheckboxLabel, CheckboxOption } from '../components/checkbox'
import { Area } from './area'
import { ShipGrid } from './ship-grid'

const reorderShips = (dispatch: Dispatch<any>, getState: () => any) => {
  const state = getState()
  const ships = shipMenuDataSelector(state)
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
  background-color: ${props =>
    rgba(props.theme.variant === 'dark' ? '#000' : '#fff', 0.75)};
  padding-left: 1em;
  border-left: 8px solid ${props => props.color || '#000'};

  :hover {
    background-color: ${props =>
      props.theme.variant === 'dark' ? '#000' : '#fff'};
  }
`

interface IPlannerContentProps extends DispatchProp {
  color: string[]
  mapname: string[]
  current: number[][]
  vibrant: number
  displayFleetName: boolean
  activeTab: string
  dispatch: ThunkDispatch<any, void, Action<any>>
}

const ActionPanel = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
`

const PlannerContent = connect((state: { config: any }) => {
  const displayFleetName = get(
    state.config,
    'plugin.ShipInfo.displayFleetName',
    false,
  )
  const mapname = displayFleetName
    ? get(state, ['fcd', 'shiptag', 'fleetname', window.language], [])
    : get(state, ['fcd', 'shiptag', 'mapname'], [])

  return {
    color: get(state, 'fcd.shiptag.color', []),
    current: deckPlannerCurrentSelector(state),
    displayFleetName,
    mapname,
    vibrant: get(state, 'config.poi.vibrant'),
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

    // const handleCaptureImage = useCallback(() => {
    //   captureRect()
    // })

    const { t } = useTranslation(['poi-plugin-ship-info'])

    // public handleCaptureImage = async () => {
    //   this.setState({ extend: true }, async () => {
    //     await captureRect('#planner-rect', this.props.window.document)
    //     this.setState({ extend: false })
    //   })
    // }

    const handleChangeDisplayFleetName = useCallback(() => {
      window.config.set('plugin.ShipInfo.displayFleetName', !displayFleetName)
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

    const { window } = useContext(WindowEnv)

    const capture = useCallback(() => {
      if (captureSection.current) {
        captureRect(captureSection.current)
      }
    }, [])

    return (
      <div>
        <ActionPanel>
          <Button
            intent={Intent.PRIMARY}
            minimal
            onClick={handleRefresh}
          >
            {t('Refresh')}
          </Button>
          {!window.isMain && (
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

const PlannerDialog = styled(Dialog)`
  width: 80vw;
  height: 90vh;
  ${`.${Classes.DIALOG_BODY}`} {
    overflow-y: scroll;
  }
`

const Title = styled.div`
  display: flex;
  padding-right: 2em;
`

const Heading = styled.div`
  flex-grow: 1;
`

export const Planner = () => {
  const [isOpen, setIsOpen] = useState(false)
  const { t } = useTranslation('poi-plugin-ship-info')

  const [activeTab, setActiveTab] = useState('area')

  useEffect(() => {
    const unsubscribe = observe(store, [dataObserver])

    return () => unsubscribe()
  }, [])

  return (
    <>
      <Button minimal onClick={() => setIsOpen(true)}>
        <FontAwesome name="tags" />
      </Button>
      <PlannerDialog
        isOpen={isOpen}
        autoFocus
        canOutsideClickClose
        onClose={() => setIsOpen(false)}
        title={
          <Title>
            <Heading>{t('Deck Planner')}</Heading>
            <Tabs
              id="deck-planner-content"
              selectedTabId={activeTab}
              onChange={(tab: string) => setActiveTab(tab)}
            >
              <Tab id="area" title={t('Area View')} />
              <Tab id="grid" title={t('Ship Grid')} />
            </Tabs>
          </Title>
        }
      >
        <div className={cls(Classes.DIALOG_BODY, 'ship-info-scrollable')}>
          <PlannerContent activeTab={activeTab} />
        </div>
      </PlannerDialog>
    </>
  )
}
