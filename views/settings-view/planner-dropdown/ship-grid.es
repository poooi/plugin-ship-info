import React, { Component } from 'react'
import { connect } from 'react-redux'
import fp from 'lodash/fp'
import { translate } from 'react-i18next'

import ShipItem from './ship-item'
import { shipSuperTypeMap } from '../../utils'
import { onAddShip, onRemoveShip, onDisplaceShip } from '../../redux'
import {
  shipMenuDataSelector,
  deckPlannerShipMapSelector,
} from '../../selectors'

const getDPAction = (shipId, fill) => (dispatch, getState) => {
  const planMap = deckPlannerShipMapSelector(getState())

  if (fill === planMap[shipId] || (fill === -1 && !(shipId in planMap))) {
    return
  }

  if (fill === -1) {
    dispatch(
      onRemoveShip({
        shipId,
        areaIndex: planMap[shipId],
      }),
    )
    return
  }

  if (!(shipId in planMap)) {
    dispatch(
      onAddShip({
        shipId,
        areaIndex: fill,
      }),
    )
    return
  }

  dispatch(
    onDisplaceShip({
      shipId,
      fromAreaIndex: planMap[shipId],
      toAreaIndex: fill,
    }),
  )
}

@translate(['poi-plugin-ship-info'])
@connect(state => ({
  ships: shipMenuDataSelector(state),
}))
class ShipGrid extends Component {
  handleClick = shipId => () => {
    // eslint-disable-next-line react/prop-types
    this.props.dispatch(getDPAction(shipId, this.props.fill))
  }

  handleContextmenu = shipId => () => {
    // eslint-disable-next-line react/prop-types
    this.props.dispatch(getDPAction(shipId, -1))
  }

  render() {
    // eslint-disable-next-line react/prop-types
    const { ships, t } = this.props
    return (
      <div>
        {shipSuperTypeMap.map(stype => (
          <div key={stype.name}>
            <h2>{t(stype.name)}</h2>
            <div className="ship-grid">
              {fp.flow(
                fp.filter(ship => stype.id.includes(ship.typeId)),
                fp.sortBy([ship => -ship.lv, ship => -ship.id]),
                fp.map(ship => (
                  <ShipItem
                    ship={ship}
                    key={ship.id}
                    onClick={this.handleClick(ship.id)}
                    onContextmenu={this.handleContextmenu(ship.id)}
                  />
                )),
              )(ships)}
            </div>
          </div>
        ))}
      </div>
    )
  }
}

export default ShipGrid
