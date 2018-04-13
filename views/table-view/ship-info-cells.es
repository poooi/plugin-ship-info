import React from 'react'
import { OverlayTrigger, Tooltip } from 'react-bootstrap'
import FontAwesome from 'react-fontawesome'
import PropTypes from 'prop-types'
import cls from 'classnames'
import path from 'path'
import { connect } from 'react-redux'
import { get } from 'lodash'

import { resolveTime } from 'views/utils/tools'
import { Avatar } from 'views/components/etc/avatar'
import Slotitems from './slotitems'
import SallyArea from './sally-area'
import { sokuInterpretation, sokuStyles } from '../constants'
import { getTimePerHP, shipInfoShape, shipTypes, fileUrl } from '../utils'

const { __ } = window.i18n['poi-plugin-ship-info']

const enableAvatarConfigSelector = state => get(state, ['config', 'poi', 'enableAvatar'], false)

const Id = ({ ship, ...props }) => (
  <div
    {...props}
  >
    { ship.id }
  </div>
)

Id.propTypes = {
  ship: PropTypes.shape(shipInfoShape).isRequired,
  className: PropTypes.string,
}

const Name = ({
  className, ship, enableAvatar, ...props
}) => (
  <div
    {...props}
    className={`${className || ''} ship-name`}
  >
    {
      enableAvatar &&
      <Avatar mstId={ship.shipId} height={35} />
    }
    <span
      className="name"
      title={window.i18n.resources.__(ship.name)}
    >
      {window.i18n.resources.__(ship.name)}
    </span>
    {
      ship.fleetId > -1 &&
        <img
          className="fleet-id-indicator"
          alt={`fleet: ${ship.fleetId + 1}`}
          src={fileUrl(path.resolve(__dirname, `../../assets/svg/fleet-indicator-${ship.fleetId + 1}.svg`))}
        />
    }
    <SallyArea area={ship.sallyArea} info_id={ship.id} />
  </div>
)

Name.propTypes = {
  ship: PropTypes.shape(shipInfoShape).isRequired,
  className: PropTypes.string,
  enableAvatar: PropTypes.bool.isRequired,
}

const Type = ({ ship, ...props }) => (
  <div
    {...props}
  >
    { window.language === 'en-US'
      ? shipTypes[ship.typeId]
      : window.i18n.resources.__(ship.type)
    }
  </div>
)

Type.propTypes = {
  ship: PropTypes.shape(shipInfoShape).isRequired,
  className: PropTypes.string,
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
  ship: PropTypes.shape(shipInfoShape).isRequired,
  className: PropTypes.string,
}

const Lv = ({ ship, ...props }) => (
  <div
    {...props}
  >
    { ship.lv }
  </div>
)

Lv.propTypes = {
  ship: PropTypes.shape(shipInfoShape).isRequired,
  className: PropTypes.string,
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
  ship: PropTypes.shape(shipInfoShape).isRequired,
  className: PropTypes.string,
}

const Hp = ({ ship, ...props }) => (
  <div
    {...props}
  >
    <span>
      { ship.taik[0] }
      { ship.maxhp - ship.taik[0] > 0 && <sup>+{ship.maxhp - ship.taik[0]}</sup> }
    </span>
  </div>
)

Hp.propTypes = {
  ship: PropTypes.shape(shipInfoShape).isRequired,
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
  ship: PropTypes.shape(shipInfoShape).isRequired,
  className: PropTypes.string,
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
  ship: PropTypes.shape(shipInfoShape).isRequired,
  className: PropTypes.string,
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
  ship: PropTypes.shape(shipInfoShape).isRequired,
  className: PropTypes.string,
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
  ship: PropTypes.shape(shipInfoShape).isRequired,
  className: PropTypes.string,
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
  ship: PropTypes.shape(shipInfoShape).isRequired,
  className: PropTypes.string,
}

const Kaihi = ({ ship, ...props }) => (
  <div
    {...props}
  >
    { ship.kaihi || 'NA' }
  </div>
)

Kaihi.propTypes = {
  ship: PropTypes.shape(shipInfoShape).isRequired,
  className: PropTypes.string,
}

const Taisen = ({ ship, ...props }) => (
  <div
    {...props}
  >
    <span>
      { ship.taisen }
      { ship.kyouka[6] > 0 && <sup>+{ship.kyouka[6]}</sup> }
    </span>
  </div>
)

Taisen.propTypes = {
  ship: PropTypes.shape(shipInfoShape).isRequired,
  className: PropTypes.string,
}

const Sakuteki = ({ ship, ...props }) => (
  <div
    {...props}
  >
    { ship.sakuteki }
  </div>
)

Sakuteki.propTypes = {
  ship: PropTypes.shape(shipInfoShape).isRequired,
  className: PropTypes.string,
}

const RepairTime = ({ className, ship, ...props }) => {
  const {
    nowhp, maxhp, repairtime, lv, typeId, inDock,
  } = ship
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
  ship: PropTypes.shape(shipInfoShape).isRequired,
  className: PropTypes.string,
}

const Equipment = ({ ship, ...props }) => (
  <div
    {...props}
  >
    <Slotitems slot={ship.slot} exslot={ship.exslot} />
  </div>
)

Equipment.propTypes = {
  ship: PropTypes.shape(shipInfoShape).isRequired,
  className: PropTypes.string,
}

const Lock = ({ ship, ...props }) => (
  <div
    {...props}
  >
    {ship.locked === 1 ? <FontAwesome name="lock" /> : ' '}
  </div>
)

Lock.propTypes = {
  ship: PropTypes.shape(shipInfoShape).isRequired,
  className: PropTypes.string,
}

export default {
  id: Id,
  name: connect(state => ({ enableAvatar: enableAvatarConfigSelector(state) }))(Name),
  type: Type,
  soku: Soku,
  lv: Lv,
  cond: Cond,
  hp: Hp,
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
