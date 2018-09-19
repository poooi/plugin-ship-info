import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { get } from 'lodash'
import FA from 'react-fontawesome'
import { translate } from 'react-i18next'
import styled from 'styled-components'

import { getShipImgPath } from 'views/utils/ship-img'

import { hexToRGBA } from '../../utils'
import { deckPlannerShipMapSelector } from '../../selectors'

const ShipGridCell = styled.div.attrs({
  style: ({ shipImage, color, hover }) => ({
    backgroundImage: hover
      ? `
    url(${shipImage}),
    linear-gradient(90deg, ${color}, ${color})
    `
      : `
    linear-gradient(90deg, rgba(0, 0, 0, 0), ${color}),
    url(${shipImage})
    `,
  }),
})`
  width: calc(100% / 7 - 4px);
  min-width: 6em;
  max-width: 16em;
  transition: 0.2s;
  margin: 2px;
  background-color: rgba(255, 255, 255, 0.1);
  text-align: right;
  padding: 4px 0.5ex;
  background-size: auto 40px;
  background-repeat: no-repeat;
  height: 40px;

  @media (min-width: 1440px) {
    width: calc(100% / 10 - 4px);
  }
}
`

const ShipName = styled.div`
  font-weight: 600;
  display: inline-block;
  padding: 0 1ex;
`

const ShipLevel = styled.div`
  display: inline-block;
  line-height: 1em;
  padding: 0 1ex;
`

@translate(['resources'])
@connect(state => ({
  planMap: deckPlannerShipMapSelector(state),
  color: get(state, 'fcd.shiptag.color', []),
  mapname: get(state, 'fcd.shiptag.mapname', []),
  ip: get(state, 'info.server.ip', '203.104.209.71'),
}))
class ShipItem extends PureComponent {
  static propTypes = {
    planMap: PropTypes.objectOf(PropTypes.number).isRequired,
    color: PropTypes.arrayOf(PropTypes.string).isRequired,
    onClick: PropTypes.func.isRequired,
    onContextmenu: PropTypes.func.isRequired,
    t: PropTypes.func.isRequired,
    ip: PropTypes.string.isRequired,
  }

  state = {
    hover: false,
  }

  handleMouseEnter = () => this.setState({ hover: true })

  handleMouseLeave = () => this.setState({ hover: false })

  render() {
    const {
      // eslint-disable-next-line react/prop-types
      ship,
      planMap,
      color,
      onClick,
      onContextmenu,
      t,
      ip,
    } = this.props

    const { hover } = this.state
    const alpha = hover ? 0.85 : 0.75

    const bgColor =
      hexToRGBA(color[ship.area - 1], alpha) ||
      hexToRGBA(color[planMap[ship.id]], alpha) ||
      `rgba(0, 0, 0, ${alpha})`

    return (
      <ShipGridCell
        role="button"
        tabIndex="0"
        // className="ship-grid-cell"
        shipImage={getShipImgPath(
          ship.shipId,
          'remodel',
          false,
          ip,
          ship.version,
        )}
        color={bgColor}
        hover={hover}
        // style={{
        //   background,
        //   backgroundSize: 'auto 40px',
        //   cursor: ship.area > 0 ? 'not-allowed' : 'copy',
        // }}
        onClick={!(ship.area > 0) ? onClick : undefined}
        onContextMenu={!(ship.area > 0) ? onContextmenu : undefined}
        onMouseEnter={this.handleMouseEnter}
        onMouseLeave={this.handleMouseLeave}
      >
        <ShipLevel>Lv.{ship.lv}</ShipLevel>
        <br />
        <ShipName>
          {t(ship.name)}
          {ship.area > 0 && (
            <>
              {' '}
              <FA name="tag" />
            </>
          )}
        </ShipName>
      </ShipGridCell>
    )
  }
}

export default ShipItem
