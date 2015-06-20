{$, $$, _, React, ReactBootstrap, ROOT, path} = window
{Panel, Table, Grid, Col, OverlayTrigger, Tooltip} = ReactBootstrap
Divider = require './divider'

resultPanelTitle =
  <h3>舰娘信息</h3>

Slotitems = React.createClass
  render: ->
    <div className="slotitem-container">
    {
      {$slotitems, _slotitems} = window
      for itemId in @props.data
        continue if itemId == -1
        item = _slotitems[itemId]
        itemInfo = $slotitems[item.api_slotitem_id]
        <OverlayTrigger key={itemId} placement='top' overlay={<Tooltip>{itemInfo.api_name}</Tooltip>}>
          <img key={itemId} src={
              path = require 'path'
              path.join(ROOT, 'assets', 'img', 'slotitem', "#{itemInfo.api_type[3] + 33}.png")
            }
          />
        </OverlayTrigger>
    }
    </div>

ShipInfoTable = React.createClass
  render: ->
    karyokuNow = @props.houg[0] + @props.kyouka[0]
    karyokuMax = @props.karyoku[1]
    raisouNow = @props.raig[0] + @props.kyouka[1]
    raisouMax = @props.raisou[1]
    taikuNow = @props.tyku[0] + @props.kyouka[2]
    taikuMax = @props.taiku[1]
    soukouNow = @props.souk[0] + @props.kyouka[3]
    soukouMax = @props.soukou[1]
    luckyNow = @props.luck[0] + @props.kyouka[4]
    luckyMax = @props.lucky[1]

    condColor = 'transparent'
    karyokuClass = 'td-karyoku'
    raisouClass = 'td-raisou'
    taikuClass = 'td-taiku'
    soukouClass = 'td-soukou'
    luckyClass = 'td-lucky'

    if karyokuNow == karyokuMax
      karyokuClass = 'td-karyoku-max'
    if raisouNow == raisouMax
      raisouClass = 'td-raisou-max'
    if taikuNow == taikuMax
      taikuClass = 'td-taiku-max'
    if soukouNow == soukouMax
      soukouClass = 'td-soukou-max'
    if luckyNow == luckyMax
      luckyClass = 'td-lucky-max'

    if @props.cond in [0..19]
      condColor = 'rgba(255, 0, 0, 0.4)'
    if @props.cond in [20..29]
      condColor = 'rgba(255, 165, 0, 0.4)'
    if @props.cond in [50..100]
      condColor = 'rgba(255, 255, 0, 0.4)'

    <tr>
      <td>{@props.index}</td>
      <td>{@props.id}</td>
      <td>{@props.type}</td>
      <td>{@props.name}</td>
      <td className='center'>{@props.lv}</td>
      <td className='center' style={{backgroundColor:condColor;}}>{@props.cond}</td>
      <OverlayTrigger placement='top' overlay={<Tooltip>{'Now '+karyokuNow}<br />{'Max '+karyokuMax}</Tooltip>}>
        <td className={karyokuClass}>
          {@props.karyoku[0]}
        </td>
      </OverlayTrigger>
      <OverlayTrigger placement='top' overlay={<Tooltip>{'Now '+raisouNow}<br />{'Max '+raisouMax}</Tooltip>}>
        <td className={raisouClass}>
          {@props.raisou[0]}
        </td>
      </OverlayTrigger>
      <OverlayTrigger placement='top' overlay={<Tooltip>{'Now '+taikuNow}<br />{'Max '+taikuMax}</Tooltip>}>
        <td className={taikuClass}>
          {@props.taiku[0]}
        </td>
      </OverlayTrigger>
      <OverlayTrigger placement='top' overlay={<Tooltip>{'Now '+soukouNow}<br />{'Max '+soukouMax}</Tooltip>}>
        <td className={soukouClass}>
          {@props.soukou[0]}
        </td>
      </OverlayTrigger>
      <OverlayTrigger placement='top' overlay={<Tooltip>{'Now '+luckyNow}<br />{'Max '+luckyMax}</Tooltip>}>
        <td className={luckyClass}>
          {@props.lucky[0]}
        </td>
      </OverlayTrigger>
      <td className='center'>{@props.sakuteki}</td>
      <td><Slotitems data={@props.slot} /></td>
    </tr>

ShipInfoTableArea = React.createClass
  getInitialState: ->
    rows: []
    show: false
  handleResponse: (e) ->
    {method, path, body, postBody} = e.detail
    {$shipTypes, $ships, _ships} = window
    {rows} = @state
    switch path
      when '/kcsapi/api_port/port'
        rows = []
        for _shipId, ship of _ships
          row =
            id: ship.api_id
            type: $shipTypes[$ships[ship.api_ship_id].api_stype].api_name
            name: $ships[ship.api_ship_id].api_name
            lv:  ship.api_lv
            cond: ship.api_cond
            karyoku: ship.api_karyoku
            houg: ship.api_houg
            raisou: ship.api_raisou
            raig: ship.api_raig
            taiku: ship.api_taiku
            tyku: ship.api_tyku
            soukou: ship.api_soukou
            souk: ship.api_souk
            lucky: ship.api_lucky
            luck: ship.api_luck
            kyouka: ship.api_kyouka
            sakuteki: ship.api_sakuteki[0]
            slot: ship.api_slot
          rows.push row
      when '/kcsapi/api_req_kousyou/getship'
        ship = body.api_ship
        row =
          id: ship.api_id
          type: $shipTypes[$ships[ship.api_ship_id].api_stype].api_name
          name: $ships[ship.api_ship_id].api_name
          lv:  ship.api_lv
          cond: ship.api_cond
          karyoku: ship.api_karyoku
          houg: $ships[ship.api_ship_id].api_houg
          raisou: ship.api_raisou
          raig: $ships[ship.api_ship_id].api_raig
          taiku: ship.api_taiku
          tyku: $ships[ship.api_ship_id].api_tyku
          soukou: ship.api_soukou
          souk: $ships[ship.api_ship_id].api_souk
          lucky: ship.api_lucky
          luck: $ships[ship.api_ship_id].api_luck
          kyouka: ship.api_kyouka
          sakuteki: ship.api_sakuteki[0]
          slot: ship.api_slot
        rows.push row
      when '/kcsapi/api_req_kousyou/destroyship'
        rows = []
        for _shipId, ship of _ships
          row =
            id: ship.api_id
            type: $shipTypes[$ships[ship.api_ship_id].api_stype].api_name
            name: $ships[ship.api_ship_id].api_name
            lv:  ship.api_lv
            cond: ship.api_cond
            karyoku: ship.api_karyoku
            houg: ship.api_houg
            raisou: ship.api_raisou
            raig: ship.api_raig
            taiku: ship.api_taiku
            tyku: ship.api_tyku
            soukou: ship.api_soukou
            souk: ship.api_souk
            lucky: ship.api_lucky
            luck: ship.api_luck
            kyouka: ship.api_kyouka
            sakuteki: ship.api_sakuteki[0]
            slot: ship.api_slot
          rows.push row
    @setState
      rows: rows
      show: true
  componentDidMount: ->
    @setState
      rows: @state.rows
      show: true
    window.addEventListener 'game.response', @handleResponse
  componentWillUnmount: ->
    @setState
      rows: @state.rows
      show: false
    window.removeEventListener 'game.response', @handleResponse
  render: ->
    <div id="ship-info-show">
      <Divider text="舰娘信息" />
      <Grid>
        <Col xs={12}>
          <Table striped condensed hover>
            <thead>
              <tr>
                <th>NO</th>
                <th>ID</th>
                <th>舰种</th>
                <th>舰名</th>
                <th className='center'>等级</th>
                <th className='center'>状态</th>
                <th className='center'>火力</th>
                <th className='center'>雷装</th>
                <th className='center'>对空</th>
                <th className='center'>装甲</th>
                <th className='center'>幸运</th>
                <th className='center'>索敌</th>
                <th>装备</th>
              </tr>
            </thead>
            <tbody>
            {
              if @state.show
                $shipTypes = window.$shipTypes

                shipTypes = []
                if $shipTypes?
                  for x in @props.shipTypeBoxes
                    shipTypes.push $shipTypes[x].api_name

                showRows = []
                for row in @state.rows
                  showRows.push row if row.type in shipTypes

                switch @props.sortName
                  when 'karyoku'
                    showRows = _.sortBy showRows, (row) -> row.karyoku[0]
                  when 'raisou'
                    showRows = _.sortBy showRows, (row) -> row.raisou[0]
                  when 'taiku'
                    showRows = _.sortBy showRows, (row) -> row.taiku[0]
                  when 'soukou'
                    showRows = _.sortBy showRows, (row) -> row.soukou[0] 
                  when 'lucky'
                    showRows = _.sortBy showRows, (row) -> row.lucky[0]
                  else
                    showRows = _.sortBy showRows, @props.sortName
                showRows.reverse() if @props.sortOrder

                for row, index in showRows
                  <ShipInfoTable
                    key = {index}
                    index = {index + 1}
                    id = {row.id}
                    type = {row.type}
                    name = {row.name}
                    lv = {row.lv}
                    cond = {row.cond}
                    karyoku = {row.karyoku}
                    houg = {row.houg}
                    raisou = {row.raisou}
                    raig = {row.raig}
                    taiku = {row.taiku}
                    tyku = {row.tyku}
                    soukou = {row.soukou}
                    souk = {row.souk}
                    lucky = {row.lucky}
                    luck = {row.luck}
                    kyouka = {row.kyouka}
                    sakuteki = {row.sakuteki}
                    slot = {row.slot}
                  />
            }
            </tbody>
          </Table>
        </Col>
      </Grid>
    </div>
module.exports = ShipInfoTableArea
