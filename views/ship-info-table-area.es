const {_, React, ReactBootstrap, ROOT, resolveTime, __, FontAwesome} = window
const {Table, OverlayTrigger, Tooltip, Label} = ReactBootstrap
import Divider from './divider'
import Path from 'path'
//import {SlotitemIcon} from "#{ROOT}/views/components/etc/icon"

import ShipDataGenerator from './ship-data'

const nameCompare = function(){
  const collator = new Intl.Collator()
  const jpCollator = new Intl.Collator("ja-JP")
  return function(a, b){
    return jpCollator.compare(a.yomi, b.yomi)
        || collator.compare(a.lv, b.lv)
        || collator.compare(a.id, b.id)
  }
}()

const lvCompare = function(a,b) {
  // Sort rule of level in game (descending):
  // 1. level (descending)
  // 2. sortno (ascending)
  // 3. id (descending)
  return a.lv - b.lv
      || -(a.sortno - b.sortno)
      || a.id - b.id
}

const typeCompare = function(a,b){
  // Sort rule of type in game (descending):
  // 1. ship_type_id (descending)
  // 2. sortno (ascending)
  // 3. level (descending)
  // 4. id (descending)
  return a.type_id - b.type_id
      || -(a.sortno - b.sortno)
      || a.lv - b.lv
      || a.id - b.id
}

const Slotitems = React.createClass({
  getBackgroundStyle: function(){
    return window.isDarkTheme ? {backgroundColor: 'rgba(33, 33, 33, 0.7)'}
      : {backgroundColor: 'rgba(256, 256, 256, 0.7)'}
  },
  render: function(){
    const {$slotitems, _slotitems} = window
    const spans = []
    if (typeof _slotitems !== "undefined" && _slotitems !== null
        && typeof $slotitems !== "undefined" && $slotitems !== null){
      for (const itemId of this.props.slot.concat(this.props.exslot)){
        if (itemId <= 0)
          continue
        const item = _slotitems[itemId]
        if (typeof item === "undefined" || item === null)
        // We could not get the latest _slotItems when receiving '/port'
          continue
        spans.push(
          <span key={itemId} >
            <OverlayTrigger placement='top' overlay={
              <Tooltip id={`item-${itemId}`}>
                {window.i18n.resources.__(item.api_name)}
                {item.api_level > 0 ? <strong style={{color: '#45A9A5'}}>★+{item.api_level}</strong> : ''}
                {
                  typeof item.api_alv !== "undefined" && item.api_alv !== null && 1 <= item.api_alv && item.api_alv <= 7 ?
                    <img className='alv-img' src={Path.join(ROOT, 'assets', 'img', 'airplane', "alv#{item.api_alv}.png")} />
                  : null
                }
              </Tooltip>
            }>
              <span>
                {
                  null//<SlotitemIcon slotitemId={item.api_type[3]}/>
                }
              </span>
            </OverlayTrigger>
          </span>
        )
      }
    }
    return(
      <div className="slotitem-container">
      {
        spans
      }
      </div>
    )
  },
})

const SallyArea = React.createClass({
  render: function(){
    const {label, sallyTags, tagStyles} = this.props

    if (typeof label === "undefined" || label === null || label === 0)
      return (<Label className="status-label text-default" style={{opacity: 0}}></Label>)
    else if (label < sallyTags.length - 1)
      return(
        <OverlayTrigger placement="top" overlay={<Tooltip id="sally-area-#{label}">{__( 'Ship tag: %s', sallyTags[label])}</Tooltip>}>
          <Label bsStyle={tagStyles[label]}><FontAwesome name='tag' /></Label>
        </OverlayTrigger>
      )
    else
      return(
        <OverlayTrigger placement="top" overlay={<Tooltip id="sally-area-#{label}">{__( 'Ship tag: %s', sallyTags[sallyTags.length - 1])}</Tooltip>}>
          <Label bsStyle={tagStyles[tagStyles.length - 1]}><FontAwesome name='tag' /></Label>
        </OverlayTrigger>
      )
  },
})

const ShipInfoTable = React.createClass({
  shouldComponentUpdate: function(nextProps, nextState){
    if (nextProps.dataVersion !== this.props.dataVersion)
      if ( !_.isEqual(nextProps.shipInfo, this.props.shipInfo))
        return true
    return false
  },
  render: function(){
    const ship = this.props.shipInfo

    const karyokuClass = ship.karyoku_togo > 0 ? 'td-karyoku' : 'td-karyoku-max'
    const raisouClass = ship.raisou_togo > 0 ? 'td-raisou' : 'td-raisou-max'
    const taikuClass = ship.taiku_togo > 0 ? 'td-taiku' : 'td-taiku-max'
    const soukouClass = ship.soukou_togo > 0 ? 'td-soukou' : 'td-soukou-max'
    const luckyClass = ship.lucky_togo > 0 ? 'td-lucky' : 'td-lucky-max'

    const karyokuString = ship.karyoku_togo > 0 ? '+' + ship.karyoku_togo : "MAX"
    const raisouString = ship.raisou_togo > 0 ? '+' + ship.raisou_togo : "MAX"
    const taikuString = ship.taiku_togo > 0 ? '+' + ship.taiku_togo : "MAX"
    const soukouString = ship.soukou_togo > 0 ? '+' + ship.soukou_togo : "MAX"
    const luckyString = ship.lucky_togo > 0 ? '+' + ship.lucky_togo : "MAX"

    let repairColor = (ship.nowhp * 4 <= ship.maxhp) ? 'rgba(255, 0, 0, 0.4)'
                      : (ship.nowhp * 2 <= ship.maxhp) ? 'rgba(255, 65, 0, 0.4)'
                        : (ship.nowhp * 4 <= ship.maxhp * 3) ? 'rgba(255, 255, 0, 0.4)'
                          : 'transparent'

    let condColor = this.props.shipInfo.cond < 20 ? 'rgba(255, 0, 0, 0.4)'
                    : this.props.shipInfo.cond < 30 ? 'rgba(255, 165, 0, 0.4)'
                      : this.props.shipInfo.cond >= 50 ? 'rgba(255, 255, 0, 0.4)'
                        : 'transparent'
    return (
      <tr>
        <td></td>
        <td>{ship.id}</td>
        <td>{window.i18n.resources.__(ship.type)}</td>
        <td className="ship-name">{window.i18n.resources.__(ship.name)}
          <SallyArea label={this.props.shipInfo.sallyArea} tagStyles={this.props.tagStyles} sallyTags={this.props.sallyTags}/>
        </td>
        <td className='center'>{ship.lv}</td>
        <td className='center' style={{backgroundColor: condColor}}>{ship.cond}</td>
        <td className={karyokuClass}>{ship.karyoku + '/'}<span style={{fontSize: '80%'}}>{karyokuString}</span></td>
        <td className={raisouClass}>{ship.raisou + '/'}<span style={{fontSize: '80%'}}>{raisouString}</span></td>
        <td className={taikuClass}>{ship.taiku + '/'}<span style={{fontSize: '80%'}}>{taikuString}</span></td>
        <td className={soukouClass}>{ship.soukou + '/'}<span style={{fontSize: '80%'}}>{soukouString}</span></td>
        <td className={luckyClass}>{ship.lucky + '/'}<span style={{fontSize: '80%'}}>{luckyString}</span></td>
        <td className='center'>{ship.kaihi}</td>
        <td className='center'>{ship.taisen}</td>
        <td className='center'>{ship.sakuteki}</td>
        <td className='center' style={{backgroundColor: repairColor}}>
          {
            ship.repairtime > 0 ?
              <OverlayTrigger placement="top" overlay={<Tooltip id="repairtime1hp">{ "1HP : #{resolveTime (repairtime / losshp)}" }</Tooltip>}>
                <span>{resolveTime(ship.repairtime)}</span>
              </OverlayTrigger>
              : null

          }
        </td>
        <td><Slotitems slot={ship.slot} exslot={ship.exslot} /></td>
        <td>{ship.locked == 1 ? <FontAwesome name='lock' /> : ' '}</td>
      </tr>
    )
  },
})

const ShipInfoTableArea = React.createClass({
  getInitialState: function(){
    return {
      rows: [],
      show: false,
      dataVersion: 0,
    }
  },
  handleResponse: function(e){
    const {path, body} = e.detail
    const {_ships} = window
    let {rows} = this.state
    let rowsUpdateFlag = false
    const DataGenerator = new ShipDataGenerator(window.$ships,window.$shipTypes)
    switch (path){
      case '/kcsapi/api_port/port':
      case '/kcsapi/api_req_kousyou/destroyship':
      case '/kcsapi/api_req_kaisou/powerup':
      case '/kcsapi/api_get_member/ship3':
      case '/kcsapi/api_get_member/unsetslot':{
        rowsUpdateFlag = true
        rows = []
        for (const ship of _ships){
          if (typeof ship === "undefined")
            continue
          rows.push(DataGenerator.getData(ship))
        }
        break
      }
      case '/kcsapi/api_req_kousyou/getship':{
        rowsUpdateFlag = true
        const ship = body.api_ship
        rows.push(DataGenerator.getData(ship))
        break
      }
    }
    if (rowsUpdateFlag)
      if (this.state.dataVersion > 12450)
        this.setState({
          rows: rows,
          show: true,
          dataVersion: 1,
        })
      else
        this.setState({
          rows: rows,
          show: true,
          dataVersion: this.state.dataVersion + 1,
        })
  },
  handleTypeFilter: function(type, shipTypes){
    return shipTypes.indexOf(type) !== -1
  },
  handleLvFilter: function(lv){
    switch (this.props.lvRadio){
    case 0:
      return true
    case 1:
      return lv == 1
    case 2:
      return  lv >= 2
    }
  },
  handleLockedFilter: function(locked) {
    switch (this.props.lockedRadio){
    case 0:
      return true
    case 1:
      return locked == 1
    case 2:
      return locked == 0
    }
  },
  handleExpeditionFilter: function(id, expeditionShips){
    switch (this.props.expeditionRadio){
    case 0:
      return true
    case 1:
      return expeditionShips.indexOf(id) !== -1
    case 2:
      return expeditionShips.indexOf(id) === -1
    }
  },
  handleModernizationFilter: function(ship){
    const isCompleted = ship.karyoku_togo <= 0
                    && ship.raisou_togo <= 0
                    && ship.taiku_togo <= 0
                    && ship.soukou_togo <= 0

    switch (this.props.modernizationRadio){
    case 0:
      return true
    case 1:
      return isCompleted
    case 2:
      return !isCompleted
    }
  },
  handleRemodelFilter: function(ship){
    const remodelable = ship.after != "0"
    switch (this.props.remodelRadio){
    case 0:
      return true
    case 1:
      return !remodelable
    case 2:
      return remodelable
    }
  },
  handleSallyAreaFilter: function(sallyArea){
    return (typeof sallyArea !== "undefined" && sallyArea !== null) ? this.props.sallyAreaBoxes[sallyArea] : true
  },
  handleShowRows: function(){
    //typeFilterPreprocess
    const $shipTypes = window.$shipTypes
    const shipTypes = []
    if (typeof $shipTypes !== "undefined" && $shipTypes !== null)
      for (const x of this.props.shipTypeBoxes)
        shipTypes.push($shipTypes[x].api_name)
    //expeditionFilterPreprocess
    const decks = window._decks
    const expeditionShips = []
    if (typeof decks !== "undefined" && decks !== null)
      for (const deck of decks)
        if (deck.api_mission[0] === 1)
          for (const shipId of deck.api_ship){
            if (shipId == -1)
              continue
            expeditionShips.push(shipId)
          }
    //filter
    let showRows = []
    for (const row of this.state.rows)
      if (this.handleTypeFilter(row.type, shipTypes) &&
         this.handleLvFilter(row.lv) &&
         this.handleLockedFilter(row.locked) &&
         this.handleExpeditionFilter(row.id, expeditionShips) &&
         this.handleModernizationFilter(row) &&
         this.handleRemodelFilter(row) &&
         this.handleSallyAreaFilter(row.sallyArea))
         showRows.push(row)
    //showRowsSort
    switch (this.props.sortName){
      case 'name':
        showRows = showRows.sort(nameCompare)
        break
      case 'lv':
        showRows = showRows.sort(lvCompare)
        break
      case 'type':
        showRows = showRows.sort(typeCompare)
        break
      default:
        showRows = _.sortBy (showRows, this.props.sortName)
    }
    if (!this.props.sortOrder)
      showRows.reverse()
    return  showRows
  },
  handleClickTitle: function(title) {
    if (this.props.sortName !== title){
      const order =  title === 'id' || title === 'type' || title === 'name' ? 1 : 0
      this.props.sortRules(title, order)
    }else{
      this.props.sortRules(this.props.sortName, (this.props.sortOrder + 1) % 2)
    }
  },
  componentDidMount: function(){
    this.setState({
      rows: this.state.rows,
      show: true,
      dataVersion: this.state.dataVersion + 1,
    })
    window.addEventListener ('game.response', this.handleResponse)
  },
  componentWillUnmount: function(){
    this.setState({
      rows: this.state.rows,
      show: false,
    })
    window.removeEventListener ('game.response', this.handleResponse)
  },
  render: function(){
    let showRows = []
    if (this.state.show){
      showRows = this.handleShowRows().map((row)=>
                  <ShipInfoTable
                    key = {row.id}
                    shipInfo = {row}
                    dataVersion = {this.state.dataVersion}
                    tagStyles={this.props.tagStyles}
                    sallyTags={this.props.sallyTags}
                  />)
    }
    return (
      <div id="ship-info-show">
        <Divider text={__( 'Ship Girls Info')} icon={false}/>
        <div className="ship-info-table">
          <Table striped condensed hover>
            <thead>
              <tr>
                <th>No.</th>
                <th className='clickable' onClick={this.handleClickTitle.bind(this, 'id')}>{__( 'ID')}</th>
                <th className='clickable' onClick={this.handleClickTitle.bind(this, 'type')}>{__( 'Class')}</th>
                <th className='clickable' onClick={this.handleClickTitle.bind (this, 'name')}>{__( 'Name')}</th>
                <th className='center clickable' onClick={this.handleClickTitle.bind (this, 'lv')}>{__( 'Level')}</th>
                <th className='center clickable' onClick={this.handleClickTitle.bind (this, 'cond')}>{__( 'Cond')}</th>
                <th className='center clickable' onClick={this.handleClickTitle.bind (this, 'karyoku')}>{__( 'Firepower')}</th>
                <th className='center clickable' onClick={this.handleClickTitle.bind (this, 'raisou')}>{__( 'Torpedo')}</th>
                <th className='center clickable' onClick={this.handleClickTitle.bind (this, 'taiku')}>{__( 'AA')}</th>
                <th className='center clickable' onClick={this.handleClickTitle.bind (this, 'soukou')}>{__( 'Armor')}</th>
                <th className='center clickable' onClick={this.handleClickTitle.bind (this, 'lucky')}>{__( 'Luck')}</th>
                <th className='center clickable' onClick={this.handleClickTitle.bind (this, 'kaihi')}>{__( 'Evasion')}</th>
                <th className='center clickable' onClick={this.handleClickTitle.bind (this, 'taisen')}>{__( 'ASW')}</th>
                <th className='center clickable' onClick={this.handleClickTitle.bind (this, 'sakuteki')}>{__( 'LOS')}</th>
                <th className='center clickable' onClick={this.handleClickTitle.bind (this, 'repairtime')}>{__( 'Repair')}</th>
                <th>{__( 'Equipment')}</th>
                <th>{__( 'Lock')}</th>
              </tr>
            </thead>
            <tbody>
            {
              showRows
            }
            </tbody>
          </Table>
        </div>
      </div>)
  },
})


module.exports = ShipInfoTableArea
