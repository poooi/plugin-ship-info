import { get } from 'lodash'
import { rgba } from 'polished'
import React, { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { connect } from 'react-redux'
import styled from 'styled-components'
import { getShipImgPath } from 'views/utils/ship-img'
import type { IState } from 'views/utils/selectors'

import { controlSurface } from '@poi-plugins/ship-info-shared/ui/styles'
import type { WorkspaceShipRow } from '../workspace/selectors'
import { ActualSortieTag } from './actual-sortie-tag'
import { FleetBadge } from './fleet-badge'

// A single card in the ship grid. The card sizes itself from the grid track
// (container-driven, see ship-grid.tsx), not from the browser viewport.
//
// Assignment is shown as a 4px colour edge plus a subtle tint on a neutral poi
// surface, so the plan survives both themes without a saturated colour wash.
//
// Two compositions:
//  - text-only: left-aligned name + level on the first row, a visible assigned
//    area (or Unassigned) on a subdued second row;
//  - portrait: the artwork stays on the left; a compact, right-aligned text
//    block carries name/level/assignment over a small dark backing that never
//    covers the whole portrait.
const CARD_HEIGHT = 58
const EDGE = 4

const ShipAvatar = styled.img.attrs<{ left: number }>(({ left }) => ({
  style: {
    left: `-${left}px`,
  },
}))<{ left: number }>`
  height: ${CARD_HEIGHT}px;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 0;
`

const Tint = styled.div<{ $color: string }>`
  position: absolute;
  inset: 0;
  background: ${(props) => rgba(props.$color, 0.12)};
  z-index: 1;
`

const Scrim = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(to right, transparent 30%, rgba(0, 0, 0, 0.55) 72%);
  z-index: 2;
`

// A read-only card is not a control: it must not be a tab stop or expose a
// button role. Editable cards keep button semantics and keyboard activation;
// read-only cards are a labelled group (no list parent required). The hover
// affordance appears on editable cards only.
const ShipGridCell = styled.div.attrs<{ $interactive: boolean }>((props) => ({
  role: props.$interactive ? 'button' : 'group',
  tabIndex: props.$interactive ? 0 : undefined,
}))<{ $edge: string; $interactive: boolean }>`
  position: relative;
  overflow: hidden;
  height: ${CARD_HEIGHT}px;
  min-width: 0;
  border-radius: 4px;
  border-left: ${EDGE}px solid ${(props) => props.$edge};
  cursor: ${(props) => (props.$interactive ? 'pointer' : 'default')};
  ${(props) =>
    controlSurface(
      'rest',
      props.theme.variant === 'dark'
        ? props.theme.DARK_GRAY3
        : props.theme.LIGHT_GRAY3,
    )};

  &:focus-visible {
    outline: 2px solid ${(props) => props.theme.COBALT3};
    outline-offset: -2px;
  }

  ${(props) =>
    props.$interactive &&
    `
      transition: box-shadow 120ms ease, background-color 120ms ease;
      &:hover {
        box-shadow: inset 0 0 0 1px ${props.theme.COBALT3};
      }
    `}
`

const Text = styled.div<{ $portrait: boolean }>`
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  pointer-events: none;
  color: ${(props) =>
    props.$portrait
      ? '#fff'
      : props.theme.variant === 'dark'
        ? props.theme.LIGHT_GRAY5
        : props.theme.DARK_GRAY1};

  ${(props) =>
    props.$portrait
      ? `
        left: auto;
        right: 0;
        top: 50%;
        bottom: auto;
        width: auto;
        max-width: 74%;
        transform: translateY(-50%);
        align-items: flex-end;
        text-align: right;
        padding: 3px 7px;
        background: rgba(0, 0, 0, 0.55);
        border-radius: 4px 0 0 4px;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.85);
      `
      : `
        align-items: stretch;
        text-align: left;
        padding: 4px 8px 4px 7px;
      `}
`

const NameRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
  width: 100%;
`

const ShipName = styled.span`
  flex: 1 1 auto;
  min-width: 0;
  font-weight: 600;
  font-size: 14px;
  line-height: 1.15;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  user-select: none;
`

const ShipLevel = styled.span`
  flex: none;
  font-size: 12px;
  line-height: 1.15;
  opacity: 0.8;
  font-variant-numeric: tabular-nums;
  user-select: none;
`

const AreaLabel = styled.span<{ $portrait: boolean }>`
  display: block;
  max-width: 100%;
  font-size: 12px;
  line-height: 1.15;
  opacity: ${(props) => (props.$portrait ? 0.92 : 0.72)};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  user-select: none;
`

interface IProps {
  row: WorkspaceShipRow
  color: string
  useAvatar: boolean
  ip: string
  /** Assigned area label resolved by the grid, or null when unassigned. */
  areaLabel?: string | null
  /** True to prefer translated fleet labels for the live sortie tag. */
  translated: boolean
  onClick?: () => void
  onContextmenu?: () => void
}

const ShipItemBase = ({
  row,
  color,
  useAvatar,
  ip,
  areaLabel,
  translated,
  onClick,
  onContextmenu,
}: IProps) => {
  const { t } = useTranslation(['poi-plugin-navy-staff', 'resources'])
  const descriptionId = useId()
  const actualTagId = useId()
  const name = row.live
    ? t(row.name ?? '', { ns: 'resources' })
    : row.name ?? `#${row.ownedId}`
  // A known master id is required to load artwork. An unknown master must not
  // borrow another ship's image.
  const imageMasterId = row.masterId
  const portrait = useAvatar && imageMasterId !== null
  const assignment = areaLabel ?? t('Unassigned')
  const hasFleet = row.fleetId >= 0 && row.fleetId < 4
  const hasActualTag = row.actualTag !== null && row.actualTag >= 1
  const describedBy = [
    descriptionId,
    hasFleet ? `${descriptionId}-fleet` : null,
    hasActualTag ? actualTagId : null,
  ]
    .filter((id): id is string => id !== null)
    .join(' ')
  const interactive = Boolean(onClick || onContextmenu)

  return (
    <ShipGridCell
      $edge={color}
      $interactive={interactive}
      aria-label={`${name} Lv.${row.level ?? '?'}`}
      aria-describedby={describedBy}
      title={`${name} Lv.${row.level ?? '?'} · ${assignment}`}
      onClick={onClick}
      onContextMenu={onContextmenu}
      onKeyDown={
        interactive
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onClick?.()
              }
            }
          : undefined
      }
    >
      {portrait && imageMasterId !== null && (
        <ShipAvatar
          src={getShipImgPath(imageMasterId, 'remodel', false, ip)}
          left={Math.round((row.avatarOffset ?? 0.555) * CARD_HEIGHT)}
        />
      )}
      <Tint $color={color} />
      {portrait && <Scrim />}
      <Text $portrait={portrait}>
        <NameRow>
          <FleetBadge fleetId={row.fleetId} />
          <ShipName>{name}</ShipName>
          <ShipLevel>Lv.{row.level ?? '?'}</ShipLevel>
        </NameRow>
        <AreaLabel $portrait={portrait} id={descriptionId}>
          {assignment}
        </AreaLabel>
        <ActualSortieTag actualTag={row.actualTag} translated={translated} id={actualTagId} />
        {hasFleet && (
          <span id={`${descriptionId}-fleet`} hidden>
            {t('Fleet {{number}}', { number: row.fleetId + 1 })}
          </span>
        )}
      </Text>
    </ShipGridCell>
  )
}

export const ShipItem = connect((state: IState) => ({
  ip: get(state, 'info.server.ip', '203.104.209.71'),
  useAvatar: get(state, ['config', 'poi', 'appearance', 'avatar'], true),
}))(ShipItemBase)
