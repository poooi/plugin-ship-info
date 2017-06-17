import React, { Component } from 'react'
import propTypes from 'prop-types'
import { Row, Col, Input, Button } from 'react-bootstrap'
import { connect } from 'react-redux'
import { get, isEqual, map, intersection } from 'lodash'

import { shipSuperTypeMap } from '../constants'
import { intToBoolArray, boolArrayToInt } from '../utils'

const { __, __r } = window

// new super ship type check is based on preset ship type collections as in shipSuperTypeMap
// to ensure a downgrade compatibility, another config key is used
const TypeCheck = connect(
  (state, props) => {
    const $shipTypes = get(state, 'const.$shipTypes')
    const defaultChecked = Object.keys($shipTypes).slice().fill(true)

    let checked = intToBoolArray(get(state.config, 'plugin.ShipInfo.shipTypes'))
    checked = defaultChecked.length === checked.length ? checked : defaultChecked
    const checkedAll = checked.reduce((a, b) => a && b, true)

    return ({
      show: props.show || false,
      $shipTypes,
      checked,
      checkedAll,
    })
  }
)(class TypeCheck extends Component {

  static propTypes = {
    show: propTypes.bool.isRequired,
    checked: propTypes.arrayOf(propTypes.bool).isRequired,
    checkedAll: propTypes.bool.isRequired,
    $shipTypes: propTypes.objectOf(propTypes.object),
  }

  shouldComponentUpdate = nextProps =>
    !isEqual(nextProps.checked, this.props.checked) || this.props.show !== nextProps.show

  getTypeArray = (checked, $shipTypes) =>
    checked.reduce((types, isChecked, index) =>
      isChecked && ((index + 1) in $shipTypes) ? types.concat([index + 1]) : types, [])

  getArrayInclusion = (array, subArray) =>
    isEqual(intersection(array, subArray), subArray) && array.length > 0

  handleClickSuperType = (checkedTypes, index) => () => {
    const checked = this.props.checked.slice()
    const keys = shipSuperTypeMap[index].id
    if (this.getArrayInclusion(checkedTypes, keys)) {
      keys.forEach((key) => {
        checked[key - 1] = false
      })
    } else {
      keys.forEach((key) => {
        checked[key - 1] = true
      })
    }

    config.set('plugin.ShipInfo.shipTypes', boolArrayToInt(checked))
  }

  handleClickSingleBox = index => () => {
    const checked = this.props.checked.slice()
    let { checkedAll } = this.props

    if (index === -1) {
      checkedAll = !checkedAll
      checked.fill(checkedAll)
    } else {
      checked[index] = !checked[index]
    }

    config.set('plugin.ShipInfo.shipTypes', boolArrayToInt(checked))
  }

  render() {
    const { show, $shipTypes, checked, checkedAll } = this.props
    const xs = window.language === 'en-US' ? 3 : 2
    const checkedTypes = checked.reduce((types, isChecked, index) =>
      isChecked && ((index + 1) in $shipTypes)
      ? types.concat([index + 1])
      : types, []
    )

    return (
      <div className="filter-type">
        <Row>
          <Col xs={12} className="super-type">
            {
              show ?
                <Input
                  type="checkbox"
                  label={__('All')}
                  onChange={this.handleClickSingleBox(-1)}
                  checked={checkedAll}
                />
              :
                <Button
                  className="filter-button-all"
                  onClick={this.handleClickSingleBox(-1)}
                  bsStyle={checkedAll ? 'success' : 'warning'}
                >
                  {__('All')}
                </Button>
            }
          </Col>
        </Row>
        {
          show &&
          <Row>
            <Col xs={12}>
              {
              map($shipTypes, (type, key) =>
                (<Col xs={xs} key={key}>
                  <Input
                    type="checkbox"
                    label={__r(type.api_name)}
                    onChange={this.handleClickSingleBox(key - 1)}
                    checked={checked[key - 1]}
                  />
                </Col>)
              )
            }
            </Col>
          </Row>
        }
        <Row>
          <Col xs={12} className="super-type">
            {
              shipSuperTypeMap.map((supertype, index) =>
                (<Button
                  key={supertype.name}
                  className="filter-button"
                  onClick={this.handleClickSuperType(checkedTypes, index)}
                  bsStyle={
                    this.getArrayInclusion(checkedTypes, supertype.id)
                    ? 'success' : 'warning'
                  }
                >
                  {__(`Filter${supertype.name}`)}
                </Button>)
              )
            }
          </Col>
        </Row>
      </div>
    )
  }
})

export default TypeCheck
