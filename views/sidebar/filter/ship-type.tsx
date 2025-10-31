import { CheckboxCard, H5 } from '@blueprintjs/core'
import { get, intersection, isEqual, map, size } from 'lodash'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import styled from 'styled-components'

import { shipSuperTypeMap } from '../../constants'
import { shipTypesFilterSelector } from '../../selectors'
import { boolArrayToInt, intToBoolArray, shipTypes } from '../../utils'

const ShipTypeContainer = styled.div`
  margin-bottom: 20px;
`

const CardRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
`

export const ShipTypeCheck: React.FC = () => {
  const { t } = useTranslation(['resources', 'poi-plugin-ship-info'])

  const shipTypesValue = useSelector(shipTypesFilterSelector)
  const { $shipTypes, checked, checkedAll } = useSelector((state: any) => {
    const allShipTypes = get(state, 'const.$shipTypes', {})
    const defaultChecked: boolean[] = new Array(size(allShipTypes)).fill(true)

    let shipChecked = intToBoolArray(shipTypesValue)
    shipChecked =
      defaultChecked.length === shipChecked.length
        ? shipChecked
        : defaultChecked
    const allChecked = shipChecked.reduce((a, b) => a && b, true)

    return {
      $shipTypes: allShipTypes,
      checked: shipChecked,
      checkedAll: allChecked,
    }
  })

  const getTypeArray = (
    typeChecked: boolean[],
    types: Record<string, unknown>,
  ) =>
    typeChecked.reduce(
      (result: number[], isChecked, index) =>
        isChecked && index + 1 in types ? result.concat([index + 1]) : result,
      [],
    )

  const getArrayInclusion = (array: number[], subArray: number[]) =>
    isEqual(intersection(array, subArray), subArray) && array.length > 0

  const handleClickSuperType =
    (checkedTypes: number[], index: number) => () => {
      const newChecked = checked.slice()
      const keys = shipSuperTypeMap[index].id
      if (getArrayInclusion(checkedTypes, keys)) {
        keys.forEach((key) => {
          newChecked[key - 1] = false
        })
      } else {
        keys.forEach((key) => {
          newChecked[key - 1] = true
        })
      }

      window.config.set('plugin.ShipInfo.shipTypes', boolArrayToInt(newChecked))
    }

  const handleRightClickSuperType =
    (index: number) => (event: React.MouseEvent) => {
      event.preventDefault()
      const newChecked = checked.slice()
      const keys = shipSuperTypeMap[index].id
      newChecked.fill(false)

      keys.forEach((key) => {
        newChecked[key - 1] = true
      })

      window.config.set('plugin.ShipInfo.shipTypes', boolArrayToInt(newChecked))
    }

  const handleClickSingleBox = (index: number) => () => {
    const newChecked = checked.slice()

    if (index === -1) {
      const newCheckedAll = !checkedAll
      newChecked.fill(newCheckedAll)
    } else {
      newChecked[index] = !newChecked[index]
    }

    window.config.set('plugin.ShipInfo.shipTypes', boolArrayToInt(newChecked))
  }

  const handleRightClickSingleBox =
    (index: number) => (event: React.MouseEvent) => {
      event.preventDefault()
      const newChecked = checked.slice()
      newChecked.fill(false)
      newChecked[index] = true

      window.config.set('plugin.ShipInfo.shipTypes', boolArrayToInt(newChecked))
    }

  const checkedTypes = getTypeArray(checked, $shipTypes)

  return (
    <ShipTypeContainer>
      <H5>{t('Ship types')}</H5>
      <CardRow>
        <CheckboxCard
          onChange={handleClickSingleBox(-1)}
          checked={checkedAll}
          compact
        >
          {t('All')}
        </CheckboxCard>
        {shipSuperTypeMap.map((supertype, index) => (
          <CheckboxCard
            key={supertype.name}
            checked={getArrayInclusion(checkedTypes, supertype.id)}
            onChange={handleClickSuperType(checkedTypes, index)}
            onContextMenu={handleRightClickSuperType(index)}
            compact
          >
            {t(supertype.name)}
          </CheckboxCard>
        ))}
      </CardRow>
      <CardRow>
        {map($shipTypes, (type, key: number) => (
          <CheckboxCard
            key={key}
            onChange={handleClickSingleBox(key - 1)}
            onContextMenu={handleRightClickSingleBox(key - 1)}
            checked={checked[key - 1]}
            compact
          >
            {window.language === 'en-US'
              ? shipTypes[type.api_id as keyof typeof shipTypes]
              : t(type.api_name)}
          </CheckboxCard>
        ))}
      </CardRow>
    </ShipTypeContainer>
  )
}
