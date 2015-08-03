{React, ReactBootstrap, jQuery} = window
{Button, Input, Col, Grid, Row} = ReactBootstrap
Divider = require './divider'
ShipInfoFilter = require './ship-info-filter'
ShipInfoCheckboxArea = React.createClass
  getInitialState: ->
    order: 0
    sortKey: 'lv'
    filterShow: false
    sortShow: true
  handleClickAscend: ->
    @setState
      order: 1
    @props.sortRules(@state.sortKey, 1)
  handleClickDescend: ->
    @setState
      order: 0
    @props.sortRules(@state.sortKey, 0)
  handleKeyChange: (e) ->
    @setState
      sortKey: e.target.value
    @props.sortRules(e.target.value, @state.order)
  handleSortShow: ->
    {sortShow} = @state
    sortShow = !sortShow
    @setState {sortShow}
  handleFilterShow: ->
    {filterShow} = @state
    filterShow = !filterShow
    @setState {filterShow}
  render: ->
    <div id='ship-info-settings'>
      <div onClick={@handleSortShow}>
        <Divider text="排序设置" icon={true} show={@state.sortShow}/>
      </div>
      <div className='vertical-center' style={if @state.sortShow then {display: 'block'} else {display: 'none'} }>
        <Grid>
          <Col xs={2}>排序规则</Col>
          <Col xs={6}>
            <Input id='sortbase' type='select' defaultValue='lv' onChange={@handleKeyChange}>
              <option value='id'>ID</option>
              <option value='type'>舰种</option>
              <option value='name'>舰名</option>
              <option value='lv'>等级</option>
              <option value='cond'>状态</option>
              <option value='karyoku'>火力</option>
              <option value='raisou'>雷装</option>
              <option value='taiku'>对空</option>
              <option value='soukou'>装甲</option>
              <option value='lucky'>幸运</option>
              <option value='sakuteki'>索敌</option>
            </Input>
          </Col>
          <Col xs={2}>
            <Button bsStyle={if @state.order == 0 then 'success' else 'default'} bsSize='small' onClick={@handleClickDescend} block>
              {if @state.order == 0 then '√ ' else ''} 降序
            </Button>
          </Col>
          <Col xs={2}>
            <Button bsStyle={if @state.order == 1 then 'success' else 'default'} bsSize='small' onClick={@handleClickAscend} block>
              {if @state.order == 1 then '√ ' else ''} 升序
            </Button>
          </Col>
        </Grid>
      </div>
      <div onClick={@handleFilterShow}>
        <Divider text="过滤设置" icon={true} show={@state.filterShow} />
      </div>
      <div id='ship-info-filter' style={if @state.filterShow then {display: 'block'} else {display: 'none'} }>
        <ShipInfoFilter
          typeFilterRules={@props.filterRules}
          lvFilterRules={@props.filterRules}
          lockedFilterRules={@props.filterRules}
          expeditionFilterRules={@props.filterRules}
        />
      </div>
    </div>

module.exports = ShipInfoCheckboxArea
