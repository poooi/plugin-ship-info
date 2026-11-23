// tslint:disable jsx-no-lambda
import { Classes, H5 } from '@blueprintjs/core'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import styled from 'styled-components'
import { levelRangeFilterDetailsSelector } from '../../selectors'

const LevelControls = styled.div`
  display: grid;
  grid-template-columns: 4em minmax(0, 1fr) 4em;
  column-gap: 1.5em;
  align-items: center;

  > input {
    width: 100%;
    height: 30px;
    text-align: center;
    font-variant-numeric: tabular-nums;
  }
`

const Track = styled.div`
  position: relative;
  min-width: 0;
  height: 4px;
  border-radius: 2px;
  background: ${({ theme }) => theme.GRAY3};
`

const Highlight = styled.span`
  position: absolute;
  top: 0;
  bottom: 0;
  min-width: 2px;
  border-radius: 2px;
  background: ${({ theme }) => theme.COBALT3};
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
  const { ceiling, explicitMax, minLevel, maxLevel } = useSelector(
    levelRangeFilterDetailsSelector,
  )

  const { t } = useTranslation('poi-plugin-ship-info')

  function commitRange(nextMin: number, nextMax?: number) {
    const current = window.config.get(
      'plugin.ShipInfo.filters',
      {} as Record<string, unknown>,
    )
    const { maxLevel: _maxLevel, ...rest } = current ?? {}
    window.config.set('plugin.ShipInfo.filters', {
      ...rest,
      minLevel: nextMin,
      ...(nextMax === undefined ? {} : { maxLevel: nextMax }),
    })
  }

  // Scale to the roster ceiling, but keep an imported explicit maximum visible
  // when the roster has shrunk below it.
  const scale = Math.max(ceiling, maxLevel, minLevel)
  const left = scale > 0 ? (minLevel / scale) * 100 : 0
  const width =
    scale > 0 ? Math.max(0, ((maxLevel - minLevel) / scale) * 100) : 0

  return (
    <section style={{ margin: 0 }}>
      <H5>{t('Level')}</H5>
      <LevelControls>
        <LevelInput
          label={t('Minimum level')}
          value={minLevel}
          min={0}
          max={maxLevel}
          onChange={(level) =>
            commitRange(
              level,
              explicitMax && maxLevel !== ceiling ? maxLevel : undefined,
            )
          }
        />
        <Track aria-hidden="true" data-level-track="">
          <Highlight
            data-level-highlight=""
            style={{
              left: `min(${left}%, calc(100% - 2px))`,
              minWidth: maxLevel < minLevel || scale === 0 ? 0 : undefined,
              width: `${width}%`,
            }}
          />
        </Track>
        <LevelInput
          label={t('Maximum level')}
          value={maxLevel}
          min={minLevel}
          max={Math.max(ceiling, maxLevel)}
          onChange={(level) =>
            commitRange(minLevel, level < ceiling ? level : undefined)
          }
        />
      </LevelControls>
    </section>
  )
}
