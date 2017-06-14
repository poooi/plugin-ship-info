import React from 'react'
import { OverlayTrigger, Tooltip } from 'react-bootstrap'
import FontAwesome from 'react-fontawesome'

import Slotitems from './slotitems'
import SallyArea from './sally-area'
import { sokuInterpretation, sokuStyles } from '../constants'
import { getTimePerHP } from './utils'

const { __, resolveTime } = window

const Cell = ({ children, ...props }) => (
  <div
    {...props}
  >
    { children }
  </div>
)

const Id = ({ ship, ...props }) => (
  <Cell
    {...props}
  >
    { ship.id }
  </Cell>
)

const Name = ({ className, ship, ...props }) => (
  <Cell
    {...props}
    className={`${className || ''} ship-name`}
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

const Type = ({ ship, ...props }) => (
  <Cell
    {...props}
  >
    { window.i18n.resources.__(ship.type) }
  </Cell>
)

const Soku = ({ className, ship, ...props }) => {
  const { soku } = ship
  const sokuString = sokuInterpretation[soku] || 'Unknown'
  const sokuClass = sokuStyles[soku] || ''
  return (
    <Cell
      {...props}
      className={`${className} ${sokuClass}`}
    >
      <span>{__(sokuString)}</span>
    </Cell>
  )
}

const Lv = ({ ship, ...props }) => (
  <Cell
    {...props}
  >
    { ship.lv }
  </Cell>
)

const Cond = ({ ship, ...props }) => (
  <Cell
    {...props}
  >
    { ship.cond }
  </Cell>
)

const Karyoku = ({ className, ship, ...props }) => {
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
      className={`${className || ''} ${karyokuClass}`}
    >
      <span>
        {`${karyoku}/`}
        <span style={{ fontSize: '80%' }}>{karyokuString}</span>
      </span>
    </Cell>
  )
}

const Raisou = ({ className, ship, ...props }) => {
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
      className={`${className || ''} ${raisouClass}`}
    >
      <span>
        {`${raisou}/`}
        <span style={{ fontSize: '80%' }}>{raisouString}</span>
      </span>
    </Cell>
  )
}

const Taiku = ({ className, ship, ...props }) => {
  const { taiku, taikuMax, taikuNow } = ship
  const taikuClass = taikuNow >= taikuMax
    ? 'td-taiku-max'
    : 'td-taiku'
  const taikuString = taikuNow >= taikuMax
    ? 'MAX'
    : `+${taikuMax - taikuNow}`
  return (
    <Cell
      {...props}
      className={`${className || ''} ${taikuClass}`}
    >
      <span>
        {`${taiku}/`}
        <span style={{ fontSize: '80%' }}>{taikuString}</span>
      </span>
    </Cell>
  )
}

const Soukou = ({ className, ship, ...props }) => {
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
      className={`${className || ''} ${soukouClass}`}
    >
      <span>
        {`${soukou}/`}
        <span style={{ fontSize: '80%' }}>{soukouString}</span>
      </span>
    </Cell>
  )
}

const Lucky = ({ className, ship, ...props }) => {
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
      className={`${className || ''} ${luckyClass}`}
    >
      <span>
        {`${lucky}/`}
        <span style={{ fontSize: '80%' }}>{luckyString}</span>
      </span>
    </Cell>
  )
}

const Kaihi = ({ ship, ...props }) => (
  <Cell
    {...props}
  >
    { ship.kaihi }
  </Cell>
)

const Taisen = ({ ship, ...props }) => (
  <Cell
    {...props}
  >
    { ship.taisen }
  </Cell>
)

const Sakuteki = ({ ship, ...props }) => (
  <Cell
    {...props}
  >
    { ship.sakuteki }
  </Cell>
)

const RepairTime = ({ className, ship, ...props }) => {
  const { nowhp, maxhp, repairtime, lv, typeId } = ship
  let repairClass = ''
  if (nowhp * 4 <= maxhp) {
    repairClass = 'repair-heavy'
  } else if (nowhp * 2 <= maxhp) {
    repairClass = 'repair-moderate'
  } else if (nowhp * 4 <= maxhp * 3) {
    repairClass = 'repair-minor'
  }
  return (
    <Cell
      {...props}
      className={`${repairClass} ${className}`}
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

const Equipment = ({ ship, ...props }) => (
  <Cell
    {...props}
  >
    <Slotitems slot={ship.slot} exslot={ship.exslot} />
  </Cell>
)

const Locke = ({ ship,...props }) => (
  <Cell
    {...props}
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
