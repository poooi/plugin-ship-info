import { Button, H5, Tag } from '@blueprintjs/core'
import React, { useRef, useState } from 'react'
import FA from 'react-fontawesome'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import styled from 'styled-components'
import { Popover } from 'views/components/etc/overlay'

import { CustomColoredCheckboxCard, CardRow } from '../components/card-controls'
import { specialEquipment } from '../../special-equipment'
import { rawValueOptions } from '../../constants'
import {
  levelRangeFilterDetailsSelector,
  sallyAreaFilterViewSelector,
  shipInfoConfigSelector,
  shipTypeFilterViewSelector,
} from '../../selectors'
import { LevelRange } from './level-range'
import { RadioCheck } from './radio'
import { SallyAreaCheck } from './sally-area'
import { applySettings } from './settings'
import { ShipTypeCheck } from './ship-type'
import { YesNoCheck } from './yes-no-check'

const statusFilters = [
  { configKey: 'locked', label: 'Lock' },
  { configKey: 'expedition', label: 'Expedition' },
  { configKey: 'inFleet', label: 'In Fleet' },
  { configKey: 'sparkle', label: 'Sparkle' },
  { configKey: 'exSlot', label: 'Extra Slot' },
  { configKey: 'modernization', label: 'Modernization Completed' },
  { configKey: 'remodel', label: 'Remodelable' },
] as const

const sectionNames = [
  'Ship types',
  'Level',
  'Sally Area',
  'Status',
  'Special equipment',
  'Value Type',
] as const

const Panel = styled.div`
  width: min(640px, 85vw);
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  --filter-surface: ${({ theme }) =>
    theme.variant === 'light' ? theme.LIGHT_GRAY5 : theme.DARK_GRAY3};
  background: var(--filter-surface);
`

const Navigation = styled.nav`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 6px;
  padding: 4px 8px;
  border-bottom: 1px solid ${(p) => p.theme.GRAY3};

  button {
    flex: none;
    white-space: nowrap;
  }

  .filter-nav-label {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    line-height: 1;
  }

  .filter-nav-name {
    display: inline-flex;
    align-items: center;
    line-height: 1;
  }

  .filter-nav-modified {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 16px;
    padding: 0 4px;
    font-size: 10px;
    line-height: 1;
  }

  button.filter-reset-button {
    margin-inline-start: auto;
  }
`

const Sections = styled.div`
  padding: 0 12px 8px;
  overflow-y: auto;

  > section {
    padding: 6px 0;
  }

  > section > h5:first-child,
  > section > :first-child > h5:first-child {
    margin: 0 0 6px;
    padding-block: 4px;
    background: var(--filter-surface);
  }

  > section[data-active] > h5:first-child,
  > section[data-active] > :first-child > h5:first-child {
    position: sticky;
    top: 0;
    z-index: 2;
  }
`

const StatusGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 245px), 1fr));
  gap: 2px 18px;
`

const Section = styled.section`
  &:focus {
    outline: none;
  }

  &:focus-visible {
    outline: 2px solid ${(p) => p.theme.BLUE4};
    outline-offset: -2px;
  }
`

function FilterPanel() {
  const { t } = useTranslation('poi-plugin-ship-info')
  const scroll = useRef<HTMLDivElement>(null)
  const pendingJump = useRef<{ index: number; top: number } | null>(null)
  const [active, setActive] = useState(0)
  const [resetVersion, setResetVersion] = useState(0)
  const config = useSelector(shipInfoConfigSelector)
  const range = useSelector(levelRangeFilterDetailsSelector)
  const types = useSelector(shipTypeFilterViewSelector)
  const areas = useSelector(
    (state: Parameters<typeof shipInfoConfigSelector>[0]) =>
      sallyAreaFilterViewSelector(state, window.language),
  )
  const dirty = [
    !types.checkedAll,
    range.minLevel !== 0 || range.explicitMax,
    !areas.checkedAll,
    statusFilters.some(({ configKey }) => !config[configKey].every(Boolean)),
    specialEquipment.some(({ configKey }) => !config[configKey].every(Boolean)),
    config.rawValue !== 0,
  ]

  function jump(index: number) {
    const root = scroll.current
    const section = root?.children[index] as HTMLElement | undefined
    if (!root || !section) return
    root.scrollTop +=
      section.getBoundingClientRect().top - root.getBoundingClientRect().top
    // A short final section cannot reach the top; keep its click target active
    // while the scroll position is clamped.
    pendingJump.current = { index, top: root.scrollTop }
    setActive(index)
    section.focus({ preventScroll: true })
  }

  function reset() {
    applySettings({})
    pendingJump.current = null
    setActive(0)
    // Remount the page so local input drafts (level text) also reset.
    setResetVersion((value) => value + 1)
  }

  return (
    <Panel>
      <Navigation aria-label={t('Filter sections')}>
        {sectionNames.map((label, index) => (
          <Button
            minimal={active !== index}
            small
            key={label}
            intent={active === index ? 'primary' : undefined}
            data-dirty={dirty[index] ? 'true' : undefined}
            aria-controls={`filter-section-${index}`}
            aria-current={active === index ? 'location' : undefined}
            aria-label={
              t(label) + (dirty[index] ? ' · ' + t('Modified') : '')
            }
            onClick={() => jump(index)}
          >
            <span className="filter-nav-label">
              <span className="filter-nav-name">{t(label)}</span>
              {dirty[index] && (
                <Tag
                  className="filter-nav-modified"
                  round
                  aria-hidden="true"
                >
                  {t('Modified')}
                </Tag>
              )}
            </span>
          </Button>
        ))}
        <Button
          small
          className="filter-reset-button"
          title={t('Reset filters and sorting')}
          onClick={reset}
        >
          {t('Reset filters and sorting')}
        </Button>
      </Navigation>
      <Sections
        key={resetVersion}
        ref={scroll}
        data-filter-sections=""
        onScroll={({ currentTarget }) => {
          const pending = pendingJump.current
          if (
            pending &&
            Math.abs(currentTarget.scrollTop - pending.top) <= 1
          ) {
            setActive(pending.index)
            return
          }
          pendingJump.current = null
          const sections = Array.from(currentTarget.children)
          const { clientHeight, scrollHeight, scrollTop } = currentTarget
          if (
            scrollHeight > clientHeight + 1 &&
            scrollTop + clientHeight >= scrollHeight - 1
          ) {
            setActive(sections.length - 1)
            return
          }
          const top = currentTarget.getBoundingClientRect().top
          const index =
            sections.filter(
              (section) => section.getBoundingClientRect().top <= top + 2,
            ).length - 1
          setActive(Math.max(0, index))
        }}
      >
        <Section
          id="filter-section-0"
          data-active={active === 0 ? '' : undefined}
          tabIndex={-1}
          aria-label={t('Ship types')}
        >
          <ShipTypeCheck />
        </Section>
        <Section
          id="filter-section-1"
          data-active={active === 1 ? '' : undefined}
          tabIndex={-1}
          aria-label={t('Level')}
        >
          <LevelRange />
        </Section>
        <Section
          id="filter-section-2"
          data-active={active === 2 ? '' : undefined}
          tabIndex={-1}
          aria-label={t('Sally Area')}
        >
          <SallyAreaCheck />
        </Section>
        <Section
          id="filter-section-3"
          data-active={active === 3 ? '' : undefined}
          tabIndex={-1}
          aria-label={t('Status')}
        >
          <H5>{t('Status')}</H5>
          <StatusGrid data-filter-status-grid="">
            {statusFilters.map(({ configKey, label }) => (
              <YesNoCheck key={configKey} configKey={configKey} label={label} />
            ))}
          </StatusGrid>
        </Section>
        <Section
          id="filter-section-4"
          data-active={active === 4 ? '' : undefined}
          tabIndex={-1}
          aria-label={t('Special equipment')}
        >
          <H5>{t('Special equipment')}</H5>
          <CardRow>
            {specialEquipment.map(({ configKey, label }) => {
              const [yes, no] = config[configKey]
              // Old presets can exclude capable ships or exclude both groups.
              const legacyLabel = no ? t('No') : t('Neither')
              return (
                <CustomColoredCheckboxCard
                  compact
                  key={configKey}
                  checked={yes && !no}
                  indeterminate={!yes}
                  onChange={() => window.config.set(
                    `plugin.ShipInfo.${configKey}`,
                    yes && no ? [true, false] : [true, true],
                  )}
                >
                  {yes ? t(label) : `${t(label)} (${legacyLabel})`}
                </CustomColoredCheckboxCard>
              )
            })}
          </CardRow>
        </Section>
        <Section
          id="filter-section-5"
          data-active={active === 5 ? '' : undefined}
          tabIndex={-1}
          aria-label={t('Value Type')}
        >
          <RadioCheck
            configKey="rawValue"
            label="Value Type"
            options={rawValueOptions}
            default={0}
          />
        </Section>
      </Sections>
    </Panel>
  )
}

export const Filter = () => {
  const { t } = useTranslation('poi-plugin-ship-info')
  return (
    <Popover content={<FilterPanel />} hasBackdrop>
      <Button aria-label={t('Filter')} minimal>
        <FA name="filter" />
      </Button>
    </Popover>
  )
}
