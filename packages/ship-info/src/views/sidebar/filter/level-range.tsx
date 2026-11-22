// tslint:disable jsx-no-lambda
import { Classes, H5, RangeSlider } from '@blueprintjs/core'
import { debounce } from 'lodash'
import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import { levelRangeFilterSelector } from '../../selectors'
import { Checkbox } from '@poi-plugins/shared/ui/checkbox'

interface LevelInputProps {
  label: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
}

function LevelInput({ label, value, min, max, onChange }: LevelInputProps) {
  const [draft, setDraft] = useState<string>()

  return (
    <input
      className={Classes.INPUT}
      style={{ width: '5em' }}
      aria-label={label}
      inputMode="numeric"
      value={draft ?? String(value)}
      onChange={({ currentTarget }) => {
        const text = currentTarget.value
        if (/\D/.test(text)) return
        setDraft(text)
        const level = Number(text)
        if (text && level >= min && level <= max) onChange(level)
      }}
      onBlur={() => {
        if (draft) {
          const level = Math.min(max, Math.max(min, Number(draft)))
          if (level !== value) onChange(level)
        }
        setDraft(undefined)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur()
      }}
    />
  )
}

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
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginLeft: 12,
        }}
      >
        <LevelInput
          label={t('Minimum level')}
          value={range[0]}
          min={0}
          max={range[1]}
          onChange={(level) => handleRangeChange([level, range[1]])}
        />
        <span aria-hidden="true">–</span>
        <LevelInput
          label={t('Maximum level')}
          value={range[1]}
          min={range[0]}
          max={450}
          onChange={(level) => handleRangeChange([range[0], level])}
        />
      </div>
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
