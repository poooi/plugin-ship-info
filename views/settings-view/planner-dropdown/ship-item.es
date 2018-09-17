import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { get } from 'lodash'
import FA from 'react-fontawesome'
import { translate } from 'react-i18next'

import { hexToRGBA } from '../../utils'
import { deckPlannerShipMapSelector } from '../../selectors'

@translate(['resources'])
@connect(state => ({
  planMap: deckPlannerShipMapSelector(state),
  color: get(state, 'fcd.shiptag.color', []),
  mapname: get(state, 'fcd.shiptag.mapname', []),
}))
class ShipItem extends PureComponent {
  static propTypes = {
    planMap: PropTypes.objectOf(PropTypes.number).isRequired,
    color: PropTypes.arrayOf(PropTypes.string).isRequired,
    onClick: PropTypes.func.isRequired,
    onContextmenu: PropTypes.func.isRequired,
    t: PropTypes.func.isRequired,
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
    } = this.props
    const { hover } = this.state
    const alpha = hover ? 0.85 : 0.75
    const bgColor =
      ship.area > 0
        ? hexToRGBA(color[ship.area - 1], alpha)
        : String(ship.id) in planMap &&
          hexToRGBA(color[planMap[ship.id]], alpha)
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
        <span className="ship-name">
          {ship.area > 0 && <FA name="tag" />}
          {t(ship.name)}
        </span>
        <span className="ship-level">
          <sup>Lv.{ship.lv}</sup>
        </span>
      </div>
    )
  }
}

export default ShipItem
