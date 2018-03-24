import React, { Component } from 'react'
import propTypes from 'prop-types'
import { Label } from 'react-bootstrap'
import FA from 'react-fontawesome'
import { get, groupBy, keyBy } from 'lodash'
import fp from 'lodash/fp'
import { connect } from 'react-redux'

import { onAddShip, onRemoveShip, onDisplaceShip } from '../../redux'
import AddShipDropdown from './add-ship-dropdown'
import ShipChip from './ship-chip'
import { shipMenuDataSelector, deckPlannerAreaSelectorFactory } from '../../selectors'
import { hexToRGBA } from '../../utils'


const Area = connect(
  (state, props) => ({
    ships: shipMenuDataSelector(state),
    shipIds: deckPlannerAreaSelectorFactory(props.index)(state),
  })
)(class Area extends Component {
  static propTypes = {
    dispatch: propTypes.func,
    index: propTypes.number,
    // eslint-disable-next-line react/forbid-prop-types
    area: propTypes.object,
    others: propTypes.arrayOf(propTypes.object),
    ships: propTypes.arrayOf(propTypes.object),
    shipIds: propTypes.arrayOf(propTypes.number),
  }

  handleAddShip = (eventKey) => {
    this.props.dispatch(onAddShip({
      shipId: eventKey,
      areaIndex: this.props.index,
    }))
  }

  handleRemoveShip = id => () => {
    this.props.dispatch(onRemoveShip({
      shipId: id,
      areaIndex: this.props.index,
    }))
  }

  handleDisplace = id => (eventKey) => {
    this.props.dispatch(onDisplaceShip({
      shipId: id,
      fromAreaIndex: this.props.index,
      toAreaIndex: eventKey,
    }))
  }

  render() {
    const {
      area, index, others, ships, shipIds,
    } = this.props
    const keyShips = keyBy(ships, 'id')
    const groupShipIds = groupBy(shipIds, id => (keyShips[id] || {}).superTypeIndex)
    return (
      <div style={{ border: `solid 1px ${hexToRGBA(area.color, 0.5)}` }} className="area">
        <div className="header">
          <div className="area-name"><Label style={{ color: area.color }}><FA name="tag" /></Label>{area.name}</div>
          <div><AddShipDropdown area={index} onSelect={this.handleAddShip} /></div>
        </div>
        <div style={{ backgroundColor: hexToRGBA(area.color, 0.5) }}>
          <div className="planned">
            <div className="pool">
              {
                Object.keys(groupShipIds).map(idx => (
                  <div className="lane" key={idx}>
                    {
                      fp.flow(
                        fp.sortBy([id => -get(keyShips[id], 'lv', 0), id => -id]),
                        fp.map(
                          id => (
                            <ShipChip
                              shipId={id}
                              onRemove={this.handleRemoveShip(id)}
                              onDisplace={this.handleDisplace(id)}
                              others={others}
                              key={id}
                              planArea={index}
                            />
                          )
                        ),
                      )(groupShipIds[idx])
                    }
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      </div>
    )
  }
})


export default Area
