import React, { PureComponent } from 'react'
import propTypes from 'prop-types'
import { Label, Dropdown, MenuItem } from 'react-bootstrap'
import FA from 'react-fontawesome'
import { get } from 'lodash'
import { connect } from 'react-redux'
import path from 'path'

import { onDisplaceShip } from '../../redux'
import DisplaceToggle from './displace-toggle'
import { ShipItemSelectorFactory, shipFleetIdSelectorFactory } from '../../selectors'
import { shipTypes, fileUrl } from '../../utils'

const { __ } = window.i18n['poi-plugin-ship-info']
const { __: __r } = window.i18n.resources

export default connect(
  (state, props) => ({
    ...ShipItemSelectorFactory(props.shipId)(state),
    color: get(state, 'fcd.shiptag.color', []),
    fleetId: shipFleetIdSelectorFactory(props.shipId)(state),
  })
)(class ShipChip extends PureComponent {
  static propTypes = {
    id: propTypes.number,
    typeId: propTypes.number,
    name: propTypes.string,
    lv: propTypes.number,
    area: propTypes.number,
    color: propTypes.arrayOf(propTypes.string),
    others: propTypes.arrayOf(propTypes.object),
    onRemove: propTypes.func,
    onDisplace: propTypes.func,
    // eslint-disable-next-line react/no-unused-prop-types
    planArea: propTypes.number,
    dispatch: propTypes.func,
    fleetId: propTypes.number,
  }

  constructor(props) {
    super(props)

    this.state = {
      hover: false,
    }
  }

  componentWillReceiveProps = (nextProps) => {
    const { area, planArea, id } = nextProps
    if (area > 0 && area - 1 !== planArea) {
      this.props.dispatch(onDisplaceShip({
        shipId: id,
        fromAreaIndex: planArea,
        toAreaIndex: area - 1,
      }))
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
      id, typeId, name, lv, area, color, others, onRemove, onDisplace, fleetId,
    } = this.props
    const { hover } = this.state

    return (
      <Label
        className="ship-chip"
        onMouseEnter={this.handleMouseEnter}
        onMouseLeave={this.handleMouseLeave}
        onContextMenu={!(area > 0) && onRemove}
      >
        <span className="ship-type">
          {shipTypes[typeId]}{' | '}
        </span>
        <span>
          {
            area > 0
            ?
              <a className="ship-name">
                {__r(name)}
                <span className="ship-level">
                  Lv.{lv}
                </span>
              </a>
            :
              <Dropdown id={`displace-${id}`}>
                <DisplaceToggle bsRole="toggle">
                  <a className="ship-name">
                    {__r(name)}
                    <span className="ship-level">
                      Lv.{lv}
                    </span>
                  </a>
                </DisplaceToggle>
                <Dropdown.Menu>
                  {
                    others.map(_area => (
                      <MenuItem eventKey={_area.areaIndex} key={_area.name} onSelect={onDisplace}>
                        {__('Move to ')} <Label style={{ color: _area.color }}><FA name="tag" />{_area.name}</Label>
                      </MenuItem>
                    ))
                  }
                </Dropdown.Menu>
              </Dropdown>
          }
        </span>
        <span>
          {
            area > 0 && <FA name="tag" style={{ marginLeft: '1ex', color: color[area - 1] }} />
          }
        </span>
        <span>
          {
            fleetId > -1 &&
              <img
                className="fleet-id-indicator"
                style={{ height: '10px' }}
                alt={`fleet: ${fleetId + 1}`}
                src={fileUrl(path.resolve(__dirname, `../../../assets/svg/fleet-indicator-${fleetId + 1}.svg`))}
              />
          }
        </span>
        <span>
          {
            !(area > 0) && hover && <a role="button" tabIndex="0" onClick={onRemove} className="remove"><FA name="times-circle" /></a>
          }
        </span>
      </Label>
    )
  }
})
