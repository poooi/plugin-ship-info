import React from 'react'
import { connect } from 'react-redux'
import FA from 'react-fontawesome'

import { get } from 'lodash'
import fp from 'lodash/fp'

import { leyteFleets } from '../../utils'
import { shipMenuDataSelector, sameShipMapSelector } from '../../selectors'

const { __, __r } = window

const LeyteStat = connect(
  state => ({
    $ships: get(state, 'const.$ships', {}),
    ships: shipMenuDataSelector(state),
    sameShipMap: sameShipMapSelector(state),
  })
)(({ $ships, ships, sameShipMap }) => (
  <div>
    {
      leyteFleets.map(fleet => (
        <div key={fleet.name}>
          <h4>{__(fleet.name)}</h4>
          <div className="ship-grid">
            {
              fp.flow(
                fp.sortBy(shipId => -get($ships, [shipId, 'api_stype'], 0)),
                fp.map(shipId => (
                  <div className="ship-grid-container">
                    <div className="ship-grid-cell ship-grid-header" key={shipId}>
                      {__r(get($ships, [shipId, 'api_name'], __('Unknown')))}
                    </div>
                    {
                      fp.flow(
                        fp.filter(ship => (sameShipMap[shipId] || []).includes(ship.shipId)),
                        fp.sortBy([ship => -ship.lv]),
                        fp.map(ship => (
                          <div key={ship.id} className="ship-grid-cell">
                            <span className="ship-name">{ship.area > 0 && <FA name="tag" />}{__r(ship.name)}</span>
                            <span className="ship-level"><sup>Lv.{ship.lv}</sup></span>
                          </div>
                        ))
                      )(ships)
                    }
                  </div>
                ))
              )(fleet.ships)
            }
          </div>
        </div>
      ))
    }
  </div>
))

export default LeyteStat
