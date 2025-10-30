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

import { APIShip } from 'kcsapi/api_port/port/response'
import { APIMstShip, APIMstSlotitem } from 'kcsapi/api_start2/getData/response'
import { APISlotItem } from 'kcsapi/api_get_member/require_info/response'
import { rgba } from 'polished'
import { sokuInterpretation } from '../constants'
import {
  fileUrl,
  getTimePerHP,
  shipTypes,
  computeKaryokuNow,
  computeRaisouNow,
  computeTaikuNow,
  computeSoukouNow,
  computeLuckyNow,
  getValueByLevel,
} from '../utils'
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
  background-color: ${(props) => props.isEven && rgba(props.theme.BLUE5, 0.05)};
`

// Type for raw ship data
interface IShipRawData {
  ship: APIShip
  $ship: APIMstShip
  equips: { [key: string]: APISlotItem }
  $shipTypes: { [key: string]: APIMstSlotitem }
  fleetIdMap: { [key: string]: number }
  rawValue: boolean
  repairs: number[]
  db: any
}

interface ICellProps extends HTMLAttributes<HTMLDivElement> {
  shipData: IShipRawData
}

const enableAvatarConfigSelector = (state: any) =>
  get(state, ['config', 'poi', 'appearance', 'avatar'], true)

const Id = ({ shipData, ...props }: ICellProps) => (
  <Cell {...props}>{shipData.ship.api_id}</Cell>
)

const Name = ({
  shipData,
  enableAvatar,
  ...props
}: {
  shipData: IShipRawData
  enableAvatar: boolean
}) => {
  const { t } = useTranslation(['resources'])
  const { ship, $ship, fleetIdMap } = shipData
  const fleetId = fleetIdMap[ship.api_id]

  return (
    <Cell {...props}>
      {enableAvatar && <Avatar mstId={$ship.api_id} height={35} />}
      <span title={t($ship.api_name)}>{t($ship.api_name)}</span>
      {fleetId > -1 && (
        <img
          alt={`fleet: ${fleetId + 1}`}
          height={16}
          src={fileUrl(
            path.resolve(
              __dirname,
              `../../assets/images/fleet/${fleetId + 1}.png`,
            ),
          )}
        />
      )}
      <SallyArea area={ship.api_sally_area || 0} info_id={ship.api_id} />
    </Cell>
  )
}

const Type = ({ shipData, ...props }: ICellProps) => {
  const { t } = useTranslation(['resources'])
  const { $ship, $shipTypes } = shipData
  const type = ($shipTypes[$ship.api_stype] || {}).api_name

  return (
    <Cell {...props}>
      {window.language === 'en-US'
        ? shipTypes[$ship.api_stype as keyof typeof shipTypes]
        : t(type)}
    </Cell>
  )
}

const Soku = ({ shipData, ...props }: ICellProps) => {
  const soku = shipData.ship.api_soku
  const sokuString =
    sokuInterpretation[soku as keyof typeof sokuInterpretation] || 'Unknown'
  const { t } = useTranslation(['poi-plugin-ship-info'])
  return (
    <Cell {...props}>
      <span>{t(sokuString)}</span>
    </Cell>
  )
}

const Lv = ({ shipData, ...props }: ICellProps) => (
  <Cell {...props}>{shipData.ship.api_lv}</Cell>
)

const Cond = ({ shipData, ...props }: ICellProps) => (
  <Cell {...props}>{shipData.ship.api_cond}</Cell>
)

const Hp = ({ shipData, ...props }: ICellProps) => {
  const { ship, $ship } = shipData
  const taik = $ship.api_taik![0]
  const maxhp = ship.api_maxhp

  return (
    <Cell {...props}>
      <span>
        {taik}
        {maxhp - taik > 0 && <sup>+{maxhp - taik}</sup>}
      </span>
    </Cell>
  )
}

const KaryokuCell = styled(Cell)<{ max: boolean }>`
  background-color: ${(props) =>
    props.max && rgba(props.theme.RED3, TRANSPARENCY)};
`

const Karyoku = ({ shipData, ...props }: ICellProps) => {
  const { ship, $ship, rawValue } = shipData
  const karyokuNow = computeKaryokuNow(ship, $ship)
  const karyokuMax = ship.api_karyoku[1]
  const karyoku = rawValue ? karyokuNow : ship.api_karyoku[0]
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
  background-color: ${(props) =>
    props.max && rgba(props.theme.COBALT3, TRANSPARENCY)};
`

const Raisou = ({ shipData, ...props }: ICellProps) => {
  const { ship, $ship, rawValue } = shipData
  const raisouNow = computeRaisouNow(ship, $ship)
  const raisouMax = ship.api_raisou[1]
  const raisou = rawValue ? raisouNow : ship.api_raisou[0]
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
  background-color: ${(props) =>
    props.max && rgba(props.theme.ORANGE3, TRANSPARENCY)};
`

const Taiku = ({ shipData, ...props }: ICellProps) => {
  const { ship, $ship, rawValue } = shipData
  const taikuNow = computeTaikuNow(ship, $ship)
  const taikuMax = ship.api_taiku[1]
  const taiku = rawValue ? taikuNow : ship.api_taiku[0]
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
  background-color: ${(props) =>
    props.max && rgba(props.theme.INDIGO3, TRANSPARENCY)};
`

const Soukou = ({ shipData, ...props }: ICellProps) => {
  const { ship, $ship, rawValue } = shipData
  const soukouNow = computeSoukouNow(ship, $ship)
  const soukouMax = ship.api_soukou[1]
  const soukou = rawValue ? soukouNow : ship.api_soukou[0]
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
  background-color: ${(props) =>
    props.max && rgba(props.theme.LIME3, TRANSPARENCY)};
`

const Lucky = ({ shipData, ...props }: ICellProps) => {
  const { ship, $ship, rawValue } = shipData
  const luckyNow = computeLuckyNow(ship, $ship)
  const luckyMax = ship.api_lucky[1]
  const lucky = rawValue ? luckyNow : ship.api_lucky[0]
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

const Kaihi = ({ shipData, ...props }: ICellProps) => {
  const { ship, $ship, rawValue, db } = shipData
  let kaihi = ship.api_kaihi[0]

  if (rawValue) {
    kaihi = getValueByLevel(
      get(db, ['ships', $ship.api_id, 'stat', 'evasion'], 0),
      get(db, ['ships', $ship.api_id, 'stat', 'evasion_max'], 0),
      ship.api_lv,
    )
  }

  return <Cell {...props}>{kaihi || 'NA'}</Cell>
}

const Taisen = ({ shipData, ...props }: ICellProps) => {
  const { ship, $ship, rawValue, db } = shipData
  let taisen = ship.api_taisen[0]

  if (rawValue) {
    taisen = getValueByLevel(
      get(db, ['ships', $ship.api_id, 'stat', 'asw'], 0),
      get(db, ['ships', $ship.api_id, 'stat', 'asw_max'], 0),
      ship.api_lv,
    )
  }

  return (
    <Cell {...props}>
      <span>
        {taisen}
        {ship.api_kyouka[6] > 0 && <sup>+{ship.api_kyouka[6]}</sup>}
      </span>
    </Cell>
  )
}

const Sakuteki = ({ shipData, ...props }: ICellProps) => {
  const { ship, $ship, rawValue, db } = shipData
  let sakuteki = ship.api_sakuteki[0]

  if (rawValue) {
    sakuteki = getValueByLevel(
      get(db, ['ships', $ship.api_id, 'stat', 'los'], 0),
      get(db, ['ships', $ship.api_id, 'stat', 'los_max'], 0),
      ship.api_lv,
    )
  }

  return <Cell {...props}>{sakuteki}</Cell>
}

const RepairTime = ({ shipData, ...props }: ICellProps) => {
  const { ship, $ship, repairs } = shipData
  const repairtime = Math.floor(ship.api_ndock_time / 1000.0)
  const inDock = repairs.includes(ship.api_id)

  return (
    <Cell {...props}>
      {repairtime > 0 && (
        <Tooltip
          content={`1HP : ${resolveTime(
            getTimePerHP(ship.api_lv, $ship.api_stype) / 1000,
          )}`}
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

const Equipment = ({ shipData, ...props }: ICellProps) => {
  const { ship } = shipData
  return (
    <Cell {...props}>
      <Slotitems slot={ship.api_slot} exslot={ship.api_slot_ex} />
    </Cell>
  )
}

const Lock = ({ shipData, ...props }: ICellProps) => (
  <Cell {...props}>
    {shipData.ship.api_locked === 1 ? <FontAwesome name="lock" /> : ' '}
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
  name: connect((state) => ({
    enableAvatar: enableAvatarConfigSelector(state),
  }))(Name),
  raisou: Raisou,
  repairtime: RepairTime,
  sakuteki: Sakuteki,
  soku: Soku,
  soukou: Soukou,
  taiku: Taiku,
  taisen: Taisen,
  type: Type,
}

// Export the IShipRawData type for use in other files
export type { IShipRawData }
