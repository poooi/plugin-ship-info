import React, { Component } from 'react'
import { Table,  OverlayTrigger, Tooltip } from 'react-bootstrap'
import FontAwesome from 'react-fontawesome'
import { isEqual, sortBy, get } from 'lodash'
import { connect } from 'react-redux'
import classNames from 'classnames'
import memoize from 'fast-memoize'

import { fleetShipsIdSelectorFactory, fleetInExpeditionSelectorFactory } from 'views/utils/selectors'

import Divider from '../divider'
import { getTimePerHP, getShipInfoData, nameCompare, extractShipInfo } from './utils'
import { shipTableDataSelectorFactory, shipInfoConfigSelector } from './selectors'
import Slotitems from './slotitems'
import SallyArea from './sallyarea'

const { __, resolveTime } = window

class ShipInfoTable extends Component {
  shouldComponentUpdate = (nextProps, nextState) => {
    const {shipInfo} = this.props
    return !isEqual(nextProps.shipInfo, shipInfo)
  }

  render() {
    const {shipInfo} = this.props

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
    return(
      <tr>
        <td></td>
        <td>{id}</td>
        <td>{window.i18n.resources.__ (type)}</td>
        <td className="ship-name">{window.i18n.resources.__ (name)}
          <SallyArea area={sallyArea} info_id={id}/>
        </td>
        <td style={sokuStyle}>{__(sokuString)}</td>
        <td className='center'>{lv}</td>
        <td className='center' style={{backgroundColor: condColor}}>{cond}</td>
        <td className={karyokuClass}>{karyoku + '/'}<span style={{fontSize: '80%'}}>{karyokuString}</span></td>
        <td className={raisouClass}>{raisou + '/'}<span style={{fontSize: '80%'}}>{raisouString}</span></td>
        <td className={taikuClass}>{taiku + '/'}<span style={{fontSize: '80%'}}>{taikuString}</span></td>
        <td className={soukouClass}>{soukou + '/'}<span style={{fontSize: '80%'}}>{soukouString}</span></td>
        <td className={luckyClass}>{lucky + '/'}<span style={{fontSize: '80%'}}>{luckyString}</span></td>
        <td className='center'>{kaihi}</td>
        <td className='center'>{taisen}</td>
        <td className='center'>{sakuteki}</td>
        <td className='center' style={{backgroundColor: repairColor}}>
          {
            repairtime &&
              <OverlayTrigger placement="top" 
                overlay={
                  <Tooltip id="repairtime1hp" className='info-tooltip'>
                    { `1HP : ${resolveTime(getTimePerHP(lv, type_id) /1000 )}` }
                  </Tooltip>}
              >
                <span>{resolveTime(repairtime)}</span>
              </OverlayTrigger>

          }
        </td>
        <td><Slotitems slot={slot} exslot={exslot} /></td>
        <td>{locked == 1 ? <FontAwesome name='lock' /> : ' '}</td>
      </tr>
    )
  }
}

const ShipInfoTableArea = connect(
  (state, props) => {
    const $shipTypes = get(state, 'const.$shipTypes', {})

    // construct shiptype filter array
    const shipTypeChecked = get(state.config, "plugin.ShipInfo.shipTypeChecked", Object.keys($shipTypes).slice().fill(true))
    const shipTypes = shipTypeChecked.reduce((types, checked, index) => {
      return checked && ((index + 1) in $shipTypes) ? types.concat([index + 1]) : types
    }, [] )

    // construct ship ids in expedition array, 10 is used here to support Kancolle in 2030
    const expeditionShips = [...Array(10).keys()].reduce((ships, fleetId) => {
      return fleetInExpeditionSelectorFactory(fleetId)(state) ?
        ships.concat(fleetShipsIdSelectorFactory(fleetId)(state))
        : ships
    }, [])

    // construct ship data for filter and sort
    const _ships = get(state, 'info.ships', {})
    const rows = Object.keys(_ships).map(shipId => {
      return shipTableDataSelectorFactory(parseInt(shipId))(state)
    })

    const fleetShips = [...Array(10).keys()].reduce((ships, fleetId) => {
      const ids = fleetShipsIdSelectorFactory(fleetId)(state)
      return typeof ids != 'undefined' ?
        ships.concat(ids)
        : ships
    }, [])


    return({
      ...shipInfoConfigSelector(state),
      shipTypes,
      expeditionShips,
      fleetShips,
      rows,
    })
  }
)(class ShipInfoTableArea extends Component{
  handleTypeFilter = memoize((type_id, shipTypes) => {
    return shipTypes.includes(type_id)
  })

  handleLvFilter = memoize((lv, lvRadio) => {
    switch(lvRadio){
    case 0:
      return true
    case 1:
      return lv == 1
    case 2:
      return lv >= 2
    case 3:
      return lv >= 100
    }
  })

  handleLockedFilter = memoize((locked, lockedRadio) => {
    switch(lockedRadio){
    case 0:
      return true
    case 1:
      return locked == 1
    case 2:
      return locked == 0
    }
  })

  handleExpeditionFilter = memoize((id, expeditionShips = [], expeditionRadio) => {
    switch(expeditionRadio){
    case 0:
      return true
    case 1:
      return expeditionShips.includes(id)
    case 2:
      return !expeditionShips.includes(id)
    }
  })

  handleModernizationFilter = memoize((isCompleted, modernizationRadio) => {
    switch(modernizationRadio){
    case 0:
      return true
    case 1:
      return isCompleted
    case 2:
      return !isCompleted
    }
  })

  handleRemodelFilter = memoize((after, remodelRadio) => {
    const remodelable = after != '0'
    switch (remodelRadio) {
    case 0:
      return true
    case 1:
      return remodelable
    case 2:
      return !remodelable  
    }
  })

  handleSallyAreaFilter = memoize((sallyArea, sallyAreaChecked = []) => {
    return sallyArea ? sallyAreaChecked[sallyArea] : true
  })

  handleInFleetFilter = memoize((id, fleetShips = [], inFleetRadio) => {
    switch(inFleetRadio){
    case 0:
      return true
    case 1:
      return fleetShips.includes(id)
    case 2:
      return !fleetShips.includes(id)
    }
  })

  handleSparkleFilter = memoize((cond, sparkleRadio) => {
    switch(sparkleRadio){
    case 0:
      return true
    case 1:
      return cond >= 50
    case 2:
      return cond < 50
    }
  })

  handleExSlotFilter = memoize((exslot, exSlotRadio) => {
    switch(exSlotRadio){
    case 0:
      return true
    case 1:
      return exslot != 0
    case 2:
      return exslot == 0
    }
  })


  handleShowRows = () => {
    const {remodelRadio, lvRadio, lockedRadio, expeditionRadio, modernizationRadio, 
      inFleetRadio, sparkleRadio, exSlotRadio,
      shipTypes, expeditionShips, fleetShips, sallyAreaChecked, rows, sortName, sortOrder} = this.props


    let showRows = rows.filter( (row={}) => 
      this.handleTypeFilter(row.type_id, shipTypes) &&
      this.handleLvFilter(row.lv, lvRadio) &&
      this.handleLockedFilter(row.locked, lockedRadio) &&
      this.handleExpeditionFilter(row.id, expeditionShips, expeditionRadio) &&
      this.handleModernizationFilter(row.isCompleted, modernizationRadio) &&
      this.handleRemodelFilter(row.after, remodelRadio) && 
      this.handleSallyAreaFilter(row.sallyArea, sallyAreaChecked) &&
      this.handleInFleetFilter(row.id, fleetShips, inFleetRadio) &&
      this.handleExSlotFilter(row.exslot, exSlotRadio) &&
      this.handleSparkleFilter(row.cond, sparkleRadio)
    )

    // sort
    switch(this.props.sortName) {
    case 'name':
      showRows.sort(nameCompare)
      break
    case 'karyoku':
      showRows = sortBy (showRows, (row) => row.karyoku)
      break
    case 'raisou':
      showRows = sortBy (showRows, (row) => row.raisou)
      break
    case 'taiku':
      showRows = sortBy (showRows, (row) => row.taiku)
      break
    case 'soukou':
      showRows = sortBy (showRows, (row) => row.soukou)
      break
    case 'lucky':
      showRows = sortBy (showRows, (row) => row.lucky)
      break
    case 'lv':
      // Sort rule of level in game (descending):
      // 1. level (descending)
      // 2. sortno (ascending)
      // 3. id (descending)
      showRows.sort ((a, b) =>{
        if (a.lv != b.lv) return a.lv - b.lv
        if (a.sortno != b.sortno) return -(a.sortno - b.sortno)
        if (a.id != b.id) return a.id - b.id
        return 0
      })
      break
    case 'type':
      showRows.sort ((a, b) => {
        if (a.type_id != b.type_id) return a.type_id - b.type_id
        if (a.sortno != b.sortno) return -(a.sortno - b.sortno)
        if (a.lv != b.lv) return a.lv - b.lv
        if (a.id != b.id) return a.id - b.id
        return 0
      })
      break
    default:
      showRows = sortBy (showRows, [sortName, 'api_id'])
    }

    if (!sortOrder) showRows.reverse()

    return showRows
  }

  sortRules = (name, order) => {
    config.set("plugin.ShipInfo.sortName", name)
    config.set("plugin.ShipInfo.sortOrder", order)
  }

  handleClickTitle = (title) => () => {
    if (this.props.sortName != title){
      let order = (title == 'id' || title == 'type' || title == 'name') ? 1 : 0
      this.sortRules(title, order)
    } else
      this.sortRules(this.props.sortName, (this.props.sortOrder + 1) % 2)
  }

  render(){
    const showRows = this.handleShowRows()
    const {sortName, sortOrder, pagedLayout} = this.props
    const types = [
      'id', 'type', 'name', 'soku', 'lv', 
      'cond', 'karyoku', 'raisou', 'taiku', 'soukou', 
      'lucky', 'kaihi', 'taisen', 'sakuteki', 'repairtime', 
      'Equipment', 'Lock',
    ]
    const titles = [
      'ID', 'Class', 'Name', 'Speed', 'Level', 
      'Cond', 'Firepower', 'Torpedo', 'AA', 'Armor', 
      'Luck', 'Evasion', 'ASW', 'LOS', 'Repair',
      'Equipment', 'Lock',
    ]
    const sortable = [
      true, true, true, true, true,
      true, true, true, true, true,
      true, true, true, true, true, 
      false, false,
    ]
    const centerAlign = [
      false, false, false, false, true, 
      true, true, true, true, true,
      true, true, true, true, true,
      false, false,
    ]

    const TitleHead = () =>
      <tr className='title-row'>
        <th>No.</th>
        {
          titles.map((title, index) => 
            <th
              key={index}
              onClick={sortable[index] ? this.handleClickTitle(types[index]) : ''}
              className={classNames({
                clickable: sortable[index],
                center: centerAlign[index],
                sorting: sortName == types[index],
                up: sortName == types[index] && sortOrder,
                down: sortName == types[index] && !sortOrder,
              })}
            >
              {__(title)}
            </th>
          )
        }
      </tr>

    const ShipRows = []

    showRows.map((row, index) =>{
      if (row) ShipRows.push(
        <ShipInfoTable
          key = {row.id}
          shipInfo = {row}
        />
      )
      if (index>=0 && (index + 1) % 15 == 0 && pagedLayout ) ShipRows.push(
        <TitleHead key={`head${index}`} />
      )
    })
    
    return(
      <div id="ship-info-show">
        <Divider text={__ ('Ship Girls Info')} icon={false}/>
        <div className="ship-info-table">
          <Table striped condensed hover>
            <thead>
              <TitleHead/>
            </thead>
            <tbody>
              {
                ShipRows
            }
            </tbody>
          </Table>
        </div>
      </div>
    )
  }
})

export default ShipInfoTableArea
