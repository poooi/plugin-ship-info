import React, { Component } from 'react'
import { connect } from 'react-redux'
import fp from 'lodash/fp'

import { shipSuperTypeMap } from '../../utils'
import { shipMenuDataSelector, ShipItemSelectorFactory, deckPlannerAreaSelectorFactory } from '../../selectors'

const { __ } = window

const ShipGrid = connect(
  (state) => ({
    ships: shipMenuDataSelector(state),
  })
)(class ShipGrid extends Component {
  render() {
    const { ships } = this.props
    return (
      <div>
        {
          shipSuperTypeMap.map(stype => (
            <div>
              <h2>{__(stype.name)}</h2>
              <div>
                {
                  fp.flow(
                    fp.filter(ship => stype.id.includes(ship.typeId)),
                    fp.map(ship => <div>{ship.name}</div>),
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
