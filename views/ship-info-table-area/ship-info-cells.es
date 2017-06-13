import React from 'react'
import { OverlayTrigger, Tooltip } from 'react-bootstrap'
import FontAwesome from 'react-fontawesome'

import Slotitems from './slotitems'
import SallyArea from './sally-area'
import { sokuInterpretation, sokuStyles } from '../constants'
import { getTimePerHP } from './utils'

const { __, resolveTime } = window

const Cell = ({ className, style, children, onMouseOver }) => (
  <div
    style={{
      ...style,
      paddingLeft: '1ex',
      paddingRight: '1ex',
      whiteSpace: 'nowrap',
    }}
    className={`ship-info-cell ${className}`}
    onMouseOver={onMouseOver}
  >
    { children }
  </div>
)

const Id = ({ ship, style, onMouseOver }) => (
  <Cell
    style={style}
    onMouseOver={onMouseOver}
  >
    { ship.id }
  </Cell>
)

const Name = ({ ship, style, onMouseOver }) => (
  <Cell
    className="ship-name"
    style={style}
    onMouseOver={onMouseOver}
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

const Type = ({ ship, style, onMouseOver }) => (
  <Cell
    style={style}
    onMouseOver={onMouseOver}
  >
    { window.i18n.resources.__(ship.type) }
  </Cell>
)

const Soku = ({ ship, style, onMouseOver }) => {
  const { soku } = ship
  const sokuString = sokuInterpretation[soku] || 'Unknown'
  const sokuClass = sokuStyles[soku] || {}
  return (
    <Cell
      className={sokuClass}
      style={style}
      onMouseOver={onMouseOver}
    >
      <span>{__(sokuString)}</span>
    </Cell>
  )
}

const Lv = ({ ship, style, onMouseOver }) => (
  <Cell
    style={style}
    onMouseOver={onMouseOver}
  >
    { ship.lv }
  </Cell>
)

const Cond = ({ ship, style, onMouseOver }) => (
  <Cell
    className="center"
    style={style}
    onMouseOver={onMouseOver}
  >
    { ship.cond }
  </Cell>
)

const Karyoku = ({ ship, style, onMouseOver }) => {
  const { karyoku, karyokuMax, karyokuNow } = ship
  const karyokuClass = karyokuNow >= karyokuMax
    ? 'td-karyoku-max'
    : 'td-karyoku'
  const karyokuString = karyokuNow >= karyokuMax
    ? 'MAX'
    : `+${karyokuMax - karyokuNow}`
  return (
    <Cell
      className={karyokuClass}
      style={style}
      onMouseOver={onMouseOver}
    >
      <span>
        {`${karyoku}/`}
        <span style={{ fontSize: '80%' }}>{karyokuString}</span>
      </span>
    </Cell>
  )
}

const Raisou = ({ ship, style, onMouseOver }) => {
  const { raisou, raisouMax, raisouNow } = ship
  const raisouClass = raisouNow >= raisouMax
    ? 'td-raisou-max'
    : 'td-raisou'
  const raisouString = raisouNow >= raisouMax
    ? 'MAX'
    : `+${raisouMax - raisouNow}`
  return (
    <Cell
      className={raisouClass}
      style={style}
      onMouseOver={onMouseOver}
    >
      <span>
        {`${raisou}/`}
        <span style={{ fontSize: '80%' }}>{raisouString}</span>
      </span>
    </Cell>
  )
}

const Taiku = ({ ship, style, onMouseOver }) => {
  const { soukou, soukouMax, soukouNow } = ship
  const soukouClass = soukouNow >= soukouMax
    ? 'td-soukou-max'
    : 'td-soukou'
  const soukouString = soukouNow >= soukouMax
    ? 'MAX'
    : `+${soukouMax - soukouNow}`
  return (
    <Cell
      className={soukouClass}
      style={style}
      onMouseOver={onMouseOver}
    >
      <span>
        {`${soukou}/`}
        <span style={{ fontSize: '80%' }}>{soukouString}</span>
      </span>
    </Cell>
  )
}

const Soukou = ({ ship, style, onMouseOver }) => {
  const { soukou, soukouMax, soukouNow } = ship
  const soukouClass = soukouNow >= soukouMax
    ? 'td-soukou-max'
    : 'td-soukou'
  const soukouString = soukouNow >= soukouMax
    ? 'MAX'
    : `+${soukouMax - soukouNow}`
  return (
    <Cell
      className={soukouClass}
      style={style}
      onMouseOver={onMouseOver}
    >
      <span>
        {`${soukou}/`}
        <span style={{ fontSize: '80%' }}>{soukouString}</span>
      </span>
    </Cell>
  )
}

const Lucky = ({ ship, style, onMouseOver }) => {
  const { lucky, luckyMax, luckyNow } = ship
  const luckyClass = luckyNow >= luckyMax
    ? 'td-lucky-max'
    : 'td-lucky'
  const luckyString = luckyNow >= luckyMax
    ? 'MAX'
    : `+${luckyMax - luckyNow}`
  return (
    <Cell
      className={luckyClass}
      style={style}
      onMouseOver={onMouseOver}
    >
      <span>
        {`${lucky}/`}
        <span style={{ fontSize: '80%' }}>{luckyString}</span>
      </span>
    </Cell>
  )
}

const Kaihi = ({ ship, style, onMouseOver }) => (
  <Cell
    className="center"
    style={style}
    onMouseOver={onMouseOver}
  >
    { ship.kaihi }
  </Cell>
)

const Taisen = ({ ship, style, onMouseOver }) => (
  <Cell
    className="center"
    style={style}
    onMouseOver={onMouseOver}
  >
    { ship.taisen }
  </Cell>
)

const Sakuteki = ({ ship, style, onMouseOver }) => (
  <Cell
    className="center"
    style={style}
    onMouseOver={onMouseOver}
  >
    { ship.sakuteki }
  </Cell>
)

const RepairTime = ({ ship, style, onMouseOver }) => {
  const { nowhp, maxhp, repairtime, lv, typeId } = ship
  let repairColor = ''
  if (nowhp * 4 <= maxhp) {
    repairColor = 'rgba(255, 0, 0, 0.4)'
  } else if (nowhp * 2 <= maxhp) {
    repairColor = 'rgba(255, 65, 0, 0.4)'
  } else if (nowhp * 4 <= maxhp * 3) {
    repairColor = 'rgba(255, 255, 0, 0.4)'
  } else {
    repairColor = 'transparent'
  }
  return (
    <Cell
      style={{
        ...style,
        backgroundColor: repairColor,
      }}
      onMouseOver={onMouseOver}
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

const Equipment = ({ ship, style, onMouseOver }) => (
  <Cell
    style={style}
    onMouseOver={onMouseOver}
  >
    <Slotitems slot={ship.slot} exslot={ship.exslot} />
  </Cell>
)

const Locke = ({ ship, style, onMouseOver }) => (
  <Cell
    style={style}
    onMouseOver={onMouseOver}
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
