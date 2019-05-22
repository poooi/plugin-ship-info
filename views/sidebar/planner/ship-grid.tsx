import fp from 'lodash/fp'
import React, { Dispatch, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { connect, DispatchProp } from 'react-redux'
import styled from 'styled-components'

import { Action } from 'redux'
import { ThunkAction, ThunkDispatch } from 'redux-thunk'
import { shipSuperTypeMap } from '../../constants'
import { onAddShip, onDisplaceShip, onRemoveShip } from '../../redux'
import {
  deckPlannerShipMapSelector,
  IShipInfoMenuData,
  shipMenuDataSelector,
} from '../../selectors'
import { ShipItem } from './ship-item'

const getDPAction = (
  shipId: number,
  fill: number,
): ThunkAction<void, any, void, Action<any>> => (
  dispatch: Dispatch<any>,
  getState: () => any,
) => {
  const planMap = deckPlannerShipMapSelector(getState())

  if (fill === planMap[shipId] || (fill === -1 && !(shipId in planMap))) {
    return
  }

  if (fill === -1) {
    dispatch(
      onRemoveShip({
        areaIndex: planMap[shipId],
        shipId,
      }),
    )
    return
  }

  if (!(shipId in planMap)) {
    dispatch(
      onAddShip({
        areaIndex: fill,
        shipId,
      }),
    )
    return
  }

  dispatch(
    onDisplaceShip({
      fromAreaIndex: planMap[shipId],
      shipId,
      toAreaIndex: fill,
    }),
  )
}

const Grid = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
`

interface IProps extends DispatchProp {
  fill: number
  ships: IShipInfoMenuData[]
  dispatch: ThunkDispatch<any, void, Action<any>>
}

export const ShipGrid = connect(state => ({
  ships: shipMenuDataSelector(state),
}))(({ ships, dispatch, fill }: IProps) => {
  const handleClick = useCallback(
    (shipId: number) => {
      dispatch(getDPAction(shipId, fill))
    },
    [dispatch, fill],
  )

  const handleContextmenu = useCallback(
    (shipId: number) => {
      dispatch(getDPAction(shipId, -1))
    },
    [dispatch],
  )

  const { t } = useTranslation(['poi-plugin-ship-info'])

  return (
    <div>
      {shipSuperTypeMap.map(stype => (
        <div key={stype.name}>
          <h2>{t(stype.name)}</h2>
          <Grid>
            {fp.flow(
              fp.filter((ship: IShipInfoMenuData) =>
                stype.id.includes(ship.typeId),
              ),
              fp.sortBy([
                (ship: IShipInfoMenuData) => -ship.lv,
                ship => -ship.id,
              ]),
              fp.map(ship => (
                <ShipItem
                  ship={ship}
                  key={ship.id}
                  // tslint:disable jsx-no-lambda
                  onClick={() => handleClick(ship.id)}
                  onContextmenu={() => handleContextmenu(ship.id)}
                />
              )),
            )(ships)}
          </Grid>
        </div>
      ))}
    </div>
  )
})
