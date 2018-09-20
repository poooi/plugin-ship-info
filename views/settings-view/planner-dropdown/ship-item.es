import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { get } from 'lodash'
import FA from 'react-fontawesome'
import { translate } from 'react-i18next'
import { getShipImgPath } from 'views/utils/ship-img'

import styled from '../../../lib/styled-components'

import { hexToRGBA } from '../../utils'
import { deckPlannerShipMapSelector } from '../../selectors'

const ShipAvatar = styled.img.attrs({
  style: ({ left }) => ({
    left: `-${left}px`,
  }),
})`
  height: 40px;
  position: absolute;
  top: 0px;
  transition: 0.2s;
`

const Gradient = styled.div`
  height: 40px;
  width: 100%;
  position: absolute;
  top: 0px;
  left: 0px;
  background: ${props =>
    props.useAvatar
      ? `linear-gradient(90deg, rgba(0, 0, 0, 0), ${props.color})`
      : props.color};
  transition: 0.2s;
`

const ShipGridCell = styled.div`
  width: calc(100% / 7 - 4px);
  min-width: 6em;
  max-width: 16em;
  transition: 0.2s;
  margin: 2px;
  background-color: rgba(255, 255, 255, 0.1);
  text-align: right;
  background-size: auto 40px;
  background-repeat: no-repeat;
  height: 40px;
  position: relative;
  overflow: hidden;

  @media (min-width: 1440px) {
    width: calc(100% / 10 - 4px);
  }

  ${ShipAvatar} {
    z-index: -10;
  }

  ${Gradient} {
    z-index: -5;
  }

  &:hover ${ShipAvatar} {
    z-index: -1;
  }
}
`

const ShipName = styled.div`
  font-weight: 600;
  display: inline-block;
  padding: 0 1ex;
  color: white;
`

const ShipLevel = styled.div`
  display: inline-block;
  line-height: 1em;
  padding: 0 1ex;
  color: white;
`

@translate(['resources'])
@connect(state => ({
  planMap: deckPlannerShipMapSelector(state),
  color: get(state, 'fcd.shiptag.color', []),
  mapname: get(state, 'fcd.shiptag.mapname', []),
  ip: get(state, 'info.server.ip', '203.104.209.71'),
  useAvatar: get(state, ['config', 'poi', 'appearance', 'avatar'], false),
}))
class ShipItem extends PureComponent {
  static propTypes = {
    planMap: PropTypes.objectOf(PropTypes.number).isRequired,
    color: PropTypes.arrayOf(PropTypes.string).isRequired,
    onClick: PropTypes.func.isRequired,
    onContextmenu: PropTypes.func.isRequired,
    t: PropTypes.func.isRequired,
    ip: PropTypes.string.isRequired,
    useAvatar: PropTypes.bool.isRequired,
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
      useAvatar,
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
        {useAvatar && (
          <ShipAvatar
            src={getShipImgPath(
              ship.shipId,
              'remodel',
              false,
              ip,
              ship.version,
            )}
            left={Math.round(ship.avatarOffset * 40)}
          />
        )}
        <Gradient color={bgColor} useAvatar={useAvatar} />
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
