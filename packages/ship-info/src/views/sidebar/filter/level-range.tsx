// tslint:disable jsx-no-lambda
import { Classes, H5, NumberRange, RangeSlider } from '@blueprintjs/core'
import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import styled from 'styled-components'
import { levelRangeFilterSelector } from '../../selectors'

const LevelControls = styled.div`
  display: grid;
  grid-template-columns: 4em minmax(0, 1fr) 4em;
  column-gap: 1.5em;
  align-items: start;

  > input {
    width: 100%;
    height: 30px;
    text-align: center;
    font-variant-numeric: tabular-nums;
  }

  > .${Classes.SLIDER} {
    min-width: 0;
    /* Blueprint's track is centered 8px below the top; labels sit beneath it. */
    margin-top: 7px;
  }
`

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
  const [range, setRange] = useState<NumberRange>(levelRange)
  const dragging = useRef(false)

  const { t } = useTranslation('poi-plugin-ship-info')

  useEffect(() => {
    if (!dragging.current) setRange(levelRange)
  }, [levelRange])

  function commitRange([minLevel, maxLevel]: NumberRange) {
    window.config.set('plugin.ShipInfo.filters', {
      ...window.config.get('plugin.ShipInfo.filters', {}),
      maxLevel,
      minLevel,
    })
  }

  function handleSliderChange(next: NumberRange) {
    // Keep the handles responsive while dragging; the table follows on release.
    dragging.current = true
    setRange(next)
  }

  function handleSliderRelease(next: NumberRange) {
    dragging.current = false
    setRange(next)
    commitRange(next)
  }

  function handleInputChange(next: NumberRange) {
    setRange(next)
    commitRange(next)
  }

  return (
    <section style={{ margin: 0 }}>
      <H5>{t('Level')}</H5>
      <LevelControls>
        <LevelInput
          label={t('Minimum level')}
          value={range[0]}
          min={0}
          max={range[1]}
          onChange={(level) => handleInputChange([level, range[1]])}
        />
        <RangeSlider
          min={0}
          max={450}
          stepSize={1}
          labelStepSize={90}
          value={range}
          onChange={handleSliderChange}
          onRelease={handleSliderRelease}
        />
        <LevelInput
          label={t('Maximum level')}
          value={range[1]}
          min={range[0]}
          max={450}
          onChange={(level) => handleInputChange([range[0], level])}
        />
      </LevelControls>
    </section>
  )
}
