import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import { Label, Dropdown, MenuItem } from 'react-bootstrap'
import FA from 'react-fontawesome'
import { get } from 'lodash'
import { connect } from 'react-redux'
import path from 'path'
import { translate } from 'react-i18next'

import { onDisplaceShip } from '../../redux'
import DisplaceToggle from './displace-toggle'
import {
  ShipItemSelectorFactory,
  shipFleetIdSelectorFactory,
} from '../../selectors'
import { shipTypes, fileUrl } from '../../utils'

@translate(['resources', 'poi-plugin-ship-info'], { nsMode: 'fallback' })
@connect((state, props) => ({
  ...ShipItemSelectorFactory(props.shipId)(state),
  color: get(state, 'fcd.shiptag.color', []),
  fleetId: shipFleetIdSelectorFactory(props.shipId)(state),
}))
class ShipChip extends PureComponent {
  static propTypes = {
    id: PropTypes.number,
    typeId: PropTypes.number,
    name: PropTypes.string,
    lv: PropTypes.number,
    area: PropTypes.number,
    color: PropTypes.arrayOf(PropTypes.string),
    others: PropTypes.arrayOf(PropTypes.object),
    onRemove: PropTypes.func,
    onDisplace: PropTypes.func,
    // eslint-disable-next-line react/no-unused-prop-types
    planArea: PropTypes.number,
    dispatch: PropTypes.func,
    fleetId: PropTypes.number,
    t: PropTypes.func.isRequired,
  }

  constructor(props) {
    super(props)

    this.state = {
      hover: false,
    }
  }

  componentWillReceiveProps = nextProps => {
    const { area, planArea, id } = nextProps
    if (area > 0 && area - 1 !== planArea) {
      this.props.dispatch(
        onDisplaceShip({
          shipId: id,
          fromAreaIndex: planArea,
          toAreaIndex: area - 1,
        }),
      )
    }
  }

  handleMouseEnter = () => {
    if (this.state.hover) {
      return
    }
    this.setState({
      hover: true,
    })
  }

  handleMouseLeave = () => {
    this.setState({
      hover: false,
    })
  }

  render() {
    const {
      id,
      typeId,
      name,
      lv,
      area,
      color,
      others,
      onRemove,
      onDisplace,
      fleetId,
      t,
    } = this.props
    const { hover } = this.state

    return (
      <Label
        className="ship-chip"
        onMouseEnter={this.handleMouseEnter}
        onMouseLeave={this.handleMouseLeave}
        onContextMenu={!(area > 0) ? onRemove : undefined}
      >
        <span className="ship-type">
          {shipTypes[typeId]}
          {' | '}
        </span>
        <span>
          {area > 0 ? (
            <a className="ship-name">
              {t(name)}
              <span className="ship-level">Lv.{lv}</span>
            </a>
          ) : (
            <Dropdown id={`displace-${id}`}>
              <DisplaceToggle bsRole="toggle">
                <a className="ship-name">
                  {t(name)}
                  <span className="ship-level">Lv.{lv}</span>
                </a>
              </DisplaceToggle>
              <Dropdown.Menu>
                {others.map(_area => (
                  <MenuItem
                    eventKey={_area.areaIndex}
                    key={_area.color}
                    onSelect={onDisplace}
                  >
                    {t('Move to ')}{' '}
                    <Label style={{ color: _area.color }}>
                      <FA name="tag" />
                      {_area.name}
                    </Label>
                  </MenuItem>
                ))}
              </Dropdown.Menu>
            </Dropdown>
          )}
        </span>
        <span>
          {area > 0 && (
            <FA
              name="tag"
              style={{ marginLeft: '1ex', color: color[area - 1] }}
            />
          )}
        </span>
        <span>
          {fleetId > -1 && (
            <img
              className="fleet-id-indicator"
              style={{ height: '10px' }}
              alt={`fleet: ${fleetId + 1}`}
              src={fileUrl(
                path.resolve(
                  __dirname,
                  `../../../assets/svg/fleet-indicator-${fleetId + 1}.svg`,
                ),
              )}
            />
          )}
        </span>
        <span>
          {!(area > 0) && hover && (
            <a role="button" tabIndex="0" onClick={onRemove} className="remove">
              <FA name="times-circle" />
            </a>
          )}
        </span>
      </Label>
    )
  }
}

export default ShipChip
