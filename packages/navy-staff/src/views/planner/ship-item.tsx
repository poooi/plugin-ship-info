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

// A single card in the ship grid. The card sizes itself from the grid track
// (container-driven, see ship-grid.tsx), not from the browser viewport, so a
// narrow poi panel never gets columns too cramped to read.
//
// Assignment is shown as a 4px colour edge plus a subtle tint on a neutral poi
// surface, so the plan survives both themes without a saturated colour wash.
// Portraits keep the artwork on the left and read over a neutral dark scrim;
// without portraits the text uses the theme's foreground colour.
const CARD_HEIGHT = 54
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
  background: linear-gradient(to right, transparent 26%, rgba(0, 0, 0, 0.72) 78%);
  z-index: 2;
`

// A read-only card is not a control: it must not be a tab stop or expose a
// button role. Editable cards keep button semantics and keyboard activation;
// read-only cards are a labelled group (no list parent is required).
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
  text-align: right;

  &:focus-visible {
    outline: 2px solid ${(props) => props.theme.COBALT3};
    outline-offset: -2px;
  }
`

// Portrait mode gives the text a compact dark backing so a bright portrait
// never washes out long names; text-only mode keeps theme-coloured text on the
// neutral card surface with no backing.
const Text = styled.div<{ $portrait: boolean }>`
  position: absolute;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1px;
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
        right: 0;
        top: 50%;
        transform: translateY(-50%);
        max-width: 100%;
        padding: 2px 6px;
        background: rgba(0, 0, 0, 0.6);
        border-radius: 4px 0 0 4px;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
      `
      : `
        inset: 0;
        justify-content: center;
        padding: 0 8px 0 4px;
      `}
`

const ShipName = styled.div`
  width: 100%;
  max-width: 100%;
  font-weight: 600;
  font-size: 14px;
  line-height: 1.15;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  user-select: none;
`

const ShipLevel = styled.div`
  font-size: 12px;
  line-height: 1;
  opacity: 0.85;
  font-variant-numeric: tabular-nums;
  user-select: none;
`

const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
`

interface IProps {
  row: WorkspaceShipRow
  color: string
  useAvatar: boolean
  ip: string
  /** Assigned area label resolved by the grid, or null when unassigned. */
  areaLabel?: string | null
  onClick?: () => void
  onContextmenu?: () => void
}

const ShipItemBase = ({
  row,
  color,
  useAvatar,
  ip,
  areaLabel,
  onClick,
  onContextmenu,
}: IProps) => {
  const { t } = useTranslation(['poi-plugin-navy-staff', 'resources'])
  const descriptionId = useId()
  const name = row.live
    ? t(row.name ?? '', { ns: 'resources' })
    : row.name ?? `#${row.ownedId}`
  // A known master id is required to load artwork. An unknown master must not
  // borrow another ship's image.
  const imageMasterId = row.masterId
  const portrait = useAvatar && imageMasterId !== null
  const assignment = areaLabel ?? t('Unassigned')
  const interactive = Boolean(onClick || onContextmenu)

  return (
    <ShipGridCell
      $edge={color}
      $interactive={interactive}
      aria-label={`${name} Lv.${row.level ?? '?'}`}
      aria-describedby={descriptionId}
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
        <ShipName>{name}</ShipName>
        <ShipLevel>Lv.{row.level ?? '?'}</ShipLevel>
        <VisuallyHidden id={descriptionId}>{assignment}</VisuallyHidden>
      </Text>
    </ShipGridCell>
  )
}

export const ShipItem = connect((state: IState) => ({
  ip: get(state, 'info.server.ip', '203.104.209.71'),
  useAvatar: get(state, ['config', 'poi', 'appearance', 'avatar'], true),
}))(ShipItemBase)
