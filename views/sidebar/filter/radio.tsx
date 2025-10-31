import { H5 } from '@blueprintjs/core'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import styled from 'styled-components'

import { rawValueFilterSelector } from '../../selectors'
import { CustomRadioCard } from '../components/card-controls'

const RadioContainer = styled.div`
  margin-bottom: 20px;
`

const RadioGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`

const filterSelectors: Record<string, (state: any) => number> = {
  rawValue: rawValueFilterSelector,
}

interface IProps {
  configKey: string
  label: string
  options: { [key: string]: string }
  default: number
}

export const RadioCheck: React.FC<IProps> = ({
  label,
  options,
  configKey,
  default: defaultValue,
}) => {
  const { t } = useTranslation(['poi-plugin-ship-info'])
  const currentValue = useSelector(
    filterSelectors[configKey] || (() => defaultValue || 0),
  )

  const handleChange = (event: React.FormEvent<HTMLInputElement>) => {
    window.config.set(
      `plugin.ShipInfo.${configKey}`,
      parseInt(event.currentTarget.value, 10),
    )
  }

  const radioGroupName = `radio-${configKey}`

  return (
    <RadioContainer>
      <H5>{t(label)}</H5>
      <RadioGroup>
        {Object.keys(options).map((key) => (
          <CustomRadioCard
            key={key}
            value={key}
            name={radioGroupName}
            checked={currentValue.toString() === key}
            onChange={handleChange}
            compact
          >
            {t(options[key])}
          </CustomRadioCard>
        ))}
      </RadioGroup>
    </RadioContainer>
  )
}
