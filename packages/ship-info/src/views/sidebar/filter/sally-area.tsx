import { H5 } from '@blueprintjs/core'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import styled from 'styled-components'

import { sallyAreaFilterViewSelector } from '../../selectors'
import {
  CustomCheckboxCard,
  CustomColoredCheckboxCard,
} from '../components/card-controls'

const SallyAreaContainer = styled.div`
  margin-bottom: 20px;
`

const CardRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`

export const SallyAreaCheck: React.FC = () => {
  const { t } = useTranslation(['poi-plugin-ship-info'])

  const { checked, checkedAll, mapname, color } = useSelector((state: any) =>
    sallyAreaFilterViewSelector(state, window.language),
  )

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
        <CustomCheckboxCard
          checked={checkedAll}
          onChange={handleClickBox(-1)}
          compact
        >
          {t('All')}
        </CustomCheckboxCard>
        <CustomCheckboxCard
          checked={checkedArray[0]}
          onChange={handleClickBox(0)}
          compact
        >
          {t('Free')}
        </CustomCheckboxCard>
        {mapname.map((name: string, idx: number) => (
          <CustomColoredCheckboxCard
            key={name}
            onChange={handleClickBox(idx + 1)}
            checked={checkedArray[idx + 1]}
            cardColor={colorArray[idx]}
            compact
          >
            {t(name)}
          </CustomColoredCheckboxCard>
        ))}
      </CardRow>
    </SallyAreaContainer>
  )
}
