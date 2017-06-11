import React, { Component, PropTypes } from 'react'
import { OverlayTrigger, Tooltip } from 'react-bootstrap'
import FontAwesome from 'react-fontawesome'
import { isEqual } from 'lodash'

import { getTimePerHP, extractShipInfo, shipInfoShape } from './utils'
import Slotitems from './slotitems'
import SallyArea from './sally-area'

const { __, resolveTime } = window


const shipRenderer = ({ index, ship, style }) => {
  const {
    karyoku,
    raisou,
    taiku,
    soukou,
    lucky,
    lv,
    repairtime,
    locked,
    id,
    type,
    typeId,
    fleetId,
    name,
    sallyArea,
    cond,
    kaihi,
    taisen,
    sakuteki,
    slot,
    exslot,
    karyokuClass,
    karyokuString,
    raisouClass,
    raisouString,
    taikuClass,
    taikuString,
    soukouClass,
    soukouString,
    luckyClass,
    luckyString,
    repairColor,
    condColor,
    sokuString,
    sokuStyle,
  } = extractShipInfo(ship)

  let content

  switch (index) {
    case 0:
      content = id
      break
    case 1:
      content = window.i18n.resources.__(type)
      break
    case 2:
      content = (
        <span className="ship-name">
          {window.i18n.resources.__(name)}
          <SallyArea area={sallyArea} info_id={id} />
          {
            fleetId > -1 &&
            <span className="fleet-id-indicator">
              {`/${fleetId + 1}`}
            </span>
          }
        </span>
      )
      break
    case 3:
      content = <span className={sokuStyle}>{__(sokuString)}</span>
      break
    case 4:
      content = lv
      break
    case 5:
      content = (
        <span className="center" style={{ backgroundColor: condColor }}>
          {cond}
        </span>
      )
      break
    case 6:
      content = (
        <span className={karyokuClass}>
          {`${karyoku}/`}
          <span style={{ fontSize: '80%' }}>{karyokuString}</span>
        </span>
      )
      break
    case 7:
      content = (
        <span className={raisouClass}>
          {`${raisou}/`}
          <span style={{ fontSize: '80%' }}>{raisouString}</span>
        </span>
      )
      break
    case 8:
      content = (
        <span className={taikuClass}>
          {`${taiku}/`}
          <span style={{ fontSize: '80%' }}>{taikuString}</span>
        </span>
      )
      break
    case 9:
      content = (
        <span className={soukouClass}>
          {`${soukou}/`}
          <span style={{ fontSize: '80%' }}>{soukouString}</span>
        </span>
      )
      break
    case 10:
      content = (
        <span className={luckyClass}>
          {`${lucky}/`}
          <span style={{ fontSize: '80%' }}>{luckyString}</span>
        </span>
      )
      break
    case 11:
      content = kaihi
      break
    case 12:
      content = taisen
      break
    case 13:
      content = sakuteki
      break
    case 14:
      content = (
        <span style={{ backgroundColor: repairColor }}>
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
        </span>
      )
      break
    case 15:
      content = <Slotitems slot={slot} exslot={exslot} />
      break
    case 16:
      content = (
        <span>
          {locked === 1 ? <FontAwesome name="lock" /> : ' '}
        </span>
      )
      break
    default:
      content = 'UNDEFINED'
  }

  return (
    <div style={{
      ...style,
      paddingLeft: '1ex',
      paddingRight: '1ex',
      whiteSpace: 'nowrap',
      }}
      >
      {content}
    </div>
    )
}

class ShipInfoRow extends Component {
  static propTypes = {
    shipInfo: PropTypes.shape(shipInfoShape).isRequired,
  }

  shouldComponentUpdate = (nextProps, nextState) => {
    const { shipInfo, fleetId } = this.props
    return !isEqual(nextProps.shipInfo, shipInfo) ||
      !isEqual(nextProps.fleetId, fleetId)
  }

  render() {
    const { shipInfo } = this.props

    const {
      karyoku,
      raisou,
      taiku,
      soukou,
      lucky,
      lv,
      repairtime,
      locked,
      id,
      type,
      typeId,
      fleetId,
      name,
      sallyArea,
      cond,
      kaihi,
      taisen,
      sakuteki,
      slot,
      exslot,
      karyokuClass,
      karyokuString,
      raisouClass,
      raisouString,
      taikuClass,
      taikuString,
      soukouClass,
      soukouString,
      luckyClass,
      luckyString,
      repairColor,
      condColor,
      sokuString,
      sokuStyle,
    } = extractShipInfo(shipInfo)

    // TODO: support unequip ship data display
    return (
      <tr>
        <td />
        <td>{id}</td>
        <td>{window.i18n.resources.__(type)}</td>
        <td className="ship-name">{window.i18n.resources.__(name)}
          <SallyArea area={sallyArea} info_id={id} />
          {
            fleetId > -1 &&
            <span className="fleet-id-indicator">
              {`/${fleetId + 1}`}
            </span>
          }
        </td>
        <td style={sokuStyle}>{__(sokuString)}</td>
        <td className="center">{lv}</td>
        <td className="center" style={{ backgroundColor: condColor }}>{cond}</td>
        <td className={karyokuClass}>{`${karyoku}/`}<span style={{ fontSize: '80%' }}>{karyokuString}</span></td>
        <td className={raisouClass}>{`${raisou}/`}<span style={{ fontSize: '80%' }}>{raisouString}</span></td>
        <td className={taikuClass}>{`${taiku}/`}<span style={{ fontSize: '80%' }}>{taikuString}</span></td>
        <td className={soukouClass}>{`${soukou}/`}<span style={{ fontSize: '80%' }}>{soukouString}</span></td>
        <td className={luckyClass}>{`${lucky}/`}<span style={{ fontSize: '80%' }}>{luckyString}</span></td>
        <td className="center">{kaihi}</td>
        <td className="center">{taisen}</td>
        <td className="center">{sakuteki}</td>
        <td className="center" style={{ backgroundColor: repairColor }}>
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
        </td>
        <td><Slotitems slot={slot} exslot={exslot} /></td>
        <td>{locked == 1 ? <FontAwesome name="lock" /> : ' '}</td>
      </tr>
    )
  }
}

export default shipRenderer
