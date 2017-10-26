import React, { Component, PureComponent } from 'react'
import { connect } from 'react-redux'
import fp from 'lodash/fp'
import { get } from 'lodash'
import FA from 'react-fontawesome'

import { shipSuperTypeMap, hexToRGBA } from '../../utils'
import { onAddShip, onRemoveShip, onDisplaceShip } from '../../redux'
import { shipMenuDataSelector, deckPlannerShipMapSelector } from '../../selectors'

const getDPAction = (shipId, fill) => (dispatch, getState) => {
  const planMap = deckPlannerShipMapSelector(getState())

  if (fill === planMap[shipId] || (fill === -1 && !(shipId in planMap))) {
    return
  }

  if (fill === -1) {
    dispatch(onRemoveShip({
      shipId,
      areaIndex: planMap[shipId],
    }))
    return
  }

  if (!(shipId in planMap)) {
    dispatch(onAddShip({
      shipId,
      areaIndex: fill,
    }))
    return
  }

  dispatch(onDisplaceShip({
    shipId,
    fromAreaIndex: planMap[shipId],
    toAreaIndex: fill,
  }))
}

const { __, __r } = window

const ShipItem = connect(
  state => ({
    planMap: deckPlannerShipMapSelector(state),
    color: get(state, 'fcd.shiptag.color', []),
    mapname: get(state, 'fcd.shiptag.mapname', []),
  }),
)(class ShipItem extends PureComponent {
  state = {
    hover: false,
  }

  handleMouseEnter = () => this.setState({ hover: true })

  handleMouseLeave = () => this.setState({ hover: false })

  render() {
    const { ship, planMap, color, mapname, onClick, onContextmenu } = this.props
    const { hover } = this.state
    const alpha = hover ? 0.85 : 0.75
    const bgColor = ship.area > 0
      ? hexToRGBA(color[ship.area - 1], alpha)
      : (String(ship.id) in planMap && hexToRGBA(color[planMap[ship.id]], alpha))
    return (
      <div
        role="button"
        tabIndex="0"
        className="ship-grid-cell"
        style={{
          backgroundColor: bgColor,
          cursor: ship.area > 0 ? 'not-allowed' : 'copy',
        }}
        onClick={!(ship.area > 0) && onClick}
        onContextMenu={!(ship.area > 0) && onContextmenu}
        onMouseEnter={this.handleMouseEnter}
        onMouseLeave={this.handleMouseLeave}
      >
        <span className="ship-name">{ship.area > 0 && <FA name="tag" />}{__r(ship.name)}</span>
        <span className="ship-level"><sup>Lv.{ship.lv}</sup></span>
      </div>
    )
  }
})

const ShipGrid = connect(
  (state) => ({
    ships: shipMenuDataSelector(state),
  })
)(class ShipGrid extends Component {

  handleClick = shipId => () => {
    this.props.dispatch(getDPAction(shipId, this.props.fill))
  }

  handleContextmenu = shipId => () => {
    this.props.dispatch(getDPAction(shipId, -1))
  }

  render() {
    const { ships } = this.props
    return (
      <div>
        {
          shipSuperTypeMap.map(stype => (
            <div key={stype.name}>
              <h2>{__(stype.name)}</h2>
              <div className="ship-grid">
                {
                  fp.flow(
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
                  )(ships)
                }
              </div>
            </div>
          ))
        }
      </div>
    )
  }
})

export default ShipGrid
