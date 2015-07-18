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
  shouldComponentUpdate: (nextProps, nextState)->
    if nextProps.dataVersion isnt @props.dataVersion
      if not _.isEqual nextProps.shipInfo, @props.shipInfo
        return true
    false
  render: ->
    karyokuNow = @props.shipInfo.houg[0] + @props.shipInfo.kyouka[0]
    karyokuMax = @props.shipInfo.karyoku[1]
    raisouNow = @props.shipInfo.raig[0] + @props.shipInfo.kyouka[1]
    raisouMax = @props.shipInfo.raisou[1]
    taikuNow = @props.shipInfo.tyku[0] + @props.shipInfo.kyouka[2]
    taikuMax = @props.shipInfo.taiku[1]
    soukouNow = @props.shipInfo.souk[0] + @props.shipInfo.kyouka[3]
    soukouMax = @props.shipInfo.soukou[1]
    luckyNow = @props.shipInfo.luck[0] + @props.shipInfo.kyouka[4]
    luckyMax = @props.shipInfo.lucky[1]

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

    if @props.shipInfo.cond >= 0 and @props.shipInfo.cond < 20
      condColor = 'rgba(255, 0, 0, 0.4)'
    else if @props.shipInfo.cond >= 20 and @props.shipInfo.cond < 30
      condColor = 'rgba(255, 165, 0, 0.4)'
    else if @props.shipInfo.cond >= 50 and @props.shipInfo.cond <= 100
      condColor = 'rgba(255, 255, 0, 0.4)'

    <tr>
      <td>{@props.index}</td>
      <td>{@props.shipInfo.id}</td>
      <td>{@props.shipInfo.type}</td>
      <td>{@props.shipInfo.name}</td>
      <td className='center'>{@props.shipInfo.lv}</td>
      <td className='center' style={backgroundColor: condColor}>{@props.shipInfo.cond}</td>
      <OverlayTrigger placement='top' overlay={<Tooltip>{'Now '+karyokuNow}<br />{'Max '+karyokuMax}</Tooltip>}>
        <td className={karyokuClass}>
          {@props.shipInfo.karyoku[0]}
        </td>
      </OverlayTrigger>
      <OverlayTrigger placement='top' overlay={<Tooltip>{'Now '+raisouNow}<br />{'Max '+raisouMax}</Tooltip>}>
        <td className={raisouClass}>
          {@props.shipInfo.raisou[0]}
        </td>
      </OverlayTrigger>
      <OverlayTrigger placement='top' overlay={<Tooltip>{'Now '+taikuNow}<br />{'Max '+taikuMax}</Tooltip>}>
        <td className={taikuClass}>
          {@props.shipInfo.taiku[0]}
        </td>
      </OverlayTrigger>
      <OverlayTrigger placement='top' overlay={<Tooltip>{'Now '+soukouNow}<br />{'Max '+soukouMax}</Tooltip>}>
        <td className={soukouClass}>
          {@props.shipInfo.soukou[0]}
        </td>
      </OverlayTrigger>
      <OverlayTrigger placement='top' overlay={<Tooltip>{'Now '+luckyNow}<br />{'Max '+luckyMax}</Tooltip>}>
        <td className={luckyClass}>
          {@props.shipInfo.lucky[0]}
        </td>
      </OverlayTrigger>
      <td className='center'>{@props.shipInfo.sakuteki}</td>
      <td><Slotitems data={@props.shipInfo.slot} /></td>
    </tr>

ShipInfoTableArea = React.createClass
  getInitialState: ->
    rows: []
    show: false
    dataVersion: 0
  handleResponse: (e) ->
    {method, path, body, postBody} = e.detail
    {$shipTypes, $ships, _ships} = window
    {rows} = @state
    rowsUpdateFlag = false
    switch path
      when '/kcsapi/api_port/port', '/kcsapi/api_req_kousyou/destroyship', '/kcsapi/api_req_kaisou/powerup', '/kcsapi/api_get_member/ship3'
        rowsUpdateFlag = true
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
        rowsUpdateFlag = true
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
    if rowsUpdateFlag
      if @state.dataVersion > 12450
        @setState
          rows: rows
          show: true
          dataVersion: 1
      else
        @setState
          rows: rows
          show: true
          dataVersion: @state.dataVersion + 1
  componentDidMount: ->
    @setState
      rows: @state.rows
      show: true
      dataVersion: @state.dataVersion + 1
    window.addEventListener 'game.response', @handleResponse
  componentWillUnmount: ->
    @setState
      rows: @state.rows
      show: false
    window.removeEventListener 'game.response', @handleResponse
  render: ->
    <div id="ship-info-show">
      <Divider text="舰娘信息" icon={false}/>
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
                showRows.reverse() if !@props.sortOrder

                for row, index in showRows
                  <ShipInfoTable
                    key = {row.id}
                    index = {index + 1}
                    shipInfo = {row}
                    dataVersion = {@state.dataVersion}
                  />
            }
            </tbody>
          </Table>
        </Col>
      </Grid>
    </div>
module.exports = ShipInfoTableArea
