import React from 'react'
import { OverlayTrigger, Tooltip } from 'react-bootstrap'
import FontAwesome from 'react-fontawesome'

import Slotitems from './slotitems'
import SallyArea from './sally-area'
import { sokuInterpretation, sokuStyles } from '../constants'
import { getTimePerHP } from './utils'

const { __, resolveTime } = window

const Cell = ({ className, style, children, ...props }) => (
  <div
    {...props}
    style={{
      ...style,
      paddingLeft: '1ex',
      paddingRight: '1ex',
      whiteSpace: 'nowrap',
    }}
    className={`ship-info-cell ${className}`}
  >
    { children }
  </div>
)

const Id = ({ ship, style, ...props }) => (
  <Cell
    {...props}
    style={style}
  >
    { ship.id }
  </Cell>
)

const Name = ({ ship, style, ...props }) => (
  <Cell
    {...props}
    className="ship-name"
    style={style}
  >
    <span>
      {window.i18n.resources.__(ship.name)}
      <SallyArea area={ship.sallyArea} info_id={ship.id} />
      {
        ship.fleetId > -1 &&
        <span className="fleet-id-indicator">
          {`/${ship.fleetId + 1}`}
        </span>
      }
    </span>
  </Cell>
)

const Type = ({ ship, style, ...props }) => (
  <Cell
    {...props}
    style={style}
  >
    { window.i18n.resources.__(ship.type) }
  </Cell>
)

const Soku = ({ className, ship, style, ...props }) => {
  const { soku } = ship
  const sokuString = sokuInterpretation[soku] || 'Unknown'
  const sokuClass = sokuStyles[soku] || {}
  return (
    <Cell
      {...props}
      className={`${className} ${sokuClass}`}
      style={style}
    >
      <span>{__(sokuString)}</span>
    </Cell>
  )
}

const Lv = ({ ship, style, ...props }) => (
  <Cell
    {...props}
    style={style}
  >
    { ship.lv }
  </Cell>
)

const Cond = ({ ship, style, ...props }) => (
  <Cell
    {...props}
    style={style}
  >
    { ship.cond }
  </Cell>
)

const Karyoku = ({ className, ship, style, ...props }) => {
  const { karyoku, karyokuMax, karyokuNow } = ship
  const karyokuClass = karyokuNow >= karyokuMax
    ? 'td-karyoku-max'
    : 'td-karyoku'
  const karyokuString = karyokuNow >= karyokuMax
    ? 'MAX'
    : `+${karyokuMax - karyokuNow}`
  return (
    <Cell
      {...props}
      className={`${className} ${karyokuClass}`}
      style={style}
    >
      <span>
        {`${karyoku}/`}
        <span style={{ fontSize: '80%' }}>{karyokuString}</span>
      </span>
    </Cell>
  )
}

const Raisou = ({ className, ship, style, ...props }) => {
  const { raisou, raisouMax, raisouNow } = ship
  const raisouClass = raisouNow >= raisouMax
    ? 'td-raisou-max'
    : 'td-raisou'
  const raisouString = raisouNow >= raisouMax
    ? 'MAX'
    : `+${raisouMax - raisouNow}`
  return (
    <Cell
      {...props}
      className={`${className} ${raisouClass}`}
      style={style}
    >
      <span>
        {`${raisou}/`}
        <span style={{ fontSize: '80%' }}>{raisouString}</span>
      </span>
    </Cell>
  )
}

const Taiku = ({ className, ship, style, ...props }) => {
  const { soukou, soukouMax, soukouNow } = ship
  const soukouClass = soukouNow >= soukouMax
    ? 'td-soukou-max'
    : 'td-soukou'
  const soukouString = soukouNow >= soukouMax
    ? 'MAX'
    : `+${soukouMax - soukouNow}`
  return (
    <Cell
      {...props}
      className={`${className} ${soukouClass}`}
      style={style}
    >
      <span>
        {`${soukou}/`}
        <span style={{ fontSize: '80%' }}>{soukouString}</span>
      </span>
    </Cell>
  )
}

const Soukou = ({ className, ship, style, ...props }) => {
  const { soukou, soukouMax, soukouNow } = ship
  const soukouClass = soukouNow >= soukouMax
    ? 'td-soukou-max'
    : 'td-soukou'
  const soukouString = soukouNow >= soukouMax
    ? 'MAX'
    : `+${soukouMax - soukouNow}`
  return (
    <Cell
      {...props}
      className={`${className} ${soukouClass}`}
      style={style}
    >
      <span>
        {`${soukou}/`}
        <span style={{ fontSize: '80%' }}>{soukouString}</span>
      </span>
    </Cell>
  )
}

const Lucky = ({ className, ship, style, ...props }) => {
  const { lucky, luckyMax, luckyNow } = ship
  const luckyClass = luckyNow >= luckyMax
    ? 'td-lucky-max'
    : 'td-lucky'
  const luckyString = luckyNow >= luckyMax
    ? 'MAX'
    : `+${luckyMax - luckyNow}`
  return (
    <Cell
      {...props}
      className={`${className} ${luckyClass}`}
      style={style}
    >
      <span>
        {`${lucky}/`}
        <span style={{ fontSize: '80%' }}>{luckyString}</span>
      </span>
    </Cell>
  )
}

const Kaihi = ({ ship, style, ...props }) => (
  <Cell
    {...props}
    style={style}
  >
    { ship.kaihi }
  </Cell>
)

const Taisen = ({ ship, style, ...props }) => (
  <Cell
    {...props}
    style={style}
  >
    { ship.taisen }
  </Cell>
)

const Sakuteki = ({ ship, style, ...props }) => (
  <Cell
    {...props}
    style={style}
  >
    { ship.sakuteki }
  </Cell>
)

const RepairTime = ({ ship, style, ...props }) => {
  const { nowhp, maxhp, repairtime, lv, typeId } = ship
  let repairColor
  if (nowhp * 4 <= maxhp) {
    repairColor = 'rgba(255, 0, 0, 0.4)'
  } else if (nowhp * 2 <= maxhp) {
    repairColor = 'rgba(255, 65, 0, 0.4)'
  } else if (nowhp * 4 <= maxhp * 3) {
    repairColor = 'rgba(255, 255, 0, 0.4)'
  }
  return (
    <Cell
      {...props}
      style={{
        ...style,
        backgroundColor: repairColor,
      }}
    >
      {
        repairtime &&
          <OverlayTrigger
            placement="top"
            overlay={
              <Tooltip id="repairtime1hp" className="info-tooltip">
                { `1HP : ${resolveTime(getTimePerHP(lv, typeId) / 1000)}` }
              </Tooltip>}
          >
            <span>{resolveTime(repairtime)}</span>
          </OverlayTrigger>

      }
    </Cell>
  )
}

const Equipment = ({ ship, style, ...props }) => (
  <Cell
    {...props}
    style={style}
  >
    <Slotitems slot={ship.slot} exslot={ship.exslot} />
  </Cell>
)

const Locke = ({ ship, style, ...props }) => (
  <Cell
    {...props}
    style={style}
  >
    {ship.locked === 1 ? <FontAwesome name="lock" /> : ' '}
  </Cell>
)

export default {
  id: Id,
  name: Name,
  type: Type,
  soku: Soku,
  lv: Lv,
  cond: Cond,
  karyoku: Karyoku,
  raisou: Raisou,
  taiku: Taiku,
  soukou: Soukou,
  lucky: Lucky,
  kaihi: Kaihi,
  taisen: Taisen,
  sakuteki: Sakuteki,
  repairtime: RepairTime,
  equipment: Equipment,
  lock: Locke,
}
