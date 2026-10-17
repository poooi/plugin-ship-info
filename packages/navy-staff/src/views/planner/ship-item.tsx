import { get } from 'lodash'
import { rgba } from 'polished'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { connect } from 'react-redux'
import styled from 'styled-components'
import { getShipImgPath } from 'views/utils/ship-img'
import type { IState } from 'views/utils/selectors'

import type { WorkspaceShipRow } from '../workspace/selectors'

const ShipAvatar = styled.img.attrs<{ left: number }>(({ left }) => ({
  style: {
    left: `-${left}px`,
  },
}))<{ left: number }>`
  height: 40px;
  position: absolute;
  top: 0px;
`

const Gradient = styled.div`
  height: 40px;
  width: 100%;
  position: absolute;
  top: 0px;
  left: 0px;
`

const ShipGridCell = styled.div.attrs({
  role: 'button',
  tabIndex: 0,
})<{ color: string; useAvatar: boolean }>`
  width: calc(100% / 7 - 4px);
  min-width: 6em;
  max-width: 16em;
  margin: 2px;
  background-color: rgba(255, 255, 255, 0.1);
  text-align: right;
  background-size: auto 40px;
  background-repeat: no-repeat;
  height: 40px;
  position: relative;
  overflow: hidden;

  @media (min-width: 1440px) {
    width: calc(100% / 10 - 4px);
  }

  ${ShipAvatar} {
    z-index: 0;
  }

  ${Gradient} {
    z-index: 0;
    background: ${(props) =>
      `linear-gradient(to right, transparent, ${rgba(
        props.color,
        props.useAvatar ? 0.5 : 0.75,
      )})`};
  }

  &:hover {
    ${ShipAvatar} {
      z-index: 5;
    }
  }
`

const Text = styled.div`
  z-index: 10;
  position: absolute;
  right: 0;
  width: 100%;
  overflow: hidden;
`

const ShipName = styled.div`
  font-weight: 600;
  display: inline-block;
  padding: 0 1ex;
  color: white;
  user-select: none;
  max-width: 75%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const ShipLevel = styled.div`
  display: inline-block;
  line-height: 1em;
  padding: 0 1ex;
  color: white;
  user-select: none;
`

interface IProps {
  row: WorkspaceShipRow
  color: string
  useAvatar: boolean
  ip: string
  onClick?: () => void
  onContextmenu?: () => void
}

const ShipItemBase = ({
  row,
  color,
  useAvatar,
  ip,
  onClick,
  onContextmenu,
}: IProps) => {
  const { t } = useTranslation(['poi-plugin-navy-staff', 'resources'])
  const name = row.live
    ? t(row.name ?? '', { ns: 'resources' })
    : row.name ?? `#${row.ownedId}`
  // A known master id is required to load artwork. An unknown master must not
  // borrow another ship's image.
  const imageMasterId = row.masterId

  return (
    <ShipGridCell
      aria-label={`${name} Lv.${row.level ?? '?'}`}
      color={color}
      useAvatar={useAvatar}
      onClick={onClick}
      onContextMenu={onContextmenu}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onClick()
              }
            }
          : undefined
      }
    >
      {useAvatar && imageMasterId !== null && (
        <ShipAvatar
          src={getShipImgPath(imageMasterId, 'remodel', false, ip)}
          left={Math.round((row.avatarOffset ?? 0.555) * 40)}
        />
      )}
      <Gradient />
      <Text>
        <ShipLevel>Lv.{row.level ?? '?'}</ShipLevel>
        <br />
        <ShipName>{name}</ShipName>
      </Text>
    </ShipGridCell>
  )
}

export const ShipItem = connect((state: IState) => ({
  ip: get(state, 'info.server.ip', '203.104.209.71'),
  useAvatar: get(state, ['config', 'poi', 'appearance', 'avatar'], true),
}))(ShipItemBase)
