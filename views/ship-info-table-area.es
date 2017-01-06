import React, { Component } from 'react'
import { Panel, Table, Grid, Col, OverlayTrigger, Tooltip, Label } from 'react-bootstrap'
import Path from 'path'
import { SlotitemIcon } from 'views/components/etc/icon'
import FontAwesome from 'react-fontawesome'
import { isEqual, clone, sortBy, get } from 'lodash'
import { connect } from 'react-redux'

import Divider from './divider'
import { shipTypeMap } from './constants'

const { ROOT, __, resolveTime, getStore } = window

const collator = new Intl.Collator()
const jpCollator = new Intl.Collator("ja-JP")

const nameCompare = (a, b) => {
  if (a.yomi == b.yomi) {
    return a.lv == b.lv ? collator.compare(a.id, b.id) : collator.compare(a.lv, b.lv)
  } else {
    return jpCollator.compare(a.yomi, b.yomi)
  }
}

const resultPanelTitle = <h3>{__('Ship Girls Info')}</h3>

const Slotitems = (props) => {
  const {$slotitems, _slotitems} = window
  const {slot, exslot} = props
  return(
    <div className="slotitem-container">
    {
      _slotitems && $slotitems &&
      slot.concat(exslot).map( (itemId, i) => {
        const item = _slotitems[itemId] || {}
        return(
          Object.keys(item).length > 0 &&
          <span key={itemId} >
            <OverlayTrigger placement='top' overlay={
              <Tooltip id="item-#{itemId}">
                {window.i18n.resources.__(item.api_name)}
                {
                  item.api_level > 0 ? 
                    <strong style={{color: '#45A9A5'}}>★+{item.api_level}</strong> 
                  : ''}
                {
                  item.api_alv && item.api_alv <= 7 && item.api_alv >= 1 ?
                    <img 
                      className='alv-img' 
                      src={Path.join(ROOT, 'assets', 'img', 'airplane', "alv#{item.api_alv}.png")} 
                    />
                  : ''
                }
              </Tooltip>}
            >
              <span>
                <SlotitemIcon slotitemId={item.api_type[3]}/>
              </span>
            </OverlayTrigger>
          </span>
        )
      })
    }
    </div>
  )
}

const SallyArea = connect(
  (state, props) =>{
    const area = props.area || -1
    const mapname = get(state, `fcd.shiptag.mapname.${area}`, '')
    const color = get(state, `fcd.shiptag.color.${area}`, '')

    return({
      area,
      mapname,
      color,
    })
  }
)(class SallyArea extends Component{
  shouldComponentUpdate = (nextProps, nextState) => {
    return nextProps.area != this.props.area ||
      nextProps.mapname != this.props.mapname ||
      nextProps.color != this.props.color
  }

  render(){
    const {area, mapname, color, info_id} = this.props
    return(
        area >= 0 ? 
          <OverlayTrigger 
            placement="top" 
            overlay={
              <Tooltip id={`sally-area-${info_id}`}>
                {__('Ship tag: %s'), mapname}
              </Tooltip>
            }
          >
            <Label style={{color: color}}>
              <FontAwesome name='tag' />
            </Label>
          </OverlayTrigger>
        : 
          <Label className="status-label text-default" style={{opacity: 0}}></Label>

    )
  }


})


class ShipInfoTable extends Component {
  shouldComponentUpdate = (nextProps, nextState) => {
    const {shipInfo} = this.props
    return !isEqual(nextProps.shipInfo, shipInfo)
  }

  render() {
    const {shipInfo} = this.props

    let karyokuNow = shipInfo.houg[0] + shipInfo.kyouka[0]
    let karyokuMax = shipInfo.karyoku[1]
    let karyoku = shipInfo.karyoku[0]
    let raisouNow = shipInfo.raig[0] + shipInfo.kyouka[1]
    let raisouMax = shipInfo.raisou[1]
    let raisou = shipInfo.raisou[0]
    let taikuNow = shipInfo.tyku[0] + shipInfo.kyouka[2]
    let taikuMax = shipInfo.taiku[1]
    let taiku = shipInfo.taiku[0]
    let soukouNow = shipInfo.souk[0] + shipInfo.kyouka[3]
    let soukouMax = shipInfo.soukou[1]
    let soukou = shipInfo.soukou[0]
    let luckyNow = shipInfo.luck[0] + shipInfo.kyouka[4]
    let luckyMax = shipInfo.lucky[1]
    let lucky = shipInfo.lucky[0]
    let lv = shipInfo.lv
    let nowhp = shipInfo.nowhp
    let maxhp = shipInfo.maxhp
    let losshp = shipInfo.losshp
    let repairtime = shipInfo.repairtime

    let locked = shipInfo.locked

    let karyokuClass = 'td-karyoku'
    let raisouClass = 'td-raisou'
    let taikuClass = 'td-taiku'
    let soukouClass = 'td-soukou'
    let luckyClass = 'td-lucky'

    let karyokuToInc = karyokuMax - karyokuNow
    let karyokuString = '+' + karyokuToInc
    let raisouToInc = raisouMax - raisouNow
    let raisouString = '+' + raisouToInc
    let taikuToInc = taikuMax - taikuNow
    let taikuString = '+' + taikuToInc
    let soukouToInc = soukouMax - soukouNow
    let soukouString = '+' + soukouToInc
    let luckyToInc = luckyMax - luckyNow
    let luckyString = '+' + luckyToInc

    if (karyokuNow >= karyokuMax) {
      karyokuClass = 'td-karyoku-max'
      karyokuString = 'MAX'
    }
    if (raisouNow >= raisouMax) {
      raisouClass = 'td-raisou-max'
      raisouString = 'MAX'
    }
    if (taikuNow >= taikuMax) {
      taikuClass = 'td-taiku-max'
      taikuString = 'MAX'
    }
    if (soukouNow >= soukouMax) {
      soukouClass = 'td-soukou-max'
      soukouString = 'MAX'
    }
    if (luckyNow >= luckyMax) {
      luckyClass = 'td-lucky-max'
      luckyString = 'MAX'
    }

    let repairColor
    if (nowhp * 4 <= maxhp) {
      repairColor = 'rgba(255, 0, 0, 0.4)'
    } else if (nowhp * 2 <= maxhp) {
      repairColor = 'rgba(255, 65, 0, 0.4)'
    } else if (nowhp * 4 <= maxhp * 3) {
      repairColor = 'rgba(255, 255, 0, 0.4)'
    } else {
      repairColor = 'transparent'
    }

    let condColor
    if (shipInfo.cond >= 0 && shipInfo.cond < 20) {
      condColor = 'rgba(255, 0, 0, 0.4)'
    } else if (shipInfo.cond >= 20 && shipInfo.cond < 30) {
      condColor = 'rgba(255, 165, 0, 0.4)'
    } else if (shipInfo.cond >= 50 && shipInfo.cond <= 100){
      condColor = 'rgba(255, 255, 0, 0.4)'
    } else {
      condColor = 'transparent'
    }


    return(
      <tr>
        <td></td>
        <td>{shipInfo.id}</td>
        <td>{window.i18n.resources.__ (shipInfo.type)}</td>
        <td className="ship-name">{window.i18n.resources.__ (shipInfo.name)}
          <SallyArea area={shipInfo.sallyArea} info_id={shipInfo.id}/>
        </td>
        <td className='center'>{shipInfo.lv}</td>
        <td className='center' style={{backgroundColor: condColor}}>{shipInfo.cond}</td>
        <td className={karyokuClass}>{karyoku + '/'}<span style={{fontSize: '80%'}}>{karyokuString}</span></td>
        <td className={raisouClass}>{raisou + '/'}<span style={{fontSize: '80%'}}>{raisouString}</span></td>
        <td className={taikuClass}>{taiku + '/'}<span style={{fontSize: '80%'}}>{taikuString}</span></td>
        <td className={soukouClass}>{soukou + '/'}<span style={{fontSize: '80%'}}>{soukouString}</span></td>
        <td className={luckyClass}>{lucky + '/'}<span style={{fontSize: '80%'}}>{luckyString}</span></td>
        <td className='center'>{shipInfo.kaihi}</td>
        <td className='center'>{shipInfo.taisen}</td>
        <td className='center'>{shipInfo.sakuteki}</td>
        <td className='center' style={{backgroundColor: repairColor}}>
          {
            repairtime &&
              <OverlayTrigger placement="top" 
                overlay={
                  <Tooltip id="repairtime1hp">
                  { `1HP : ${resolveTime(repairtime / losshp)}` }
                  </Tooltip>}
              >
                <span>{resolveTime(shipInfo.repairtime)}</span>
              </OverlayTrigger>

          }
        </td>
        <td><Slotitems slot={shipInfo.slot} exslot={shipInfo.exslot} /></td>
        <td>{locked == 1 ? <FontAwesome name='lock' /> : ' '}</td>
      </tr>
    )
  }
}

const ShipInfoTableArea = connect(
  (state, props) => {
    const $shipTypes = state.const.$shipTypes
    const $ships = state.const.$ships
    const _ships = state.info.ships

    // construct shiptype filter array
    const shipTypeChecked = config.get("plugin.ShipInfo.shipTypeChecked", shipTypeMap.slice().fill(true))
    const shipTypes = shipTypeChecked.reduce((types, checked, index) => {
      return checked ? types.concat(shipTypeMap[index].id) : types
    }, [] )

    // construct ships in expedition array
    const decks = get(state, 'info.fleets', [])
    const expeditionShips = decks.reduce((ships, fleet) => {
      return fleet.api_mission[0] == 1 ?
        ships.concat(fleet.api_ship.filter(id => id > 0))
        : ships
    }, [])

    const mapname = get(state, 'fcd.shiptag.mapname', [])

    const rows = []
    Object.keys(_ships).map(_shipId => {
      const ship = _ships[_shipId]
      const $ship = $ships[ship.api_ship_id]
      const row = {
        id: ship.api_id,
        type_id: $ships[ship.api_ship_id].api_stype,
        type: $shipTypes[$ships[ship.api_ship_id].api_stype].api_name,
        name: $ships[ship.api_ship_id].api_name,
        yomi: $ships[ship.api_ship_id].api_yomi,
        sortno: $ships[ship.api_ship_id].api_sortno,
        lv:  ship.api_lv,
        cond: ship.api_cond,
        karyoku: ship.api_karyoku,
        houg: $ship.api_houg,
        raisou: ship.api_raisou,
        raig: $ship.api_raig,
        taiku: ship.api_taiku,
        tyku: $ship.api_tyku,
        soukou: ship.api_soukou,
        souk: $ship.api_souk,
        lucky: ship.api_lucky,
        luck: $ship.api_luck,
        kyouka: ship.api_kyouka,
        kaihi: ship.api_kaihi[0],
        taisen: ship.api_taisen[0],
        sakuteki: ship.api_sakuteki[0],
        slot: clone(ship.api_slot),
        exslot: ship.api_slot_ex,
        locked: ship.api_locked,
        nowhp: ship.api_nowhp,
        maxhp: ship.api_maxhp,
        losshp: ship.api_maxhp - ship.api_nowhp,
        repairtime: parseInt (ship.api_ndock_time / 1000.0),
        after: $ship.api_aftershipid,
        sallyArea: ship.api_sally_area,
      }
      rows.push(row)
    })

    return({
      sortName: config.get("plugin.ShipInfo.sortName", "lv"),
      sortOrder: config.get ("plugin.ShipInfo.sortOrder", 0),
      lvRadio: config.get ("plugin.ShipInfo.lvRadio", 2),
      lockedRadio: config.get ("plugin.ShipInfo.lockedRadio", 1),
      expeditionRadio: config.get ("plugin.ShipInfo.expeditionRadio", 0),
      modernizationRadio: config.get ("plugin.ShipInfo.modernizationRadio", 0),
      remodelRadio: config.get ("plugin.ShipInfo.remodelRadio", 0),
      sallyAreaChecked: config.get("plugin.ShipInfo.sallyAreaChecked", mapname.slice().fill(true)),
      shipTypes,
      expeditionShips,
      rows,
      show: true,
    })
  }
)(class ShipInfoTableArea extends Component{
  handleTypeFilter = (type_id, shipTypes) => {
    return shipTypes.includes(type_id)
  }

  handleLvFilter = (lv) => {
    switch(this.props.lvRadio){
    case 0:
      return true
    case 1:
      return lv == 1
    case 2:
      return lv >= 2
    }
  }

  handleLockedFilter = (locked) => {
    switch(this.props.lockedRadio){
    case 0:
      return true
    case 1:
      return locked == 1
    case 2:
      return locked == 0
    }
  }

  handleExpeditionFilter = (id, expeditionShips = []) => {
    switch(this.props.expeditionRadio){
    case 0:
      return true
    case 1:
      return expeditionShips.includes(id)
    case 2:
      return !expeditionShips.includes(id)
    }
  }

  handleModernizationFilter = (ship) => {
    let karyokuNow = ship.houg[0] + ship.kyouka[0]
    let karyokuMax = ship.karyoku[1]
    let raisouNow = ship.raig[0] + ship.kyouka[1]
    let raisouMax = ship.raisou[1]
    let taikuNow = ship.tyku[0] + ship.kyouka[2]
    let taikuMax = ship.taiku[1]
    let soukouNow = ship.souk[0] + ship.kyouka[3]
    let soukouMax = ship.soukou[1]
    let isCompleted = karyokuNow >= karyokuMax &&
                  raisouNow >= raisouMax &&
                  taikuNow >= taikuMax &&
                  soukouNow >= soukouMax
    switch(this.props.modernizationRadio){
    case 0:
      return true
    case 1:
      return isCompleted
    case 2:
      return !isCompleted
    }
  }

  handleRemodelFilter = (ship) => {
    const remodelable = ship.after != '0'
    switch (this.props.remodelRadio) {
    case 0:
      return true
    case 1:
      return remodelable
    case 2:
      return !remodelable  
    }
  }

  handleSallyAreaFilter = (sallyArea) => {
    return sallyArea ? this.props.sallyAreaChecked[sallyArea] : true
  }

  handleShowRows = () => {
    const {remodelRadio, lvRadio, lockedRadio, expeditionRadio, modernizationRadio, 
      shipTypes, expeditionShips} = this.props
    console.log(remodelRadio, lvRadio, lockedRadio, expeditionRadio, modernizationRadio, shipTypes, expeditionShips)
    

    const {rows} = this.props || []
    let showRows = rows.filter( row => 
      this.handleTypeFilter(row.type_id, shipTypes) &&
      this.handleLvFilter(row.lv) &&
      this.handleLockedFilter(row.locked) &&
      this.handleExpeditionFilter(row.id, expeditionShips) &&
      this.handleModernizationFilter(row) &&
      this.handleRemodelFilter(row) && 
      this.handleSallyAreaFilter(row.sallyArea)  
    )

    // sort
    switch(this.props.sortName) {
    case 'name':
      showRows.sort(nameCompare)
      break
    case 'karyoku':
      showRows = sortBy (showRows, (row) => row.karyoku[0])
      break
    case 'raisou':
      showRows = sortBy (showRows, (row) => row.raisou[0])
      break
    case 'taiku':
      showRows = sortBy (showRows, (row) => row.taiku[0])
      break
    case 'soukou':
      showRows = sortBy (showRows, (row) => row.soukou[0])
      break
    case 'lucky':
      showRows = sortBy (showRows, (row) => row.lucky[0])
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
      showRows = sortBy (showRows, this.props.sortName)
    }

    if (!this.props.sortOrder) showRows.reverse()

    return showRows
  }

  sortRules = (name, order) => {
    config.set ("plugin.ShipInfo.sortName", name)
    config.set ("plugin.ShipInfo.sortOrder", order)  
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
    console.log(showRows)
    return(
      <div id="ship-info-show">
        <Divider text={__ ('Ship Girls Info')} icon={false}/>
        <div className="ship-info-table">
          <Table striped condensed hover>
            <thead>
              <tr>
                <th>No.</th>
                <th className='clickable' onClick={this.handleClickTitle('id')}>{__ ('ID')}</th>
                <th className='clickable' onClick={this.handleClickTitle('type')}>{__ ('Class')}</th>
                <th className='clickable' onClick={this.handleClickTitle('name')}>{__ ('Name')}</th>
                <th className='center clickable' onClick={this.handleClickTitle('lv')}>{__ ('Level')}</th>
                <th className='center clickable' onClick={this.handleClickTitle('cond')}>{__ ('Cond')}</th>
                <th className='center clickable' onClick={this.handleClickTitle('karyoku')}>{__ ('Firepower')}</th>
                <th className='center clickable' onClick={this.handleClickTitle('raisou')}>{__ ('Torpedo')}</th>
                <th className='center clickable' onClick={this.handleClickTitle('taiku')}>{__ ('AA')}</th>
                <th className='center clickable' onClick={this.handleClickTitle('soukou')}>{__ ('Armor')}</th>
                <th className='center clickable' onClick={this.handleClickTitle('lucky')}>{__ ('Luck')}</th>
                <th className='center clickable' onClick={this.handleClickTitle('kaihi')}>{__ ('Evasion')}</th>
                <th className='center clickable' onClick={this.handleClickTitle('taisen')}>{__ ('ASW')}</th>
                <th className='center clickable' onClick={this.handleClickTitle('sakuteki')}>{__ ('LOS')}</th>
                <th className='center clickable' onClick={this.handleClickTitle('repairtime')}>{__ ('Repair')}</th>
                <th>{__ ('Equipment')}</th>
                <th>{__ ('Lock')}</th>
              </tr>
            </thead>
            <tbody>
            {
                showRows.map((row, indx) =>
                  <ShipInfoTable
                    key = {row.id}
                    shipInfo = {row}
                    tagStyles={this.props.tagStyles}
                    sallyTags={this.props.sallyTags}
                  />
                )
            }
            </tbody>
          </Table>
        </div>
      </div>
    )
  }
})

export default ShipInfoTableArea
