import React, { Component } from 'react'
import propTypes from 'prop-types'
import { Dropdown, MenuItem, Label } from 'react-bootstrap'
import { connect } from 'react-redux'
import { get, map } from 'lodash'
import fp from 'lodash/fp'
import FontAwesome from 'react-fontawesome'

import { shipMenuDataSelector, deckPlannerAllShipIdsSelector } from '../../selectors'
import { shipSuperTypeMap } from '../../utils'

const { __ } = window

const Item = ({ eventKey, onSelect, children }) =>
  (
    <MenuItem eventKey={eventKey} onSelect={onSelect} className="ship-item">
      <span className="ship-item-content">
        {
          children
        }
      </span>
    </MenuItem>
  )

Item.propTypes = {
  eventKey: propTypes.number,
  onSelect: propTypes.func,
  children: propTypes.oneOfType([
    propTypes.array,
    propTypes.string,
  ]),
}

class ShipMenu extends Component {
  static propTypes = {
    children: propTypes.arrayOf(propTypes.element),
    areaIndex: propTypes.number,
  }

  constructor(props) {
    super(props)

    this.state = {
      typeIndex: -1,
    }
  }

  handleTypeSelect = index => () => {
    this.setState({
      typeIndex: index,
    })
  }

  handleShipSelect = (eventKey) => {
    console.log(eventKey)
  }

  handleGoBack = () => {
    this.setState({
      typeIndex: -1,
    })
  }

  render() {
    const { children, areaIndex } = this.props
    const { typeIndex } = this.state

    return (
      <ul className="dropdown-menu add-ship-menu pull-right">
        {
          typeIndex >= 0 &&
            <MenuItem onSelect={this.handleGoBack}>{__('return to ship types')}</MenuItem>
        }
        {
          typeIndex >= 0
          ?
            React.Children.toArray(children)
              .filter(child => get(shipSuperTypeMap, `${typeIndex}.id`, []).includes(child.props.typeId))
              .filter(child => [0, areaIndex + 1].includes(child.props.area || 0))
          :
            map(shipSuperTypeMap, (type, index) => (
              <Item key={type.name} eventKey={index} onSelect={this.handleTypeSelect(index)}>
                {__(type.name)}
              </Item>
            ))
        }
      </ul>
    )
  }
}

const AddShipDropdown = connect(
  (state, props) => ({
    shipItems: shipMenuDataSelector(state),
    areaIndex: props.area,
    allShipIds: deckPlannerAllShipIdsSelector(state),
    color: get(state, 'fcd.shiptag.color', []),
  })
)(({ shipItems, areaIndex, allShipIds, color, onSelect }) =>
  (<Dropdown id={`add-ship-dropdown-${areaIndex}`} pullRight>
    <Dropdown.Toggle bsStyle="link">
      <FontAwesome name="plus" />
    </Dropdown.Toggle>
    <ShipMenu bsRole="menu" areaIndex={areaIndex}>
      {
        fp.flow(
          fp.filter(ship => !allShipIds.includes(ship.id)),
          fp.sortBy(ship => -ship.lv),
          fp.map(ship => (
            <Item
              onSelect={onSelect}
              key={ship.id}
              eventKey={ship.id}
              typeId={ship.typeId}
              area={ship.area}
            >
              <span>{`${ship.name} Lv.${ship.lv}`}</span>
              {!!ship.area && <Label><FontAwesome name="tag" style={{ color: color[ship.area - 1] }} /></Label>}
            </Item>
          ))
        )(shipItems)
      }
    </ShipMenu>
  </Dropdown>)
)

export default AddShipDropdown
