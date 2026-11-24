import { Checkbox } from '@blueprintjs/core'
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
  tankLandingCraftFilterSelector,
  amphibiousTankFilterSelector,
  daihatsuFilterSelector,
  modernizationFilterSelector,
  remodelFilterSelector,
} from '../../selectors'

const YesNoContainer = styled.div<{ $restricted: boolean }>`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;

  h5 {
    margin: 0;
    font: inherit;
    font-weight: ${({ $restricted }) => ($restricted ? 600 : 400)};
  }
`

const CardRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
`

const CheckOption = styled(Checkbox)`
  && {
    display: inline-flex;
    align-items: center;
    min-height: 24px;
    margin: 0;
    padding: 1px 4px;
    border-radius: 3px;
    cursor: pointer;
  }

  && .bp6-control-indicator {
    flex: 0 0 16px;
    margin: 0 4px 0 0;
  }
`

const filterSelectors: Record<string, (state: any) => boolean[]> = {
  locked: lockedFilterSelector,
  expedition: expeditionFilterSelector,
  inFleet: inFleetFilterSelector,
  sparkle: sparkleFilterSelector,
  exSlot: exSlotFilterSelector,
  tankLandingCraft: tankLandingCraftFilterSelector,
  amphibiousTank: amphibiousTankFilterSelector,
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
  const restricted = !(checked[0] && checked[1])

  const handleToggle = (index: number) => () => {
    const newChecked = [...checked]
    newChecked[index] = !newChecked[index]
    window.config.set(`plugin.ShipInfo.${configKey}`, newChecked)
  }

  return (
    <YesNoContainer $restricted={restricted}>
      <h5>{t(label)}</h5>
      <CardRow>
        {['Yes', 'No'].map((option, index) => (
          <CheckOption
            key={option}
            checked={checked[index]}
            label={t(option)}
            onChange={handleToggle(index)}
          />
        ))}
      </CardRow>
    </YesNoContainer>
  )
}
