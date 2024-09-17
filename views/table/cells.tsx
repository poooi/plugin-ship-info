import { get } from 'lodash'
import path from 'path'
import React, { HTMLAttributes } from 'react'
import FontAwesome from 'react-fontawesome'
import { useTranslation } from 'react-i18next'
import { connect } from 'react-redux'
import styled from 'styled-components'
import { Avatar } from 'views/components/etc/avatar'
import { Tooltip } from 'views/components/etc/overlay'
import { resolveTime } from 'views/utils/tools'

import { rgba } from 'polished'
import { IShip } from 'views/types'
import { sokuInterpretation } from '../constants'
import { fileUrl, getShipCode, getTimePerHP } from '../utils'
import { SallyArea } from './sally-area'
import { Slotitems } from './slotitems'

const TRANSPARENCY = 0.5

export const Cell = styled.div<{ isEven?: boolean }>`
  white-space: nowrap;
  line-height: 35px;
  vertical-align: middle;
  overflow: visible;
  text-overflow: ellipsis;
  cursor: default;
  display: flex;
  align-items: center;
  background-color: ${props => props.isEven && rgba(props.theme.BLUE5, 0.05)};
`

interface ICellProps extends HTMLAttributes<HTMLDivElement> {
  ship: IShip
}

const enableAvatarConfigSelector = (state: any) =>
  get(state, ['config', 'poi', 'appearance', 'avatar'], true)

const Id = ({ ship, ...props }: ICellProps) => <Cell {...props}>{ship.id}</Cell>

const Name = ({
  ship,
  enableAvatar,
  ...props
}: {
  ship: IShip
  enableAvatar: boolean
}) => {
  const { t } = useTranslation(['resources'])

  return (
    <Cell {...props}>
      {enableAvatar && <Avatar mstId={ship.shipId} height={35} />}
      <span title={ship.name}>{t(ship.name)}</span>
      {ship.fleetId > -1 && (
        <img
          alt={`fleet: ${ship.fleetId + 1}`}
          height={16}
          src={fileUrl(
            path.resolve(
              __dirname,
              `../../assets/images/fleet/${ship.fleetId + 1}.png`,
            ),
          )}
        />
      )}
      <SallyArea area={ship.sallyArea} info_id={ship.id} />
    </Cell>
  )
}

const Type = ({ ship, ...props }: ICellProps) => (
  <Cell {...props}>{getShipCode(ship)}</Cell>
)

const Soku = ({ ship, ...props }: ICellProps) => {
  const { soku } = ship
  const sokuString =
    sokuInterpretation[soku as keyof typeof sokuInterpretation] || 'Unknown'
  const { t } = useTranslation(['poi-plugin-ship-info'])
  return (
    <Cell {...props}>
      <span>{t(sokuString)}</span>
    </Cell>
  )
}

const Lv = ({ ship, ...props }: ICellProps) => <Cell {...props}>{ship.lv}</Cell>

const Cond = ({ ship, ...props }: ICellProps) => (
  <Cell {...props}>{ship.cond}</Cell>
)

const Hp = ({ ship, ...props }: ICellProps) => (
  <Cell {...props}>
    <span>
      {ship.taik[0]}
      {ship.maxhp - ship.taik[0] > 0 && <sup>+{ship.maxhp - ship.taik[0]}</sup>}
    </span>
  </Cell>
)

const KaryokuCell = styled(Cell)<{ max: boolean }>`
  background-color: ${props =>
    props.max && rgba(props.theme.RED3, TRANSPARENCY)};
`

const Karyoku = ({ ship, ...props }: ICellProps) => {
  const { karyoku, karyokuMax, karyokuNow } = ship
  const karyokuString =
    karyokuNow >= karyokuMax ? 'MAX' : `+${karyokuMax - karyokuNow}`
  return (
    <KaryokuCell {...props} max={karyokuNow >= karyokuMax}>
      <span>
        {`${karyoku}/`}
        <span style={{ fontSize: '80%' }}>{karyokuString}</span>
      </span>
    </KaryokuCell>
  )
}

const RaisouCell = styled(Cell)<{ max: boolean }>`
  background-color: ${props =>
    props.max && rgba(props.theme.COBALT3, TRANSPARENCY)};
`

const Raisou = ({ ship, ...props }: ICellProps) => {
  const { raisou, raisouMax, raisouNow } = ship
  const raisouString =
    raisouNow >= raisouMax ? 'MAX' : `+${raisouMax - raisouNow}`
  return (
    <RaisouCell {...props} max={raisouNow >= raisouMax}>
      <span>
        {`${raisou}/`}
        <span style={{ fontSize: '80%' }}>{raisouString}</span>
      </span>
    </RaisouCell>
  )
}

const TaikuCell = styled(Cell)<{ max: boolean }>`
  background-color: ${props =>
    props.max && rgba(props.theme.ORANGE3, TRANSPARENCY)};
`

const Taiku = ({ ship, ...props }: ICellProps) => {
  const { taiku, taikuMax, taikuNow } = ship
  const taikuString = taikuNow >= taikuMax ? 'MAX' : `+${taikuMax - taikuNow}`
  return (
    <TaikuCell {...props} max={taikuNow >= taikuMax}>
      <span>
        {`${taiku}/`}
        <span style={{ fontSize: '80%' }}>{taikuString}</span>
      </span>
    </TaikuCell>
  )
}

const SoukouCell = styled(Cell)<{ max: boolean }>`
  background-color: ${props =>
    props.max && rgba(props.theme.INDIGO3, TRANSPARENCY)};
`

const Soukou = ({ ship, ...props }: ICellProps) => {
  const { soukou, soukouMax, soukouNow } = ship
  const soukouString =
    soukouNow >= soukouMax ? 'MAX' : `+${soukouMax - soukouNow}`
  return (
    <SoukouCell {...props} max={soukouNow >= soukouMax}>
      <span>
        {`${soukou}/`}
        <span style={{ fontSize: '80%' }}>{soukouString}</span>
      </span>
    </SoukouCell>
  )
}

const LuckyCell = styled(Cell)<{ max: boolean }>`
  background-color: ${props =>
    props.max && rgba(props.theme.LIME3, TRANSPARENCY)};
`

const Lucky = ({ ship, ...props }: ICellProps) => {
  const { lucky, luckyMax, luckyNow } = ship
  const luckyString = luckyNow >= luckyMax ? 'MAX' : `+${luckyMax - luckyNow}`
  return (
    <LuckyCell {...props} max={luckyNow >= luckyMax}>
      <span>
        {`${lucky}/`}
        <span style={{ fontSize: '80%' }}>{luckyString}</span>
      </span>
    </LuckyCell>
  )
}

const Kaihi = ({ ship, ...props }: ICellProps) => (
  <Cell {...props}>{ship.kaihi || 'NA'}</Cell>
)

const Taisen = ({ ship, ...props }: ICellProps) => (
  <Cell {...props}>
    <span>
      {ship.taisen}
      {ship.kyouka[6] > 0 && <sup>+{ship.kyouka[6]}</sup>}
    </span>
  </Cell>
)

const Sakuteki = ({ ship, ...props }: ICellProps) => (
  <Cell {...props}>{ship.sakuteki}</Cell>
)

const RepairTime = ({ ship, ...props }: ICellProps) => {
  const { nowhp, maxhp, repairtime, lv, typeId, inDock } = ship

  return (
    <Cell {...props}>
      {repairtime && (
        <Tooltip
          content={`1HP : ${resolveTime(getTimePerHP(lv, typeId) / 1000)}`}
        >
          <span>
            {inDock && <FontAwesome name="bath" />}
            {resolveTime(repairtime)}
          </span>
        </Tooltip>
      )}
    </Cell>
  )
}

const Equipment = ({ ship, ...props }: ICellProps) => (
  <Cell {...props}>
    <Slotitems slot={ship.slot} exslot={ship.exslot} />
  </Cell>
)

const Lock = ({ ship, ...props }: ICellProps) => (
  <Cell {...props}>
    {ship.locked === 1 ? <FontAwesome name="lock" /> : ' '}
  </Cell>
)

export const Cells = {
  cond: Cond,
  equipment: Equipment,
  hp: Hp,
  id: Id,
  kaihi: Kaihi,
  karyoku: Karyoku,
  lock: Lock,
  lucky: Lucky,
  lv: Lv,
  name: connect(state => ({ enableAvatar: enableAvatarConfigSelector(state) }))(
    Name,
  ),
  raisou: Raisou,
  repairtime: RepairTime,
  sakuteki: Sakuteki,
  soku: Soku,
  soukou: Soukou,
  taiku: Taiku,
  taisen: Taisen,
  type: Type,
}
