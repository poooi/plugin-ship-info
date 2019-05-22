import cls from 'classnames'
import { TranslationFunction } from 'i18next'
import { get, intersection, isEqual, map, size } from 'lodash'
import PropTypes from 'prop-types'
import React, { Component, ComponentType } from 'react'
import { withTranslation } from 'react-i18next'
import { connect } from 'react-redux'
import { compose } from 'redux'
import styled from 'styled-components'

import { shipSuperTypeMap } from '../../constants'
import { boolArrayToInt, intToBoolArray, shipTypes } from '../../utils'
import { Checkbox, CheckboxOption } from '../components/checkbox'

interface IProps {
  $shipTypes: any
  checked: boolean[]
  checkedAll: boolean
  t: TranslationFunction
}

const SuperTypeOption = styled(CheckboxOption)`
  width: calc(100% / 9);
`

const TypeOption = styled(CheckboxOption)`
  width: 12.5%;
`

export const ShipTypeCheck = compose<ComponentType<{}>>(
  withTranslation(['resources', 'poi-plugin-ship-info']),
  connect((state: { config: any }, props) => {
    const $shipTypes = get(state, 'const.$shipTypes', {})
    const defaultChecked: boolean[] = new Array(size($shipTypes)).fill(true)

    let checked = intToBoolArray(get(state.config, 'plugin.ShipInfo.shipTypes'))
    checked =
      defaultChecked.length === checked.length ? checked : defaultChecked
    const checkedAll = checked.reduce((a, b) => a && b, true)

    return {
      $shipTypes,
      checked,
      checkedAll,
    }
  }),
)(
  class TypeView extends Component<IProps> {
    public getTypeArray = (checked: boolean[], $shipTypes: any) =>
      checked.reduce(
        (types: number[], isChecked, index) =>
          isChecked && index + 1 in $shipTypes
            ? types.concat([index + 1])
            : types,
        [],
      )

    public getArrayInclusion = (array: number[], subArray: number[]) =>
      isEqual(intersection(array, subArray), subArray) && array.length > 0

    public getArrayIntersection = (array: number[], subArray: number[]) =>
      intersection(array, subArray).length > 0 &&
      subArray.length > intersection(array, subArray).length

    public handleClickSuperType = (
      checkedTypes: number[],
      index: number,
    ) => () => {
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

      window.config.set('plugin.ShipInfo.shipTypes', boolArrayToInt(checked))
    }

    public handleRightClickSuperType = (index: number) => () => {
      const checked = this.props.checked.slice()
      const keys = shipSuperTypeMap[index].id
      checked.fill(false)

      keys.forEach(key => {
        checked[key - 1] = true
      })

      window.config.set('plugin.ShipInfo.shipTypes', boolArrayToInt(checked))
    }

    public handleClickSingleBox = (index: number) => () => {
      const checked = this.props.checked.slice()
      let { checkedAll } = this.props

      if (index === -1) {
        checkedAll = !checkedAll
        checked.fill(checkedAll)
      } else {
        checked[index] = !checked[index]
      }

      window.config.set('plugin.ShipInfo.shipTypes', boolArrayToInt(checked))
    }

    public handleRightClickSingleBox = (index: number) => () => {
      const checked = this.props.checked.slice()
      checked.fill(false)
      checked[index] = true

      window.config.set('plugin.ShipInfo.shipTypes', boolArrayToInt(checked))
    }

    public render() {
      const { $shipTypes, checked, checkedAll, t } = this.props
      const checkedTypes = checked.reduce(
        (types: number[], isChecked, index) =>
          isChecked && index + 1 in $shipTypes
            ? types.concat([index + 1])
            : types,
        [],
      )

      return (
        <div>
          <Checkbox>
            <SuperTypeOption
              onClick={this.handleClickSingleBox(-1)}
              checked={checkedAll}
            >
              {t('All')}
            </SuperTypeOption>
            {shipSuperTypeMap.map((supertype, index) => (
              <SuperTypeOption
                key={supertype.name}
                checked={this.getArrayInclusion(checkedTypes, supertype.id)}
                partial={this.getArrayIntersection(checkedTypes, supertype.id)}
                onClick={this.handleClickSuperType(checkedTypes, index)}
                onContextMenu={this.handleRightClickSuperType(index)}
              >
                {t(`Filter${supertype.name}`)}
              </SuperTypeOption>
            ))}
          </Checkbox>
          <Checkbox>
            {map($shipTypes, (type, key: number) => (
              <TypeOption
                key={key}
                onClick={this.handleClickSingleBox(key - 1)}
                onContextMenu={this.handleRightClickSingleBox(key - 1)}
                checked={checked[key - 1]}
              >
                {window.language === 'en-US'
                  ? shipTypes[type.api_id as keyof typeof shipTypes]
                  : t(type.api_name)}
              </TypeOption>
            ))}
          </Checkbox>
        </div>
      )
    }
  },
)
