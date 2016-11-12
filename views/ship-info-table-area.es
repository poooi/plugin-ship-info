const {_, React, ReactBootstrap, ROOT, resolveTime, __, FontAwesome} = window
const {Table, OverlayTrigger, Tooltip, Label} = ReactBootstrap
import Divider from './divider'
import Path from 'path'
//import {SlotitemIcon} from "#{ROOT}/views/components/etc/icon"

const collator = new Intl.Collator()
const jpCollator = new Intl.Collator("ja-JP")

const nameCompare = function(a, b){
  return  jpCollator.compare(a.yomi, b.yomi)
    || collator.compare(a.lv, b.lv)
    || collator.compare(a.id, b.id)
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
                  ""//<SlotitemIcon slotitemId={item.api_type[3]}/>
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
    const karyokuNow = this.props.shipInfo.houg[0] + this.props.shipInfo.kyouka[0]
    const karyokuMax = this.props.shipInfo.karyoku[1]
    const karyoku = this.props.shipInfo.karyoku[0]
    const raisouNow = this.props.shipInfo.raig[0] + this.props.shipInfo.kyouka[1]
    const raisouMax = this.props.shipInfo.raisou[1]
    const raisou = this.props.shipInfo.raisou[0]
    const taikuNow = this.props.shipInfo.tyku[0] + this.props.shipInfo.kyouka[2]
    const taikuMax = this.props.shipInfo.taiku[1]
    const taiku = this.props.shipInfo.taiku[0]
    const soukouNow = this.props.shipInfo.souk[0] + this.props.shipInfo.kyouka[3]
    const soukouMax = this.props.shipInfo.soukou[1]
    const soukou = this.props.shipInfo.soukou[0]
    const luckyNow = this.props.shipInfo.luck[0] + this.props.shipInfo.kyouka[4]
    const luckyMax = this.props.shipInfo.lucky[1]
    const lucky = this.props.shipInfo.lucky[0]
    const nowhp = this.props.shipInfo.nowhp
    const maxhp = this.props.shipInfo.maxhp
    const repairtime = this.props.shipInfo.repairtime

    const locked = this.props.shipInfo.locked

    let karyokuClass = 'td-karyoku'
    let raisouClass = 'td-raisou'
    let taikuClass = 'td-taiku'
    let soukouClass = 'td-soukou'
    let luckyClass = 'td-lucky'

    const karyokuToInc = karyokuMax - karyokuNow
    let karyokuString = '+' + karyokuToInc
    const raisouToInc = raisouMax - raisouNow
    let raisouString = '+' + raisouToInc
    const taikuToInc = taikuMax - taikuNow
    let taikuString = '+' + taikuToInc
    const soukouToInc = soukouMax - soukouNow
    let soukouString = '+' + soukouToInc
    const luckyToInc = luckyMax - luckyNow
    let luckyString = '+' + luckyToInc

    if (karyokuNow >= karyokuMax)
      karyokuClass = 'td-karyoku-max'
    karyokuString = 'MAX'
    if (raisouNow >= raisouMax)
      raisouClass = 'td-raisou-max'
    raisouString = 'MAX'
    if (taikuNow >= taikuMax)
      taikuClass = 'td-taiku-max'
    taikuString = 'MAX'
    if (soukouNow >= soukouMax)
      soukouClass = 'td-soukou-max'
    soukouString = 'MAX'
    if (luckyNow >= luckyMax)
      luckyClass = 'td-lucky-max'
    luckyString = 'MAX'

    let repairColor 
    if (nowhp * 4 <= maxhp)
      repairColor = 'rgba(255, 0, 0, 0.4)'
    else if (nowhp * 2 <= maxhp)
      repairColor = 'rgba(255, 65, 0, 0.4)'
    else if (nowhp * 4 <= maxhp * 3)
      repairColor = 'rgba(255, 255, 0, 0.4)'
    else
      repairColor = 'transparent'

    let condColor
    if (this.props.shipInfo.cond >= 0 && this.props.shipInfo.cond < 20)
      condColor = 'rgba(255, 0, 0, 0.4)'
    else if (this.props.shipInfo.cond >= 20 && this.props.shipInfo.cond < 30)
      condColor = 'rgba(255, 165, 0, 0.4)'
    else if (this.props.shipInfo.cond >= 50 && this.props.shipInfo.cond <= 100)
      condColor = 'rgba(255, 255, 0, 0.4)'
    else
      condColor = 'transparent'

    return (<tr>
      <td></td>
      <td>{this.props.shipInfo.id}</td>
      <td>{window.i18n.resources.__(this.props.shipInfo.type)}</td>
      <td className="ship-name">{window.i18n.resources.__(this.props.shipInfo.name)}
        <SallyArea label={this.props.shipInfo.sallyArea} tagStyles={this.props.tagStyles} sallyTags={this.props.sallyTags}/>
      </td>
      <td className='center'>{this.props.shipInfo.lv}</td>
      <td className='center' style={{backgroundColor: condColor}}>{this.props.shipInfo.cond}</td>
      <td className={karyokuClass}>{karyoku + '/'}<span style={{fontSize: '80%'}}>{karyokuString}</span></td>
      <td className={raisouClass}>{raisou + '/'}<span style={{fontSize: '80%'}}>{raisouString}</span></td>
      <td className={taikuClass}>{taiku + '/'}<span style={{fontSize: '80%'}}>{taikuString}</span></td>
      <td className={soukouClass}>{soukou + '/'}<span style={{fontSize: '80%'}}>{soukouString}</span></td>
      <td className={luckyClass}>{lucky + '/'}<span style={{fontSize: '80%'}}>{luckyString}</span></td>
      <td className='center'>{this.props.shipInfo.kaihi}</td>
      <td className='center'>{this.props.shipInfo.taisen}</td>
      <td className='center'>{this.props.shipInfo.sakuteki}</td>
      <td className='center' style={{backgroundColor: repairColor}}>
        {
          repairtime > 0 ?
            <OverlayTrigger placement="top" overlay={<Tooltip id="repairtime1hp">{ "1HP : #{resolveTime (repairtime / losshp)}" }</Tooltip>}>
              <span>{resolveTime(this.props.shipInfo.repairtime)}</span>
            </OverlayTrigger>
            : null 

        }
      </td>
      <td><Slotitems slot={this.props.shipInfo.slot} exslot={this.props.shipInfo.exslot} /></td>
      <td>{locked == 1 ? <FontAwesome name='lock' /> : ' '}</td>
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
    const {$shipTypes, $ships, _ships} = window
    let {rows} = this.state
    let rowsUpdateFlag = false
    switch (path){
    case '/kcsapi/api_port/port',
       '/kcsapi/api_req_kousyou/destroyship',
       '/kcsapi/api_req_kaisou/powerup',
       '/kcsapi/api_get_member/ship3',
      '/kcsapi/api_get_member/unsetslot':{
        rowsUpdateFlag = true
        rows = []
        for (const ship of _ships){
          const row ={
            id: ship.api_id,
            type_id: $ships[ship.api_ship_id].api_stype,
            type: $shipTypes[$ships[ship.api_ship_id].api_stype].api_name,
            name: $ships[ship.api_ship_id].api_name,
            yomi: $ships[ship.api_ship_id].api_yomi,
            sortno: $ships[ship.api_ship_id].api_sortno,
            lv:  ship.api_lv,
            cond: ship.api_cond,
            karyoku: ship.api_karyoku,
            houg: $ships[ship.api_ship_id].api_houg,
            raisou: ship.api_raisou,
            raig:  $ships[ship.api_ship_id].api_raig,
            taiku: ship.api_taiku,
            tyku:  $ships[ship.api_ship_id].api_tyku,
            soukou: ship.api_soukou,
            souk:  $ships[ship.api_ship_id].api_souk,
            lucky: ship.api_lucky,
            luck:  $ships[ship.api_ship_id].api_luck,
            kyouka: ship.api_kyouka,
            kaihi: ship.api_kaihi[0],
            taisen: ship.api_taisen[0],
            sakuteki: ship.api_sakuteki[0],
            slot: _.clone(ship.api_slot),
            exslot: ship.api_slot_ex,
            locked: ship.api_locked,
            nowhp: ship.api_nowhp,
            maxhp: ship.api_maxhp,
            losshp: ship.api_maxhp - ship.api_nowhp,
            repairtime: parseInt (ship.api_ndock_time / 1000.0),
            after: ship.api_aftershipid,
            sallyArea: ship.api_sally_area,
          }
          rows.push(row)
        }
        break
      }
    case '/kcsapi/api_req_kousyou/getship':{
      rowsUpdateFlag = true
      const ship = body.api_ship
      const row ={
        id: ship.api_id,
        type_id: $ships[ship.api_ship_id].api_stype,
        type: $shipTypes[$ships[ship.api_ship_id].api_stype].api_name,
        name: $ships[ship.api_ship_id].api_name,
        yomi: $ships[ship.api_ship_id].api_yomi,
        sortno: $ships[ship.api_ship_id].api_sortno,
        lv:  ship.api_lv,
        cond: ship.api_cond,
        karyoku: ship.api_karyoku,
        houg: $ships[ship.api_ship_id].api_houg,
        raisou: ship.api_raisou,
        raig:  $ships[ship.api_ship_id].api_raig,
        taiku: ship.api_taiku,
        tyku:  $ships[ship.api_ship_id].api_tyku,
        soukou: ship.api_soukou,
        souk:  $ships[ship.api_ship_id].api_souk,
        lucky: ship.api_lucky,
        luck:  $ships[ship.api_ship_id].api_luck,
        kyouka: ship.api_kyouka,
        kaihi: ship.api_kaihi[0],
        taisen: ship.api_taisen[0],
        sakuteki: ship.api_sakuteki[0],
        slot: _.clone(ship.api_slot),
        exslot: ship.api_slot_ex,
        locked: ship.api_locked,
        nowhp: ship.api_nowhp,
        maxhp: ship.api_maxhp,
        losshp: ship.api_maxhp - ship.api_nowhp,
        repairtime: parseInt (ship.api_ndock_time / 1000.0),
        after: ship.api_aftershipid,
        sallyArea: ship.api_sally_area,
      }
      rows.push(row)
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
    return shipTypes.indexof(type) !== -1
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
      return expeditionShips.indexof(id) !== -1
    case 2:
      return expeditionShips.indexof(id) === -1
    }
  },
  handleModernizationFilter: function(ship){
    const karyokuNow = ship.houg[0] + ship.kyouka[0]
    const karyokuMax = ship.karyoku[1]
    const raisouNow = ship.raig[0] + ship.kyouka[1]
    const raisouMax = ship.raisou[1]
    const taikuNow = ship.tyku[0] + ship.kyouka[2]
    const taikuMax = ship.taiku[1]
    const soukouNow = ship.souk[0] + ship.kyouka[3]
    const soukouMax = ship.soukou[1]
    const isCompleted = karyokuNow >= karyokuMax 
                    && raisouNow >= raisouMax 
                    && taikuNow >= taikuMax 
                    && soukouNow >= soukouMax
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
    const remodelable = ship.after !== "0"
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
    case 'karyoku':
      showRows = _.sortBy(showRows, (row) => row.karyoku[0])
      break
    case 'raisou':
      showRows = _.sortBy(showRows, (row) => row.raisou[0])
      break
    case 'taiku':
      showRows = _.sortBy(showRows, (row) => row.taiku[0])
      break
    case 'soukou':
      showRows = _.sortBy(showRows, (row) => row.soukou[0])
      break
    case 'lucky':
      showRows = _.sortBy(showRows, (row) => row.lucky[0])
      break
    case 'lv':
        // Sort rule of level in game (descending):
        // 1. level (descending)
        // 2. sortno (ascending)
        // 3. id (descending)
      showRows.sort ((a, b) =>{
        if (a.lv != b.lv)
          return a.lv - b.lv
        if (a.sortno != b.sortno)
          return -(a.sortno - b.sortno)
        if (a.id != b.id)
          return a.id - b.id
        else
          return 0
      })
      break
    case 'type':
        // Sort rule of type in game (descending):
        // 1. ship_type_id (descending)
        // 2. sortno (ascending)
        // 3. level (descending)
        // 4. id (descending)
      showRows.sort ((a, b) =>{
        if (a.type_id != b.type_id)
          return a.type_id - b.type_id
        if (a.sortno != b.sortno)
          return -(a.sortno - b.sortno)
        if (a.lv != b.lv)
          return a.lv - b.lv
        if (a.id != b.id)
          return a.id - b.id
        else
          return 0
      })
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
