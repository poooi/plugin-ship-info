// tslint:disable jsx-no-lambda
import { NumericInput, Position, RangeSlider } from '@blueprintjs/core'
import { debounce, get } from 'lodash'
import React, { useCallback, useState } from 'react'
import FA from 'react-fontawesome'
import { useTranslation } from 'react-i18next'
import { connect } from 'react-redux'
import { Checkbox, CheckboxLabel } from '../components/checkbox'

interface IProps {
  minLevel: number
  maxLevel: number
}

export const LevelRange = connect((state: { config: any }) => ({
  maxLevel: get(state.config, 'plugin.ShipInfo.filters.maxLevel', 165),
  minLevel: get(state.config, 'plugin.ShipInfo.filters.minLevel', 1),
}))(({ minLevel, maxLevel }: IProps) => {
  const [min, setMin] = useState(minLevel)
  const [max, setMax] = useState(maxLevel)

  const { t } = useTranslation('poi-plugin-ship-info')

  const updateMax = useCallback(
    debounce((v: number) => {
      setMax(v)
      window.config.set('plugin.ShipInfo.filters.maxLevel', v)
    }, 500),
    [setMax],
  )

  const updateMin = useCallback(
    debounce((v: number) => {
      setMin(v)
      window.config.set('plugin.ShipInfo.filters.minLevel', v)
    }, 500),
    [setMin],
  )

  return (
    <Checkbox>
      <CheckboxLabel>{t('Level')}</CheckboxLabel>
      <NumericInput
        buttonPosition="none"
        value={min}
        onValueChange={updateMin}
        min={1}
        max={165}
        stepSize={1}
        clampValueOnBlur={true}
      />
      <FA name="arrows-alt-h" />
      <NumericInput
        buttonPosition="none"
        value={max}
        onValueChange={updateMax}
        min={1}
        max={165}
        stepSize={1}
        clampValueOnBlur={true}
      />
    </Checkbox>
  )
})
