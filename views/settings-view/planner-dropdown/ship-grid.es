import React, { Component } from 'react'
import { connect } from 'react-redux'
import fp from 'lodash/fp'
import { get } from 'lodash'

import { shipSuperTypeMap, hexToRGBA } from '../../utils'
import { shipMenuDataSelector, deckPlannerShipMapSelector } from '../../selectors'

const { __ } = window

const ShipItem = connect(
  state => ({
    planMap: deckPlannerShipMapSelector(state),
    color: get(state, 'fcd.shiptag.color', []),
    mapname: get(state, 'fcd.shiptag.mapname', []),
  }),
)(({ ship, planMap, color, mapname }) => {
  const bgColor = String(ship.id) in planMap && hexToRGBA(color[planMap[ship.id]], 0.75)
  return (
    <div
      style={{
        backgroundColor: bgColor,
      }}
    >
      {ship.name}
    </div>
  )
})

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
            <div key={stype.name}>
              <h2>{__(stype.name)}</h2>
              <div>
                {
                  fp.flow(
                    fp.filter(ship => stype.id.includes(ship.typeId)),
                    fp.sortBy([ship => -ship.lv, ship => ship.id]),
                    fp.map(ship => <ShipItem ship={ship} key={ship.id} />),
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
