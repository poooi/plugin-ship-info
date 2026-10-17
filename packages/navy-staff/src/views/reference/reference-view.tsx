// Read-only reference view. Renders decoded share content in three read-only
// modes (area/list/card grid) and can save the title, metadata, and roster as an
// image. Controls and search sit outside the capture target. It never loads game
// data, dispatches Redux actions, or mutates the workspace; saving uses the host
// capture/download boundary only. Colors come from the codec-validated
// `#RRGGBB` field; user strings are rendered as React text children only.

import {
  Button,
  Callout,
  InputGroup,
  Intent,
  Tag,
} from '@blueprintjs/core'
import React, { useCallback, useContext, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import { createSelector } from 'reselect'
import styled, { ThemeContext } from 'styled-components'
import { constSelector } from 'views/utils/selectors'

import { shipTypeLabelKeys } from '@poi-plugins/ship-info-shared/ship-types'
import { captureRect, imageFileName } from '../planner/capture'
import { readingToRomaji } from '../search'
import { ViewToggle } from '../view-toggle'
import {
  projectReference,
  type MasterCatalog,
  type ReferenceMaster,
} from './catalog.ts'
import type { DecodedReference } from './types.ts'
import { filterProjectedReference } from './helpers.ts'

// Master names/types/readings come only from the current poi Redux master data.
// Nothing is bundled, fetched, or persisted; a missing master resolves to the
// `???` fallback in `projectReference` without changing the stored reference.
const referenceMastersSelector = createSelector(
  [constSelector],
  ($const): MasterCatalog => {
    const masters = new Map<number, ReferenceMaster>()
    const $ships = ($const as {
      $ships?: Record<string, { api_name?: unknown; api_stype?: unknown; api_yomi?: unknown }>
    })?.$ships
    if (!$ships) return masters
    for (const key of Object.keys($ships)) {
      const id = Number(key)
      const ship = $ships[key]
      if (!Number.isInteger(id) || !ship) continue
      const stype = typeof ship.api_stype === 'number' ? ship.api_stype : null
      const yomi = typeof ship.api_yomi === 'string' ? ship.api_yomi : ''
      masters.set(id, {
        name: typeof ship.api_name === 'string' ? ship.api_name : '',
        type: stype !== null ? shipTypeLabelKeys[stype] ?? '' : '',
        romaji: readingToRomaji(yomi),
        yomi,
      })
    }
    return masters
  },
)

const Wrapper = styled.section``

// Controls + search stay outside the capture target.
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

const MetaBar = styled.div`
  display: flex;
  gap: 4px 16px;
  flex-wrap: wrap;
  font-size: 0.85em;
  opacity: 0.85;
  margin: 4px 0 12px;
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
      ? 'minmax(4em, auto) minmax(0, 1fr) auto auto'
      : 'minmax(4em, auto) minmax(0, 1fr) auto'};
  gap: 8px;
  align-items: center;
  padding: 5px 8px;
  font-size: 0.9em;

  &:nth-child(odd) {
    background: rgba(128, 128, 128, 0.08);
  }
`

const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(150px, 100%), 1fr));
  gap: 8px;
`

const ShipCard = styled.div<{ $color: string }>`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  padding: 6px 8px;
  border: 1px solid rgba(128, 128, 128, 0.3);
  border-left: 4px solid ${(props) => props.$color};
  border-radius: 4px;
  font-size: 0.9em;
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
  font-weight: 600;
`

const Level = styled.span`
  white-space: nowrap;
`

const CardMeta = styled.span`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  opacity: 0.85;
  font-size: 0.85em;
`

type ViewMode = 'area' | 'list' | 'grid'

export interface ReferenceViewProps {
  reference: DecodedReference
  onClose?: () => void
  /** Reveals the open form again to replace the current reference. */
  onReopen?: () => void
  /** Reports capture start/end so a host can block snapshot replacement. */
  onCaptureBusyChange?: (busy: boolean) => void
}

export const ReferenceView = ({
  reference,
  onClose,
  onReopen,
  onCaptureBusyChange,
}: ReferenceViewProps) => {
  const { t, i18n } = useTranslation('poi-plugin-navy-staff')
  const theme = useContext(ThemeContext) as
    | { variant?: 'light' | 'dark' }
    | undefined
  const masters = useSelector(referenceMastersSelector)
  const [mode, setMode] = useState<ViewMode>('area')
  const [query, setQuery] = useState('')
  const captureRef = useRef<HTMLDivElement>(null)
  const [capturePending, setCapturePending] = useState(false)
  const [captureFailed, setCaptureFailed] = useState(false)

  // Prefer the host theme variant; if a host theme omits it, fall back to the
  // inherited computed background so the output stays opaque.
  const opaqueBackground = (): string => {
    if (theme?.variant === 'light') return '#ffffff'
    if (theme?.variant === 'dark') return '#1c2127'
    const isOpaque = (value: string): boolean =>
      Boolean(value) && value !== 'transparent' && value !== 'rgba(0, 0, 0, 0)'
    const inherited = captureRef.current
      ? getComputedStyle(captureRef.current).backgroundColor
      : ''
    if (isOpaque(inherited)) return inherited
    const bodyBackground =
      typeof document !== 'undefined'
        ? getComputedStyle(document.body).backgroundColor
        : ''
    return isOpaque(bodyBackground) ? bodyBackground : '#1c2127'
  }

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

  // Flat occurrence list preserving group/ship order, used by list and grid.
  const occurrences = useMemo(
    () =>
      filtered.groups.flatMap((group) =>
        group.ships.map((ship) => ({
          ...ship,
          areaColor: group.color,
          areaLabel: group.label,
        })),
      ),
    [filtered],
  )

  const renderRow = (
    ship: (typeof occurrences)[number],
    key: string,
    withArea: boolean,
  ) => (
    <ShipRow key={key} $withArea={withArea} data-testid="reference-ship">
      <TypeLabel>{ship.type ? t(ship.type) : t('Unknown type')}</TypeLabel>
      <Name title={ship.name}>{ship.name}</Name>
      {withArea && (
        <Tag minimal style={{ color: ship.areaColor }}>
          {ship.areaLabel}
        </Tag>
      )}
      <Level>Lv.{ship.level ?? '?'}</Level>
    </ShipRow>
  )

  const handleCapture = async () => {
    if (!captureRef.current || capturePending) return
    const viewLabel =
      mode === 'area' ? t('Area View') : mode === 'list' ? t('Ship List') : t('Ship Grid')
    setCapturePending(true)
    setCaptureFailed(false)
    onCaptureBusyChange?.(true)
    try {
      await captureRect(captureRef.current, {
        backgroundColor: opaqueBackground(),
        fileName: imageFileName(reference.title, viewLabel),
        filterName: t('PNG image'),
      })
    } catch {
      setCaptureFailed(true)
    } finally {
      setCapturePending(false)
      onCaptureBusyChange?.(false)
    }
  }

  const searching = query.trim().length > 0

  return (
    <Wrapper data-testid="reference-view" aria-label={reference.title}>
      <Toolbar>
        <ViewToggle
          value={mode}
          onChange={setMode}
          disabled={capturePending}
          labels={{
            area: t('Area View'),
            grid: t('Ship Grid'),
            list: t('Ship List'),
          }}
        />
        {onReopen && (
          <Button
            small
            text={t('Open another reference')}
            disabled={capturePending}
            onClick={onReopen}
          />
        )}
        <Button
          small
          text={t('Save to image')}
          disabled={capturePending}
          onClick={() => void handleCapture()}
        />
        {captureFailed && (
          <Callout intent={Intent.DANGER} data-testid="image-error">
            {t('imageCaptureFailed')}
          </Callout>
        )}
        <SearchBox>
          <InputGroup
            fill
            disabled={capturePending}
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
        {onClose && (
          <Button
            icon="cross"
            minimal
            disabled={capturePending}
            onClick={onClose}
            aria-label={t('Close reference')}
          />
        )}
      </Toolbar>

      <div ref={captureRef} data-testid="reference-capture">
        <Header>
          <Title>{reference.title}</Title>
          <Tag minimal>{t('Reference is read-only')}</Tag>
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
                  renderRow(
                    { ...ship, areaColor: group.color, areaLabel: group.label },
                    `${groupIndex}-${shipIndex}`,
                    false,
                  ),
                )}
              </Group>
            ))
        ) : mode === 'list' ? (
          occurrences.map((ship, index) => renderRow(ship, `list-${index}`, true))
        ) : (
          filtered.groups
            // Same empty-group/search behavior as area mode.
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
                <CardGrid>
                  {group.ships.map((ship, shipIndex) => (
                    <ShipCard
                      key={`${groupIndex}-${shipIndex}`}
                      $color={group.color}
                      data-testid="reference-ship"
                      title={`${ship.name} Lv.${ship.level ?? '?'}`}
                    >
                      <TypeLabel>{ship.type ? t(ship.type) : t('Unknown type')}</TypeLabel>
                      <Name>{ship.name}</Name>
                      <CardMeta>Lv.{ship.level ?? '?'}</CardMeta>
                    </ShipCard>
                  ))}
                </CardGrid>
              </Group>
            ))
        )}
      </div>
    </Wrapper>
  )
}
