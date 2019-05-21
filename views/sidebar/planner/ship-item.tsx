import { Dictionary, get } from 'lodash'
import { rgba } from 'polished'
import React from 'react'
import FA from 'react-fontawesome'
import { useTranslation } from 'react-i18next'
import { connect, DispatchProp } from 'react-redux'
import styled from 'styled-components'
import { getShipImgPath } from 'views/utils/ship-img'

import { deckPlannerShipMapSelector, IShipInfoMenuData } from '../../selectors'

const ShipAvatar = styled.img.attrs<{ left: number }>(({ left }) => ({
  style: {
    left: `-${left}px`,
  },
}))<{ left: number }>`
  height: 40px;
  position: absolute;
  top: 0px;
  transition: 0.2s;
`

const Gradient = styled.div`
  height: 40px;
  width: 100%;
  position: absolute;
  top: 0px;
  left: 0px;
  transition: 0.3s;
`

const ShipGridCell = styled.div.attrs({
  role: 'button',
  tabIndex: 0,
})<{ color: string; useAvatar: boolean }>`
  width: calc(100% / 7 - 4px);
  min-width: 6em;
  max-width: 16em;
  transition: 0.2s;
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
    transition: 0.3s;
  }

  ${Gradient} {
    z-index: 0;
    transition: 0.3s;
    background: ${props =>
      props.useAvatar
        ? `linear-gradient(90deg, rgba(0, 0, 0, 0), ${rgba(props.color, 0.75)})`
        : rgba(props.color, 0.75)};
  }

  &:hover {
    ${Gradient} {
      transition: 0.3s;
      background: ${props =>
        props.useAvatar
          ? `linear-gradient(
            90deg, rgba(0, 0, 0, 0),
            ${rgba(props.color, 0.85)}
          )`
          : rgba(props.color, 0.85)};
    }
  }

  &:hover ${ShipAvatar} {
    z-index: 5;
    transition: 0.3s;
  }
}
`

const Text = styled.div`
  z-index: 10;
  position: absolute;
  right: 0;
`

const ShipName = styled.div`
  font-weight: 600;
  display: inline-block;
  padding: 0 1ex;
  color: white;
`

const ShipLevel = styled.div`
  display: inline-block;
  line-height: 1em;
  padding: 0 1ex;
  color: white;
`

interface IProps extends DispatchProp {
  planMap: Dictionary<number>
  color: string[]
  onClick: () => void
  onContextmenu: () => void
  ip: string
  useAvatar: boolean
  ship: IShipInfoMenuData
}

export const ShipItem = connect(state => ({
  color: get(state, 'fcd.shiptag.color', []),
  ip: get(state, 'info.server.ip', '203.104.209.71'),
  mapname: get(state, 'fcd.shiptag.mapname', []),
  planMap: deckPlannerShipMapSelector(state),
  useAvatar: get(state, ['config', 'poi', 'appearance', 'avatar'], true),
}))(
  ({ ship, planMap, color, onClick, onContextmenu, ip, useAvatar }: IProps) => {
    const { t } = useTranslation('resources')

    const bgColor = color[ship.area! - 1] || color[planMap[ship.id]] || '#000'

    return (
      <ShipGridCell
        color={bgColor}
        useAvatar={useAvatar}
        onClick={!(ship.area! > 0) ? onClick : undefined}
        onContextMenu={!(ship.area! > 0) ? onContextmenu : undefined}
      >
        {useAvatar && (
          <ShipAvatar
            src={getShipImgPath(ship.shipId, 'remodel', false, ip)}
            left={Math.round(ship.avatarOffset! * 40)}
          />
        )}
        <Gradient />
        <Text>
          <ShipLevel>Lv.{ship.lv}</ShipLevel>
          <br />
          <ShipName>
            {t(ship.name)}
            {ship.area! > 0 && (
              <>
                {' '}
                <FA name="tag" />
              </>
            )}
          </ShipName>
        </Text>
      </ShipGridCell>
    )
  },
)
