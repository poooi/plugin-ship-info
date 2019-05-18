import cls from 'classnames'
import { get } from 'lodash'
import path from 'path'
import React, { HTMLAttributes } from 'react'
import FontAwesome from 'react-fontawesome'
import { useTranslation, withTranslation } from 'react-i18next'
import { connect } from 'react-redux'
import { Avatar } from 'views/components/etc/avatar'
import { Tooltip } from 'views/components/etc/overlay'
import { resolveTime } from 'views/utils/tools'

import { IShip } from 'views/types'
import { sokuInterpretation, sokuStyles } from '../constants'
import { fileUrl, getTimePerHP, shipInfoShape, shipTypes } from '../utils'
import SallyArea from './sally-area'
import Slotitems from './slotitems'

interface ICellProps extends HTMLAttributes<HTMLDivElement> {
  ship: IShip
}

const enableAvatarConfigSelector = (state: any) =>
  get(state, ['config', 'poi', 'appearance', 'avatar'], true)

const Id = ({ ship, ...props }: ICellProps) => <div {...props}>{ship.id}</div>

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
    <div {...props}>
      {enableAvatar && <Avatar mstId={ship.shipId} height={35} />}
      <span className="name" title={t(ship.name)}>
        {t(ship.name)}
      </span>
      {ship.fleetId > -1 && (
        <img
          className="fleet-id-indicator"
          alt={`fleet: ${ship.fleetId + 1}`}
          src={fileUrl(
            path.resolve(
              __dirname,
              `../../assets/svg/fleet-indicator-${ship.fleetId + 1}.svg`,
            ),
          )}
        />
      )}
      <SallyArea area={ship.sallyArea} info_id={ship.id} />
    </div>
  )
}

const Type = ({ ship, ...props }: ICellProps) => {
  const { t } = useTranslation(['resources'])
  return (
    <div {...props}>
      {window.language === 'en-US'
        ? shipTypes[ship.typeId as keyof typeof shipTypes]
        : t(ship.type)}
    </div>
  )
}

const Soku = ({ ship, ...props }: ICellProps) => {
  const { soku } = ship
  const sokuString =
    sokuInterpretation[soku as keyof typeof sokuInterpretation] || 'Unknown'
  const { t } = useTranslation(['poi-plugin-ship-info'])
  return (
    <div {...props}>
      <span>{t(sokuString)}</span>
    </div>
  )
}

const Lv = ({ ship, ...props }: ICellProps) => <div {...props}>{ship.lv}</div>

const Cond = ({ ship, ...props }: ICellProps) => (
  <div {...props}>{ship.cond}</div>
)

const Hp = ({ ship, ...props }: ICellProps) => (
  <div {...props}>
    <span>
      {ship.taik[0]}
      {ship.maxhp - ship.taik[0] > 0 && <sup>+{ship.maxhp - ship.taik[0]}</sup>}
    </span>
  </div>
)

const Karyoku = ({ ship, ...props }: ICellProps) => {
  const { karyoku, karyokuMax, karyokuNow } = ship
  const karyokuString =
    karyokuNow >= karyokuMax ? 'MAX' : `+${karyokuMax - karyokuNow}`
  return (
    <div {...props}>
      <span>
        {`${karyoku}/`}
        <span style={{ fontSize: '80%' }}>{karyokuString}</span>
      </span>
    </div>
  )
}

const Raisou = ({ ship, ...props }: ICellProps) => {
  const { raisou, raisouMax, raisouNow } = ship
  const raisouString =
    raisouNow >= raisouMax ? 'MAX' : `+${raisouMax - raisouNow}`
  return (
    <div {...props}>
      <span>
        {`${raisou}/`}
        <span style={{ fontSize: '80%' }}>{raisouString}</span>
      </span>
    </div>
  )
}

const Taiku = ({ ship, ...props }: ICellProps) => {
  const { taiku, taikuMax, taikuNow } = ship
  const taikuString = taikuNow >= taikuMax ? 'MAX' : `+${taikuMax - taikuNow}`
  return (
    <div {...props}>
      <span>
        {`${taiku}/`}
        <span style={{ fontSize: '80%' }}>{taikuString}</span>
      </span>
    </div>
  )
}

const Soukou = ({ ship, ...props }: ICellProps) => {
  const { soukou, soukouMax, soukouNow } = ship
  const soukouString =
    soukouNow >= soukouMax ? 'MAX' : `+${soukouMax - soukouNow}`
  return (
    <div {...props}>
      <span>
        {`${soukou}/`}
        <span style={{ fontSize: '80%' }}>{soukouString}</span>
      </span>
    </div>
  )
}

const Lucky = ({ ship, ...props }: ICellProps) => {
  const { lucky, luckyMax, luckyNow } = ship
  const luckyString = luckyNow >= luckyMax ? 'MAX' : `+${luckyMax - luckyNow}`
  return (
    <div {...props}>
      <span>
        {`${lucky}/`}
        <span style={{ fontSize: '80%' }}>{luckyString}</span>
      </span>
    </div>
  )
}

const Kaihi = ({ ship, ...props }: ICellProps) => (
  <div {...props}>{ship.kaihi || 'NA'}</div>
)

const Taisen = ({ ship, ...props }: ICellProps) => (
  <div {...props}>
    <span>
      {ship.taisen}
      {ship.kyouka[6] > 0 && <sup>+{ship.kyouka[6]}</sup>}
    </span>
  </div>
)

const Sakuteki = ({ ship, ...props }: ICellProps) => (
  <div {...props}>{ship.sakuteki}</div>
)

const RepairTime = ({ ship, ...props }: ICellProps) => {
  const { nowhp, maxhp, repairtime, lv, typeId, inDock } = ship

  return (
    <div {...props}>
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
    </div>
  )
}

const Equipment = ({ ship, ...props }: ICellProps) => (
  <div {...props}>
    <Slotitems slot={ship.slot} exslot={ship.exslot} />
  </div>
)

const Lock = ({ ship, ...props }: ICellProps) => (
  <div {...props}>{ship.locked === 1 ? <FontAwesome name="lock" /> : ' '}</div>
)

export default {
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
