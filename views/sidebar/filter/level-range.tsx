// tslint:disable jsx-no-lambda
import { H5, RangeSlider } from '@blueprintjs/core'
import { debounce } from 'lodash'
import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import { levelRangeFilterSelector } from '../../selectors'
import { Checkbox, CheckboxLabel } from '../components/checkbox'

export const LevelRange = () => {
  const levelRange = useSelector(levelRangeFilterSelector)
  const [range, setRange] = useState<[number, number]>(levelRange)

  const { t } = useTranslation('poi-plugin-ship-info')

  const updateRange = useCallback(
    debounce((newRange: [number, number]) => {
      window.config.set('plugin.ShipInfo.filters.minLevel', newRange[0])
      window.config.set('plugin.ShipInfo.filters.maxLevel', newRange[1])
    }, 500),
    [],
  )

  const handleRangeChange = useCallback(
    (newRange: [number, number]) => {
      setRange(newRange)
      updateRange(newRange)
    },
    [updateRange],
  )

  return (
    <Checkbox>
      <H5>{t('Level')}</H5>
      <RangeSlider
        min={0}
        max={450}
        stepSize={1}
        labelStepSize={90}
        value={range}
        onChange={handleRangeChange}
      />
    </Checkbox>
  )
}
