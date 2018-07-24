import React from 'react'
import { connect } from 'react-redux'
import FA from 'react-fontawesome'

import { get } from 'lodash'
import fp from 'lodash/fp'

import { euroShips } from '../../utils'
import { shipMenuDataSelector, adjustedRemodelChainsSelector, graphSelector } from '../../selectors'

const { __, __r } = window

const MAX_LEVEL = 165

const EuroStat = connect(
  state => ({
    $ships: get(state, 'const.$ships', {}),
    $graph: graphSelector(state),
    ships: shipMenuDataSelector(state),
    sameShipMap: adjustedRemodelChainsSelector(state),
  })
)(({
  $ships, $graph, ships, sameShipMap,
}) => (
  <div>
    {
      euroShips.map(fleet => (
        <div key={fleet.name}>
          <h4>{__(fleet.name)}</h4>
          <div className="ship-grid euro-stat">
            {
              fp.flow(
                fp.sortBy([
                  shipId => -get($ships, [shipId, 'api_stype'], 0),
                  shipId => -get($ships, [shipId, 'api_ctype'], 0),
                  shipId => get($graph, [shipId, 'api_sortno']),
                ]),
                fp.map(shipId => (
                  <div className="ship-grid-container" key={shipId}>
                    <div className="ship-grid-cell ship-grid-header" key={shipId}>
                      {__r(get($ships, [shipId, 'api_name'], __('Unknown')))}
                    </div>
                    {
                      fp.flow(
                        fp.filter(ship => (sameShipMap[shipId] || []).includes(ship.shipId)),
                        fp.sortBy([ship => -ship.lv]),
                        fp.map(ship => (
                          <div
                            style={{
                              background: `hsla(210, ${Math.min(Math.round((ship.lv * 100) / MAX_LEVEL), 100)}%, 40%, 0.75)`,
                            }}
                            key={ship.id}
                            className="ship-grid-cell"
                          >
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

export default EuroStat
