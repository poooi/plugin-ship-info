import React, { Component, PureComponent } from 'react'
import propTypes from 'prop-types'
import { Label, Dropdown, MenuItem } from 'react-bootstrap'
import FA from 'react-fontawesome'
import { get, groupBy, keyBy } from 'lodash'
import fp from 'lodash/fp'
import { connect } from 'react-redux'
import path from 'path'

import { onAddShip, onRemoveShip, onDisplaceShip } from '../../redux'
import AddShipDropdown from './add-ship-dropdown'
import { shipMenuDataSelector, ShipItemSelectorFactory, deckPlannerAreaSelectorFactory, shipFleetIdSelectorFactory } from '../../selectors'
import { shipTypes, hexToRGBA } from '../../utils'

const { __, __r } = window

class DisplaceToggle extends PureComponent {
  static propTypes = {
    onClick: propTypes.func,
    children: propTypes.element,
  }

  handleClick = (e) => {
    e.preventDefault()

    this.props.onClick(e)
  }

  render() {
    return (
      <span onClick={this.handleClick}>
        { this.props.children}
      </span>
    )
  }
}

const ShipChip = connect(
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

  handleMouseOver = () => {
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

  render() {
    const { id, typeId, name, lv, area, color, others, onRemove, onDisplace, fleetId } = this.props
    const { hover } = this.state

    return (
      <Label
        className="ship-chip"
        onMouseOver={this.handleMouseOver}
        onMouseLeave={this.handleMouseLeave}
        onContextMenu={!(area > 0) && onRemove}
      >
        <span className="ship-type">
          {shipTypes[typeId]}{' | '}
        </span>
        <span>
          {
            area > 0
            ? <a className="ship-name">{__r(name)}<span className="ship-level">Lv.{lv}</span></a>
            : <Dropdown id={`displace-${id}`}>
              <DisplaceToggle bsRole="toggle"><a className="ship-name">{name}<span className="ship-level">Lv.{lv}</span></a></DisplaceToggle>
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
                src={path.resolve(__dirname, `../../../assets/svg/fleet-indicator-${fleetId + 1}.svg`)}
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

const Area = connect(
  (state, props) => ({
    ships: shipMenuDataSelector(state),
    shipIds: deckPlannerAreaSelectorFactory(props.index)(state),
  })
)(class Area extends Component {
  static propTypes = {
    dispatch: propTypes.func,
    index: propTypes.number,
    area: propTypes.object,
    others: propTypes.arrayOf(propTypes.object),
    ships: propTypes.arrayOf(propTypes.object),
    shipIds: propTypes.arrayOf(propTypes.number),
  }

  handleAddShip = (eventKey) => {
    this.props.dispatch(onAddShip({
      shipId: eventKey,
      areaIndex: this.props.index,
    }))
  }

  handleRemoveShip = id => () => {
    this.props.dispatch(onRemoveShip({
      shipId: id,
      areaIndex: this.props.index,
    }))
  }

  handleDisplace = id => (eventKey) => {
    this.props.dispatch(onDisplaceShip({
      shipId: id,
      fromAreaIndex: this.props.index,
      toAreaIndex: eventKey,
    }))
  }

  render() {
    const { area, index, others, ships, shipIds } = this.props
    const keyShips = keyBy(ships, 'id')
    const groupShipIds = groupBy(shipIds, id => (keyShips[id] || {}).superTypeIndex)
    return (
      <div style={{ border: `solid 1px ${hexToRGBA(area.color, 0.5)}` }} className="area">
        <div className="header">
          <div className="area-name"><Label style={{ color: area.color }}><FA name="tag" />{area.name}</Label></div>
          <div><AddShipDropdown area={index} onSelect={this.handleAddShip} /></div>
        </div>
        <div style={{ backgroundColor: hexToRGBA(area.color, 0.5) }}>
          <div className="planned">
            <div className="pool">
              {
                Object.keys(groupShipIds).map(idx => (
                  <div className="lane" key={idx}>
                    {
                      fp.flow(
                        fp.sortBy([id => -get(keyShips[id], 'lv', 0), id => -id]),
                        fp.map(
                          id => (
                            <ShipChip
                              shipId={id}
                              onRemove={this.handleRemoveShip(id)}
                              onDisplace={this.handleDisplace(id)}
                              others={others}
                              key={id}
                              planArea={index}
                            />
                          )
                        ),
                      )(groupShipIds[idx])
                    }
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      </div>
    )
  }
})


export default Area
