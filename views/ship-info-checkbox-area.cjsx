{React, ReactBootstrap, jQuery, __} = window
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
        <Divider text={__ 'Sort Order Setting'} icon={true} show={@state.sortShow}/>
      </div>
      <div className='vertical-center' style={if @state.sortShow then {display: 'block'} else {display: 'none'} }>
        <Grid>
          <Col xs={2}>{__ 'Sort By'}</Col>
          <Col xs={6}>
            <Input id='sortbase' type='select' defaultValue='lv' onChange={@handleKeyChange}>
              <option value='id'>{__ 'ID'}</option>
              <option value='type'>{__ 'Class'}</option>
              <option value='name'>{__ 'Name'}</option>
              <option value='lv'>{__ 'Level'}</option>
              <option value='cond'>{__ 'Cond'}</option>
              <option value='karyoku'>{__ 'Firepower'}</option>
              <option value='raisou'>{__ 'Torpedo'}</option>
              <option value='taiku'>{__ 'AA'}</option>
              <option value='soukou'>{__ 'Armor'}</option>
              <option value='lucky'>{__ 'Luck'}</option>
              <option value='sakuteki'>{__ 'LOS'}</option>
              <option value='repairtime'>{__ 'Repair'}</option>
            </Input>
          </Col>
          <Col xs={2}>
            <Button bsStyle={if @state.order == 0 then 'success' else 'default'} bsSize='small' onClick={@handleClickDescend} block>
              {if @state.order == 0 then '√ ' else ''} {__ 'Descending'}
            </Button>
          </Col>
          <Col xs={2}>
            <Button bsStyle={if @state.order == 1 then 'success' else 'default'} bsSize='small' onClick={@handleClickAscend} block>
              {if @state.order == 1 then '√ ' else ''} {__ 'Ascending'}
            </Button>
          </Col>
        </Grid>
      </div>
      <div onClick={@handleFilterShow}>
        <Divider text={__ 'Filter Setting'} icon={true} show={@state.filterShow} />
      </div>
      <div id='ship-info-filter' style={if @state.filterShow then {display: 'block'} else {display: 'none'} }>
        <ShipInfoFilter
          typeFilterRules={@props.filterRules}
          lvFilterRules={@props.filterRules}
          lockedFilterRules={@props.filterRules}
          expeditionFilterRules={@props.filterRules}
          modernizationFilterRules={@props.filterRules}
        />
      </div>
    </div>

module.exports = ShipInfoCheckboxArea
