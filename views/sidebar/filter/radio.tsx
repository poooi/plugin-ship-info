import { H5, RadioCard, RadioGroup } from '@blueprintjs/core'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import styled from 'styled-components'

import { rawValueFilterSelector } from '../../selectors'

const RadioContainer = styled.div`
  margin-bottom: 20px;
`

const StyledRadioGroup = styled(RadioGroup)`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
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

  return (
    <RadioContainer>
      <H5>{t(label)}</H5>
      <StyledRadioGroup
        onChange={handleChange}
        selectedValue={currentValue.toString()}
      >
        {Object.keys(options).map((key) => (
          <RadioCard key={key} value={key} compact>
            {t(options[key])}
          </RadioCard>
        ))}
      </StyledRadioGroup>
    </RadioContainer>
  )
}
