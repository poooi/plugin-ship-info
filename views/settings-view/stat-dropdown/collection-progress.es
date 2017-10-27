import React from 'react'
import { connect } from 'react-redux'
import FA from 'react-fontawesome'

import { get, times } from 'lodash'
import fp from 'lodash/fp'

import { shipSuperTypeMap } from '../../utils'
import { uniqueShipSelector, uniqueShipCountSelector, graphSelector } from '../../selectors'

const { __, __r } = window

const RANDOM_COLORS = times(200, () => `hsla(${Math.floor(Math.random() * 360)}, 60%, 70%, 0.6)`)

const NameCube = ({ name, count, ctype }) => {
  if (name.length === 1) {
    return (
      <div className="name-cube" style={{ background: count > 0 && RANDOM_COLORS[ctype] }}>
        <div style={{ width: '50px', textAlign: 'center', lineHeight: '50px', fontSize: '20px' }}>{name}</div>
      </div>
    )
  }

  let name1
  let name2
  let name3
  let name4

  if (name.length === 2) {
    name1 = name[0]
    name4 = name[1]
  }

  if (name.length === 3) {
    name1 = name[0]
    name3 = name[1]
    name4 = name[2]
  }

  if (name.length >= 4) {
    name1 = name[0]
    name2 = name[1]
    name3 = name[2]
    name4 = name[3]
  }

  return (
    <div className="name-cube" style={{ background: count > 0 && RANDOM_COLORS[ctype] }}>
      {
        [name1, name2, name3, name4].map(_name => (
          <div className="letter-cube" key={_name}>
            {_name}
          </div>
        ))
      }
    </div>
  )
}

const CollectionProgress = connect(
  state => ({
    $ships: get(state, 'const.$ships', {}),
    $graph: graphSelector(state),
    ships: uniqueShipSelector(state),
    count: uniqueShipCountSelector(state),
  })
)(({ $ships, $graph, ships, count }) => {
  const typeShips = fp.flow(
    fp.map(({ id }) =>
      fp.filter(
        shipId => id.includes(get($ships, [shipId, 'api_stype'])))(ships)),
  )(shipSuperTypeMap)
  const typeShipsCollected = fp.map(
    shipIds => fp.filter(shipId => count[shipId] > 0)(shipIds)
  )(typeShips)
  return (
    <div>
      {
        shipSuperTypeMap.map(({ id, name }, i) => (
          <div key={name}>
            <h4>{__(name)} {typeShipsCollected[i].length}/{typeShips[i].length}</h4>
            <div className="ship-grid">
              {
                fp.flow(
                  fp.filter(shipId => id.includes(get($ships, [shipId, 'api_stype']))),
                  fp.sortBy([
                    shipId => -get($ships, [shipId, 'api_ctype']),
                    shipId => get($graph, [shipId, 'api_sortno']),
                  ]),
                  fp.map(shipId => (
                    <NameCube name={get($ships, [shipId, 'api_name'])} count={count[shipId]} ctype={get($ships, [shipId, 'api_ctype'])} />
                  ))
                )(ships)
              }
            </div>
          </div>
        ))
      }
    </div>
  )
})

export default CollectionProgress
