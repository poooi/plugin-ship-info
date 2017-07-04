import React from 'react'
import { OverlayTrigger, Tooltip } from 'react-bootstrap'
import FontAwesome from 'react-fontawesome'
import propTypes from 'prop-types'
import cls from 'classnames'
import path from 'path'

import { resolveTime } from 'views/utils/tools'
import Slotitems from './slotitems'
import SallyArea from './sally-area'
import { sokuInterpretation, sokuStyles } from '../constants'
import { getTimePerHP, shipInfoShape } from '../utils'

const { __ } = window

const Id = ({ ship, ...props }) => (
  <div
    {...props}
  >
    { ship.id }
  </div>
)

Id.propTypes = {
  ship: propTypes.shape(shipInfoShape).isRequired,
  className: propTypes.string,
}

const Name = ({ className, ship, ...props }) => (
  <div
    {...props}
    className={`${className || ''} ship-name`}
  >
    <span
      className="name"
      title={window.i18n.resources.__(ship.name)}
    >
      {window.i18n.resources.__(ship.name)}</span>
    {
      ship.fleetId > -1 &&
        <img
          className="fleet-id-indicator"
          alt={`fleet: ${ship.fleetId + 1}`}
          src={path.resolve(__dirname, `../../assets/svg/fleet-indicator-${ship.fleetId + 1}.svg`)}
        />
    }
    <SallyArea area={ship.sallyArea} info_id={ship.id} />
  </div>
)

Name.propTypes = {
  ship: propTypes.shape(shipInfoShape).isRequired,
  className: propTypes.string,
}

const Type = ({ ship, ...props }) => (
  <div
    {...props}
  >
    { window.i18n.resources.__(ship.type) }
  </div>
)

Type.propTypes = {
  ship: propTypes.shape(shipInfoShape).isRequired,
  className: propTypes.string,
}

const Soku = ({ className, ship, ...props }) => {
  const { soku } = ship
  const sokuString = sokuInterpretation[soku] || 'Unknown'
  const sokuClass = sokuStyles[soku] || ''
  return (
    <div
      {...props}
      className={`${className} ${sokuClass}`}
    >
      <span>{__(sokuString)}</span>
    </div>
  )
}

Soku.propTypes = {
  ship: propTypes.shape(shipInfoShape).isRequired,
  className: propTypes.string,
}

const Lv = ({ ship, ...props }) => (
  <div
    {...props}
  >
    { ship.lv }
  </div>
)

Lv.propTypes = {
  ship: propTypes.shape(shipInfoShape).isRequired,
  className: propTypes.string,
}

const Cond = ({ className, ship, ...props }) => {
  let condClass
  const { cond } = ship
  if (cond >= 0 && cond < 20) {
    condClass = 'cond-danger'
  } else if (cond < 30) {
    condClass = 'cond-warning'
  } else if (cond >= 50) {
    condClass = 'cond-success'
  }

  return (
    <div
      className={cls(condClass, className)}
      {...props}
    >
      { ship.cond }
    </div>
  )
}

Cond.propTypes = {
  ship: propTypes.shape(shipInfoShape).isRequired,
  className: propTypes.string,
}

const Karyoku = ({ className, ship, ...props }) => {
  const { karyoku, karyokuMax, karyokuNow } = ship
  const karyokuClass = karyokuNow >= karyokuMax
    ? 'td-karyoku-max'
    : 'td-karyoku'
  const karyokuString = karyokuNow >= karyokuMax
    ? 'MAX'
    : `+${karyokuMax - karyokuNow}`
  return (
    <div
      {...props}
      className={`${className || ''} ${karyokuClass}`}
    >
      <span>
        {`${karyoku}/`}
        <span style={{ fontSize: '80%' }}>{karyokuString}</span>
      </span>
    </div>
  )
}

Karyoku.propTypes = {
  ship: propTypes.shape(shipInfoShape).isRequired,
  className: propTypes.string,
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
    <div
      {...props}
      className={`${className || ''} ${raisouClass}`}
    >
      <span>
        {`${raisou}/`}
        <span style={{ fontSize: '80%' }}>{raisouString}</span>
      </span>
    </div>
  )
}

Raisou.propTypes = {
  ship: propTypes.shape(shipInfoShape).isRequired,
  className: propTypes.string,
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
    <div
      {...props}
      className={`${className || ''} ${taikuClass}`}
    >
      <span>
        {`${taiku}/`}
        <span style={{ fontSize: '80%' }}>{taikuString}</span>
      </span>
    </div>
  )
}

Taiku.propTypes = {
  ship: propTypes.shape(shipInfoShape).isRequired,
  className: propTypes.string,
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
    <div
      {...props}
      className={`${className || ''} ${soukouClass}`}
    >
      <span>
        {`${soukou}/`}
        <span style={{ fontSize: '80%' }}>{soukouString}</span>
      </span>
    </div>
  )
}

Soukou.propTypes = {
  ship: propTypes.shape(shipInfoShape).isRequired,
  className: propTypes.string,
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
    <div
      {...props}
      className={`${className || ''} ${luckyClass}`}
    >
      <span>
        {`${lucky}/`}
        <span style={{ fontSize: '80%' }}>{luckyString}</span>
      </span>
    </div>
  )
}

Lucky.propTypes = {
  ship: propTypes.shape(shipInfoShape).isRequired,
  className: propTypes.string,
}

const Kaihi = ({ ship, ...props }) => (
  <div
    {...props}
  >
    { ship.kaihi }
  </div>
)

Kaihi.propTypes = {
  ship: propTypes.shape(shipInfoShape).isRequired,
  className: propTypes.string,
}

const Taisen = ({ ship, ...props }) => (
  <div
    {...props}
  >
    { ship.taisen }
  </div>
)

Taisen.propTypes = {
  ship: propTypes.shape(shipInfoShape).isRequired,
  className: propTypes.string,
}

const Sakuteki = ({ ship, ...props }) => (
  <div
    {...props}
  >
    { ship.sakuteki }
  </div>
)

Sakuteki.propTypes = {
  ship: propTypes.shape(shipInfoShape).isRequired,
  className: propTypes.string,
}

const RepairTime = ({ className, ship, ...props }) => {
  const { nowhp, maxhp, repairtime, lv, typeId, inDock } = ship
  let repairClass = ''
  if (nowhp * 4 <= maxhp) {
    repairClass = 'repair-heavy'
  } else if (nowhp * 2 <= maxhp) {
    repairClass = 'repair-moderate'
  } else if (nowhp * 4 <= maxhp * 3) {
    repairClass = 'repair-minor'
  }
  return (
    <div
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
            <span>
              {
                inDock && <FontAwesome name="bath" />
              }
              {resolveTime(repairtime)}
            </span>
          </OverlayTrigger>

      }
    </div>
  )
}

RepairTime.propTypes = {
  ship: propTypes.shape(shipInfoShape).isRequired,
  className: propTypes.string,
}

const Equipment = ({ ship, ...props }) => (
  <div
    {...props}
  >
    <Slotitems slot={ship.slot} exslot={ship.exslot} />
  </div>
)

Equipment.propTypes = {
  ship: propTypes.shape(shipInfoShape).isRequired,
  className: propTypes.string,
}

const Lock = ({ ship, ...props }) => (
  <div
    {...props}
  >
    {ship.locked === 1 ? <FontAwesome name="lock" /> : ' '}
  </div>
)

Lock.propTypes = {
  ship: propTypes.shape(shipInfoShape).isRequired,
  className: propTypes.string,
}

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
  lock: Lock,
}
