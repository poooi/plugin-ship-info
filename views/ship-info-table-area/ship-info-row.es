import React, { Component, PropTypes } from 'react'
import { OverlayTrigger, Tooltip } from 'react-bootstrap'
import FontAwesome from 'react-fontawesome'
import { isEqual } from 'lodash'

import { getTimePerHP, extractShipInfo, shipInfoShape } from './utils'
import Slotitems from './slotitems'
import SallyArea from './sally-area'

const { __, resolveTime } = window

class ShipInfoRow extends Component {
  static propTypes = {
    shipInfo: PropTypes.shape(shipInfoShape).isRequired,
    fleetId: PropTypes.number.isRequired,
  }

  shouldComponentUpdate = (nextProps, nextState) => {
    const { shipInfo, fleetId } = this.props
    return !isEqual(nextProps.shipInfo, shipInfo) ||
      !isEqual(nextProps.fleetId, fleetId)
  }

  render() {
    const { shipInfo, fleetId } = this.props

    const {
      karyokuNow,
      karyokuMax,
      karyoku,
      raisouNow,
      raisouMax,
      raisou,
      taikuNow,
      taikuMax,
      taiku,
      soukouNow,
      soukouMax,
      soukou,
      luckyNow,
      luckyMax,
      lucky,
      lv,
      nowhp,
      maxhp,
      losshp,
      repairtime,
      locked,
      id,
      type,
      type_id,
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
          {
            Number.isNaN(fleetId) ? ''
            :
            <span className="fleet-id-indicator">
              {`/${fleetId + 1}`}
            </span>
          }
          <SallyArea area={sallyArea} info_id={id} />
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
                    { `1HP : ${resolveTime(getTimePerHP(lv, type_id) / 1000)}` }
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

export default ShipInfoRow
