import { CheckboxCard, H5 } from '@blueprintjs/core'
import { get } from 'lodash'
import { rgba } from 'polished'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import styled from 'styled-components'

import { sallyAreaFilterSelector } from '../../selectors'

const SallyAreaContainer = styled.div`
  margin-bottom: 20px;
`

const CardRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

const ColoredCheckboxCard = styled(CheckboxCard)<{
  $cardColor?: string
  $isChecked?: boolean
}>`
  ${(props) =>
    props.$isChecked &&
    props.$cardColor &&
    `
    background-color: ${rgba(props.$cardColor, 0.75)} !important;
  `}
  ${(props) =>
    !props.$isChecked &&
    props.$cardColor &&
    `
    border-color: ${props.$cardColor} !important;
    color: ${props.$cardColor} !important;
  `}
`

export const SallyAreaCheck: React.FC = () => {
  const { t } = useTranslation(['poi-plugin-ship-info'])

  const sallyAreaChecked = useSelector(sallyAreaFilterSelector)
  const { checked, checkedAll, mapname, color } = useSelector((state: any) => {
    const isFleetName = get(
      state.config,
      'plugin.ShipInfo.displayFleetName',
      false,
    )
    const names = isFleetName
      ? get(state, ['fcd', 'shiptag', 'fleetname', window.language], [])
      : get(state, ['fcd', 'shiptag', 'mapname'], [])
    const defaultChecked: boolean[] = Array(names.length + 1).fill(true)

    // reset config values if updated
    const areaChecked =
      names.length + 1 === sallyAreaChecked.length
        ? sallyAreaChecked
        : defaultChecked
    const allChecked = areaChecked.reduce(
      (a: boolean, b: boolean) => a && b,
      true,
    )

    return {
      checked: areaChecked,
      checkedAll: allChecked,
      color: get(state, 'fcd.shiptag.color', []),
      mapname: names,
    }
  })

  const handleClickBox = (index: number) => () => {
    const newChecked = (checked as boolean[]).slice()

    if (index === -1) {
      const newCheckedAll = !checkedAll
      newChecked.fill(newCheckedAll)
    } else {
      newChecked[index] = !newChecked[index]
    }

    window.config.set('plugin.ShipInfo.sallyAreaChecked', newChecked)
  }

  const checkedArray = checked as boolean[]
  const colorArray = color as string[]

  return (
    <SallyAreaContainer>
      <H5>{t('Sally Area')}</H5>
      <CardRow>
        <CheckboxCard
          checked={checkedAll}
          onChange={handleClickBox(-1)}
          compact
        >
          {t('All')}
        </CheckboxCard>
        <CheckboxCard
          checked={checkedArray[0]}
          onChange={handleClickBox(0)}
          compact
        >
          {t('Free')}
        </CheckboxCard>
        {mapname.map((name: string, idx: number) => (
          <ColoredCheckboxCard
            key={name}
            onChange={handleClickBox(idx + 1)}
            checked={checkedArray[idx + 1]}
            $cardColor={colorArray[idx]}
            $isChecked={checkedArray[idx + 1]}
            compact
          >
            {t(name)}
          </ColoredCheckboxCard>
        ))}
      </CardRow>
    </SallyAreaContainer>
  )
}
