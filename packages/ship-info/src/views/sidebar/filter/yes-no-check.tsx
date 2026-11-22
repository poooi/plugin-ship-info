import { darken, getContrast, lighten } from 'polished'
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

const accentColor = (theme: {
  DARK_GRAY3: string
  LIGHT_GRAY5: string
  ORANGE3: string
  ORANGE5: string
  variant: string
}) => {
  const surface =
    theme.variant === 'light' ? theme.LIGHT_GRAY5 : theme.DARK_GRAY3
  const base =
    theme.variant === 'light'
      ? theme.ORANGE5
      : lighten(0.15, theme.ORANGE3)
  const adjust = (color: string) =>
    theme.variant === 'light' ? darken(0.06, color) : lighten(0.06, color)
  let color = base
  for (let step = 0; step < 8 && getContrast(color, surface) < 4.5; step += 1) {
    color = adjust(color)
  }
  return color
}

const neutralColor = (theme: { DARK_GRAY1: string; LIGHT_GRAY5: string; variant: string }) =>
  theme.variant === 'light' ? theme.DARK_GRAY1 : theme.LIGHT_GRAY5

const YesNoContainer = styled.div<{ $restricted: boolean }>`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;

  h5 {
    margin: 0;
    font: inherit;
    color: ${({ $restricted, theme }) =>
      $restricted ? accentColor(theme) : neutralColor(theme)};
    font-weight: ${({ $restricted }) => ($restricted ? 600 : 400)};
  }
`

const CardRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
`

const CheckOption = styled.label<{ $restricted: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 24px;
  padding: 1px 4px;
  border-radius: 3px;
  color: ${({ $restricted, theme }) =>
    $restricted ? accentColor(theme) : neutralColor(theme)};
  cursor: pointer;

  input {
    width: 14px;
    height: 14px;
    margin: 0;
    accent-color: ${({ $restricted, theme }) =>
      $restricted ? accentColor(theme) : theme.GRAY3};
    cursor: pointer;
  }

  &:hover {
    background: ${({ theme }) =>
      theme.variant === 'light' ? theme.LIGHT_GRAY3 : theme.DARK_GRAY4};
  }

  &:focus-within {
    outline: 2px solid ${({ theme }) => accentColor(theme)};
    outline-offset: 1px;
  }
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
          <CheckOption key={option} $restricted={restricted}>
            <input
              type="checkbox"
              checked={checked[index]}
              onChange={handleToggle(index)}
            />
            <span>{t(option)}</span>
          </CheckOption>
        ))}
      </CardRow>
    </YesNoContainer>
  )
}
