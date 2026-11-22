// tslint:disable jsx-no-lambda
import { Classes, H5, RangeSlider } from '@blueprintjs/core'
import React, { useState } from 'react'
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

  const { t } = useTranslation('poi-plugin-ship-info')

  function handleRangeChange([minLevel, maxLevel]: [number, number]) {
    window.config.set('plugin.ShipInfo.filters', {
      ...window.config.get('plugin.ShipInfo.filters', {}),
      maxLevel,
      minLevel,
    })
  }

  return (
    <section style={{ margin: '8px 0' }}>
      <H5>{t('Level')}</H5>
      <LevelControls>
        <LevelInput
          label={t('Minimum level')}
          value={levelRange[0]}
          min={0}
          max={levelRange[1]}
          onChange={(level) => handleRangeChange([level, levelRange[1]])}
        />
        <RangeSlider
          min={0}
          max={450}
          stepSize={1}
          labelStepSize={90}
          value={levelRange}
          onChange={handleRangeChange}
        />
        <LevelInput
          label={t('Maximum level')}
          value={levelRange[1]}
          min={levelRange[0]}
          max={450}
          onChange={(level) => handleRangeChange([levelRange[0], level])}
        />
      </LevelControls>
    </section>
  )
}
