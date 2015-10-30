{React, ReactBootstrap, jQuery, __} = window
{Button, Input, Col, Grid, Row} = ReactBootstrap
Divider = require './divider'
ShipInfoFilter = require './ship-info-filter'
ShipInfoCheckboxArea = React.createClass
  getInitialState: ->
    filterShow: false
    sortShow: false
  handleClickAscend: ->
    @props.sortRules(@props.sortKey, 1)
  handleClickDescend: ->
    @props.sortRules(@props.sortKey, 0)
  handleKeyChange: (e) ->
    @props.sortRules(e.target.value, @props.order)
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
          <Col xs={2} className='filter-span'>{__ 'Sort By'}</Col>
          <Col xs={6}>
            <Input id='sortbase' type='select' defaultValue={@props.sortKey} value={@props.sortKey} onChange={@handleKeyChange}>
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
            <Button bsStyle={if @props.order == 0 then 'success' else 'default'} bsSize='small' onClick={@handleClickDescend} block>
              {if @props.order == 0 then '√ ' else ''} {__ 'Descending'}
            </Button>
          </Col>
          <Col xs={2}>
            <Button bsStyle={if @props.order == 1 then 'success' else 'default'} bsSize='small' onClick={@handleClickAscend} block>
              {if @props.order == 1 then '√ ' else ''} {__ 'Ascending'}
            </Button>
          </Col>
        </Grid>
      </div>
      <div onClick={@handleFilterShow}>
        <Divider text={__ 'Filter Setting'} icon={true} show={@state.filterShow} />
      </div>
      <div id='ship-info-filter' style={display: 'block'}>
        <ShipInfoFilter
          showDetails={@state.filterShow}
          shipTypeBoxes={@props.shipTypeBoxes}
          lvRadio={@props.lvRadio}
          lockedRadio={@props.lockedRadio}
          expeditionRadio={@props.expeditionRadio}
          modernizationRadio={@props.modernizationRadio}
          remodelRadio={@props.remodelRadio}
          typeFilterRules={@props.filterRules}
          lvFilterRules={@props.filterRules}
          lockedFilterRules={@props.filterRules}
          expeditionFilterRules={@props.filterRules}
          modernizationFilterRules={@props.filterRules}
          remodelFilterRules={@props.filterRules}
        />
      </div>
    </div>

module.exports = ShipInfoCheckboxArea
