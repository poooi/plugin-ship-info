import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { get, isEqual, map, intersection } from 'lodash'
import cls from 'classnames'
import { translate } from 'react-i18next'

import { shipSuperTypeMap } from '../constants'
import { intToBoolArray, boolArrayToInt, shipTypes } from '../utils'

@translate(['resources', 'poi-plugin-ship-info'], { nsMode: 'fallback' })
@connect((state, props) => {
  const $shipTypes = get(state, 'const.$shipTypes', {})
  const defaultChecked = Object.keys($shipTypes)
    .slice()
    .fill(true)

  let checked = intToBoolArray(get(state.config, 'plugin.ShipInfo.shipTypes'))
  checked = defaultChecked.length === checked.length ? checked : defaultChecked
  const checkedAll = checked.reduce((a, b) => a && b, true)

  return {
    show: props.show || false,
    $shipTypes,
    checked,
    checkedAll,
  }
})
class TypeView extends Component {
  static propTypes = {
    show: PropTypes.bool.isRequired,
    checked: PropTypes.arrayOf(PropTypes.bool).isRequired,
    checkedAll: PropTypes.bool.isRequired,
    $shipTypes: PropTypes.objectOf(PropTypes.object),
    t: PropTypes.func.isRequired,
  }

  shouldComponentUpdate = nextProps =>
    !isEqual(nextProps.checked, this.props.checked) ||
    this.props.show !== nextProps.show

  getTypeArray = (checked, $shipTypes) =>
    checked.reduce(
      (types, isChecked, index) =>
        isChecked && index + 1 in $shipTypes
          ? types.concat([index + 1])
          : types,
      [],
    )

  getArrayInclusion = (array, subArray) =>
    isEqual(intersection(array, subArray), subArray) && array.length > 0

  getArrayIntersection = (array, subArray) =>
    intersection(array, subArray).length > 0 &&
    subArray.length > intersection(array, subArray).length

  handleClickSuperType = (checkedTypes, index) => () => {
    const checked = this.props.checked.slice()
    const keys = shipSuperTypeMap[index].id
    if (this.getArrayInclusion(checkedTypes, keys)) {
      keys.forEach(key => {
        checked[key - 1] = false
      })
    } else {
      keys.forEach(key => {
        checked[key - 1] = true
      })
    }

    config.set('plugin.ShipInfo.shipTypes', boolArrayToInt(checked))
  }

  handleRightClickSuperType = index => () => {
    const checked = this.props.checked.slice()
    const keys = shipSuperTypeMap[index].id
    checked.fill(false)

    keys.forEach(key => {
      checked[key - 1] = true
    })

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

  handleRightClickSingleBox = index => () => {
    const checked = this.props.checked.slice()
    checked.fill(false)
    checked[index] = true

    config.set('plugin.ShipInfo.shipTypes', boolArrayToInt(checked))
  }

  render() {
    const { $shipTypes, checked, checkedAll, t } = this.props
    const checkedTypes = checked.reduce(
      (types, isChecked, index) =>
        isChecked && index + 1 in $shipTypes
          ? types.concat([index + 1])
          : types,
      [],
    )

    return (
      <div className=" type-menu">
        <div className="super-type">
          <div
            role="button"
            tabIndex="0"
            onClick={this.handleClickSingleBox(-1)}
            className={cls('supertype', {
              checked: checkedAll,
              partial: checked.filter(Boolean).length > 0 && !checkedAll,
            })}
          >
            {t('All')}
          </div>
          {shipSuperTypeMap.map((supertype, index) => (
            <div
              role="button"
              tabIndex="0"
              key={supertype.name}
              className={cls('supertype', {
                checked: this.getArrayInclusion(checkedTypes, supertype.id),
                partial: this.getArrayIntersection(checkedTypes, supertype.id),
              })}
              onClick={this.handleClickSuperType(checkedTypes, index)}
              onContextMenu={this.handleRightClickSuperType(index)}
            >
              {t(`Filter${supertype.name}`)}
            </div>
          ))}
        </div>
        <div className="single-type">
          {map($shipTypes, (type, key) => (
            <div
              role="button"
              tabIndex="0"
              key={key}
              onClick={this.handleClickSingleBox(key - 1)}
              onContextMenu={this.handleRightClickSingleBox(key - 1)}
              className={cls('shiptype', { checked: checked[key - 1] })}
            >
              {window.language === 'en-US'
                ? shipTypes[type.api_id]
                : t(type.api_name)}
            </div>
          ))}
        </div>
      </div>
    )
  }
}

export default TypeView
