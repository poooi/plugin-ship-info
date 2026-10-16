import { H5 } from '@blueprintjs/core'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import styled from 'styled-components'

import {
  lockedFilterSelector,
  expeditionFilterSelector,
  inFleetFilterSelector,
  sparkleFilterSelector,
  exSlotFilterSelector,
  daihatsuFilterSelector,
  modernizationFilterSelector,
  remodelFilterSelector,
} from '../../selectors'
import { CustomCheckboxCard } from '../components/card-controls'

const YesNoContainer = styled.div`
  margin-bottom: 20px;
`

const CardRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`

const filterSelectors: Record<string, (state: any) => boolean[]> = {
  locked: lockedFilterSelector,
  expedition: expeditionFilterSelector,
  inFleet: inFleetFilterSelector,
  sparkle: sparkleFilterSelector,
  exSlot: exSlotFilterSelector,
  daihatsu: daihatsuFilterSelector,
  modernization: modernizationFilterSelector,
  remodel: remodelFilterSelector,
}

interface IProps {
  configKey: string
  label: string
}

export const YesNoCheck: React.FC<IProps> = ({ label, configKey }) => {
  const { t } = useTranslation(['poi-plugin-ship-info'])
  const checked = useSelector(filterSelectors[configKey])

  const handleToggle = (index: number) => () => {
    const newChecked = [...checked]
    newChecked[index] = !newChecked[index]
    window.config.set(`plugin.ShipInfo.${configKey}`, newChecked)
  }

  return (
    <YesNoContainer>
      <H5>{t(label)}</H5>
      <CardRow>
        <CustomCheckboxCard
          checked={checked[0]}
          onChange={handleToggle(0)}
          compact
        >
          {t('Yes')}
        </CustomCheckboxCard>
        <CustomCheckboxCard
          checked={checked[1]}
          onChange={handleToggle(1)}
          compact
        >
          {t('No')}
        </CustomCheckboxCard>
      </CardRow>
    </YesNoContainer>
  )
}
