import React from 'react'
import { connect } from 'react-redux'
import { get } from 'lodash'
import fp from 'lodash/fp'
import { translate } from 'react-i18next'
import { compose } from 'redux'
import styled from 'styled-components'
import { OverlayTrigger, Tooltip } from 'react-bootstrap'

import { getShipImgPath } from 'views/utils/ship-img'

import { shipSuperTypeMap } from '../../utils'
import {
  uniqueShipIdsSelector,
  uniqueShipCountSelector,
  graphSelector,
} from '../../selectors'

const Wrapper = styled.div`
  margin-left: 100px;
`

const ShipCube = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  height: 50px;
  width: 50px;
  margin: 2px;
  position: relative;
  overflow: hidden;
`

const ShipAvatar = styled.div.attrs({
  style: ({ image }) => ({
    backgroundImage: `url(${image})`,
  }),
})`
  height: 50px;
  width: 50px;
  position: absolute;
  top: 0px;
  transition: 0.2s;
  background-position-x: -90px;
  background-size: auto 50px;
  z-index: -10;
`

const Overlay = styled.div`
  height: 70px;
  width: 70px;
  position: absolute;
  top: -10px;
  left: -10px;
  background: ${props => props.background};
  transition: 0.2s;
  z-index: -5;

  &:hover {
    background: none;
  }
`

const CollectionProgress = compose(
  translate(['resources', 'poi-plugin-ship-info'], { nsMode: 'fallback' }),
  connect(state => ({
    $ships: get(state, 'const.$ships', {}),
    $graph: graphSelector(state),
    ships: uniqueShipIdsSelector(state),
    count: uniqueShipCountSelector(state),
    ip: get(state, 'info.server.ip', '203.104.209.71'),
  })),
)(({ $ships, $graph, ships, count, ip, t }) => {
  const typeShips = fp.flow(
    fp.map(({ id }) =>
      fp.filter(shipId => id.includes(get($ships, [shipId, 'api_stype'])))(
        ships,
      ),
    ),
  )(shipSuperTypeMap)
  const typeShipsCollected = fp.map(shipIds =>
    fp.filter(shipId => count[shipId] > 0)(shipIds),
  )(typeShips)
  return (
    <Wrapper>
      {shipSuperTypeMap.map(({ id, name }, i) => (
        <div key={name}>
          <h2>
            {t(name)} {typeShipsCollected[i].length}/{typeShips[i].length}
          </h2>
          <div className="ship-grid">
            {fp.flow(
              fp.filter(shipId =>
                id.includes(get($ships, [shipId, 'api_stype'])),
              ),
              fp.sortBy([
                shipId => -get($ships, [shipId, 'api_ctype']),
                shipId => get($graph, [shipId, 'api_sortno']),
              ]),
              fp.map(shipId => (
                <OverlayTrigger
                  placement="top"
                  overlay={
                    <Tooltip id={`ship-collection-${shipId}`}>
                      {t(get($ships, [shipId, 'api_name']))}
                    </Tooltip>
                  }
                >
                  <ShipCube key={shipId}>
                    <ShipAvatar
                      image={getShipImgPath(
                        shipId,
                        'banner',
                        false,
                        ip,
                        get($graph, [shipId, 'version', 0]),
                      )}
                    />
                    <Overlay
                      background={
                        count[shipId] > 0 ? 'none' : 'rgba(0, 0, 0, 0.75)'
                      }
                    />
                  </ShipCube>
                </OverlayTrigger>
              )),
            )(ships)}
          </div>
        </div>
      ))}
    </Wrapper>
  )
})

export default CollectionProgress
