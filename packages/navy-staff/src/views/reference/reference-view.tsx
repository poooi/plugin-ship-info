// Read-only reference view. Renders a decoded reference as plain text: it never
// loads images, calls the host/game, dispatches Redux actions, or mutates the
// workspace. Colors come from the codec-validated `#RRGGBB` field; user strings
// are rendered as React text children only.

import {
  Button,
  ButtonGroup,
  Callout,
  InputGroup,
  Tag,
} from '@blueprintjs/core'
import React, { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import { createSelector } from 'reselect'
import styled from 'styled-components'
import { constSelector } from 'views/utils/selectors'

import { shipTypeLabelKeys } from '@poi-plugins/ship-info-shared/ship-types'
import {
  projectReference,
  type MasterCatalog,
  type ReferenceMaster,
} from './catalog.ts'
import type { DecodedReference } from './types.ts'
import { filterProjectedReference, groupShipsByType } from './helpers.ts'

// Master names/types come only from the current poi Redux master data. Nothing is
// bundled, fetched, or persisted; a missing master resolves to the `???` fallback
// in `projectReference` without changing the stored reference.
const referenceMastersSelector = createSelector(
  [constSelector],
  ($const): MasterCatalog => {
    const masters = new Map<number, ReferenceMaster>()
    const $ships = ($const as { $ships?: Record<string, { api_name?: unknown; api_stype?: unknown }> })
      ?.$ships
    if (!$ships) return masters
    for (const key of Object.keys($ships)) {
      const id = Number(key)
      const ship = $ships[key]
      if (!Number.isInteger(id) || !ship) continue
      const stype = typeof ship.api_stype === 'number' ? ship.api_stype : null
      masters.set(id, {
        name: typeof ship.api_name === 'string' ? ship.api_name : '',
        type: stype !== null ? shipTypeLabelKeys[stype] ?? '' : '',
      })
    }
    return masters
  },
)

// This view is the main content of the Reference page, so it has no inherited
// card divider or top offset.
const Wrapper = styled.section``

// Title/status on one row, with the close control kept at the right edge.
const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: nowrap;
`

const Title = styled.strong`
  font-size: 1em;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const HeaderSpacer = styled.div`
  flex: 1 1 0;
  min-width: 0;
`

const MetaBar = styled.div`
  display: flex;
  gap: 4px 16px;
  flex-wrap: wrap;
  font-size: 0.85em;
  opacity: 0.85;
  margin: 4px 0 12px;
`

// View + reopen actions and the search share one wrapping toolbar.
const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
`

const SearchBox = styled.div`
  flex: 1 1 12em;
  min-width: 0;
`

const Group = styled.div`
  margin: 0 0 12px;
`

const GroupHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
`

const Swatch = styled.span<{ $color: string }>`
  display: inline-block;
  width: 0.75em;
  height: 0.75em;
  border-radius: 2px;
  background: ${(props) => props.$color};
`

const ShipRow = styled.div<{ $withArea: boolean }>`
  display: grid;
  grid-template-columns: ${(props) =>
    props.$withArea
      ? 'minmax(4em, auto) minmax(0, 1fr) auto auto auto'
      : 'minmax(4em, auto) minmax(0, 1fr) auto auto'};
  gap: 8px;
  align-items: center;
  padding: 5px 8px;
  font-size: 0.9em;

  &:nth-child(odd) {
    background: rgba(128, 128, 128, 0.08);
  }
`

const TypeLabel = styled.span`
  opacity: 0.85;
  white-space: nowrap;
`

const Name = styled.span`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const MasterId = styled.span`
  font-family: monospace;
  opacity: 0.75;
  white-space: nowrap;
`

const Level = styled.span`
  white-space: nowrap;
`

type ViewMode = 'area' | 'grid'

export interface ReferenceViewProps {
  reference: DecodedReference
  onClose?: () => void
  /** Reveals the open form again to replace the current reference. */
  onReopen?: () => void
}

export const ReferenceView = ({ reference, onClose, onReopen }: ReferenceViewProps) => {
  const { t, i18n } = useTranslation('poi-plugin-navy-staff')
  const masters = useSelector(referenceMastersSelector)
  const [mode, setMode] = useState<ViewMode>('area')
  const [query, setQuery] = useState('')

  const projected = useMemo(
    () => projectReference(reference, masters),
    [reference, masters],
  )
  // Resolve type labels for search only, so both the raw key (`DD`) and the
  // visible localized label match; grouping keys stay the raw type key.
  const resolveType = useCallback(
    (type: string) => t(type),
    [t, i18n.language],
  )
  const filtered = useMemo(
    () => filterProjectedReference(projected, query, resolveType),
    [projected, query, resolveType],
  )
  const typeGroups = useMemo(() => groupShipsByType(filtered), [filtered])

  const renderShip = (
    ship: (typeof filtered.groups)[number]['ships'][number],
    key: string,
    area?: { color: string; label: string },
  ) => (
    <ShipRow key={key} $withArea={Boolean(area)} data-testid="reference-ship">
      <TypeLabel>{ship.type ? t(ship.type) : t('Unknown type')}</TypeLabel>
      <Name title={ship.name}>{ship.name}</Name>
      {area && (
        <Tag minimal style={{ color: area.color }}>
          {area.label}
        </Tag>
      )}
      <MasterId>{ship.masterId === null ? '—' : `#${ship.masterId}`}</MasterId>
      <Level>Lv.{ship.level ?? '?'}</Level>
    </ShipRow>
  )

  const searching = query.trim().length > 0

  return (
    <Wrapper data-testid="reference-view" aria-label={reference.title}>
      <Header>
        <Title>{reference.title}</Title>
        <Tag minimal>{t('Reference is read-only')}</Tag>
        <HeaderSpacer />
        {onClose && (
          <Button icon="cross" minimal onClick={onClose} aria-label={t('Close reference')} />
        )}
      </Header>

      <MetaBar>
        <span>
          {t('Capture time')}: {reference.captureTime}
        </span>
        <span>
          {t('Generated at')}: {reference.exportTime}
        </span>
        <span>
          {t('Locale')}: {reference.locale}
        </span>
        <span>
          {t('Areas')}: {filtered.groupCount} · {t('Ships')}: {filtered.shipCount}
        </span>
      </MetaBar>

      <Toolbar>
        <ButtonGroup>
          <Button active={mode === 'area'} onClick={() => setMode('area')} small>
            {t('Area View')}
          </Button>
          <Button active={mode === 'grid'} onClick={() => setMode('grid')} small>
            {t('Ship Grid')}
          </Button>
        </ButtonGroup>
        {onReopen && (
          <Button small text={t('Open another reference')} onClick={onReopen} />
        )}
        <SearchBox>
          <InputGroup
            fill
            leftIcon="search"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder={t('Search ships')}
            rightElement={
              searching ? (
                <Button icon="cross" minimal onClick={() => setQuery('')} aria-label={t('Clear')} />
              ) : undefined
            }
          />
        </SearchBox>
      </Toolbar>

      {searching && filtered.shipCount === 0 ? (
        <Callout>{t('No ships match')}</Callout>
      ) : mode === 'area' ? (
        filtered.groups
          // Empty captured areas stay visible when not searching; a search hides
          // groups with no matching ships.
          .filter((group) => !searching || group.shipCount > 0)
          .map((group, groupIndex) => (
            <Group key={`${groupIndex}-${group.label}`} data-testid="reference-area">
              <GroupHeader>
                <Swatch $color={group.color} aria-hidden />
                <Tag minimal style={{ color: group.color }}>
                  {group.label}
                </Tag>
                <span>{group.shipCount}</span>
              </GroupHeader>
              {group.ships.map((ship, shipIndex) =>
                renderShip(ship, `${groupIndex}-${shipIndex}`),
              )}
            </Group>
          ))
      ) : (
        typeGroups.map((bucket, bucketIndex) => (
          <Group key={`${bucketIndex}-${String(bucket.type)}`} data-testid="reference-area">
            <GroupHeader>
              <TypeLabel>{bucket.type ? t(bucket.type) : t('Unknown type')}</TypeLabel>
              <span>{bucket.ships.length}</span>
            </GroupHeader>
            {bucket.ships.map((ship, shipIndex) =>
              renderShip(ship, `${bucketIndex}-${shipIndex}`, {
                color: ship.areaColor,
                label: ship.areaLabel,
              }),
            )}
          </Group>
        ))
      )}
    </Wrapper>
  )
}
