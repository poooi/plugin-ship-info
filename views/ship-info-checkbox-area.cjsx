{React, ReactBootstrap, jQuery} = window
{Panel, Button, Input, Col, Grid, Row} = ReactBootstrap
Divider = require './divider'
shipTypes = ['', '海防艦', '駆逐艦', '軽巡洋艦', '重雷装巡洋艦', '重巡洋艦', '航空巡洋艦', '軽空母', '戦艦', '戦艦', '航空戦艦', '正規空母',
             '超弩級戦艦', '潜水艦', '潜水空母', '補給艦', '水上機母艦', '揚陸艦', '装甲空母', '工作艦', '潜水母艦', '練習巡洋艦']
ShipInfoCheckboxArea = React.createClass
  getInitialState: ->
    checked: [false, true, true, true, true, true, true, true, true, false, true, true,
              true, true, true, true, true, true, true, true, true, true, true, true]
    checkedAll: true
    order: 0
    sortKey: 'lv'
    filterShow: true
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
  handleClickCheckbox: (index) ->
    checkboxes = []
    {checked, checkedAll} = @state
    checked[index] = !checked[index]
    for shipType, i in shipTypes
      checkboxes.push i if checked[i]
    checkedAll = false
    @setState {checked, checkedAll}
    @props.filterRules(checkboxes)
  handleCilckCheckboxAll: ->
    checkboxes = []
    {checked, checkedAll} = @state
    if checkedAll
      for shipType, i in shipTypes
        checked[i] = false
      checkedAll = false
      @setState {checked, checkedAll}
      @props.filterRules(checkboxes)
    else
      for shipType, i in shipTypes
        if i != 0 && i != 9
          checked[i] = true
          checkboxes.push i
          checkedAll = true
      @setState {checked, checkedAll}
      @props.filterRules(checkboxes)
  handleClickFilterButton: (type) ->
    checkboxes = []
    {checked, checkedAll} = @state
    checkedAll = false
    for shipType, i in shipTypes
      checked[i] = false
    switch type
      when 'DD'
        checked[2] = true
        checkboxes.push 2
      when 'CL'
        checked[3] = true
        checked[4] = true
        checkboxes.push 3
        checkboxes.push 4
      when 'CA'
        checked[5] = true
        checked[6] = true
        checkboxes.push 5
        checkboxes.push 6
      when 'BB'
        checked[8] = true
        checked[10] = true
        checked[12] = true
        checkboxes.push 8
        checkboxes.push 10
        checkboxes.push 12
      when 'CV'
        checked[7] = true
        checked[11] = true
        checked[18] = true
        checkboxes.push 7
        checkboxes.push 11
        checkboxes.push 18
      when 'SS'
        checked[13] = true
        checked[14] = true
        checkboxes.push 13
        checkboxes.push 14
    @setState {checked, checkedAll}
    @props.filterRules(checkboxes)
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
      <Grid className='vertical-center' style={if @state.sortShow then {display: 'block'} else {display: 'none'} }>
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
      <div onClick={@handleFilterShow}>
        <Divider text="舰种过滤" icon={true} show={@state.filterShow} />
      </div>
      <Grid id='ship-info-filter' style={if @state.filterShow then {display: 'block'} else {display: 'none'} }>
        <Row>
          <Col xs={2}>
            <Input type='checkbox' label={"全部"} onChange={@handleCilckCheckboxAll} checked={@state.checkedAll} />
          </Col>
        </Row>
        <Row>
        {
          for shipType, index in shipTypes
            continue if index < 1 || shipType == shipTypes[index - 1]
            <Col key={index} xs={2}>
              <Input type='checkbox' label={shipType} key={index} value={index} onChange={@handleClickCheckbox.bind(@, index)} checked={@state.checked[index]} />
            </Col>
        }
        </Row>
        <Row>
          <Col xs={2}>
            <Button className="filter-button" bsStyle='default' bsSize='small' onClick={@handleClickFilterButton.bind(@, 'DD')} block>駆逐艦</Button>
          </Col>
          <Col xs={2}>
            <Button className="filter-button" bsStyle='default' bsSize='small' onClick={@handleClickFilterButton.bind(@, 'CL')} block>軽巡·雷巡</Button>
          </Col>
          <Col xs={2}>
            <Button className="filter-button" bsStyle='default' bsSize='small' onClick={@handleClickFilterButton.bind(@, 'CA')} block>重巡·航巡</Button>
          </Col>
          <Col xs={2}>
            <Button className="filter-button" bsStyle='default' bsSize='small' onClick={@handleClickFilterButton.bind(@, 'BB')} block>戦艦</Button>
          </Col>
          <Col xs={2}>
            <Button className="filter-button" bsStyle='default' bsSize='small' onClick={@handleClickFilterButton.bind(@, 'CV')} block>航空母艦</Button>
          </Col>
          <Col xs={2}>
            <Button className="filter-button" bsStyle='default' bsSize='small' onClick={@handleClickFilterButton.bind(@, 'SS')} block>潜水艦</Button>
          </Col>
        </Row>
      </Grid>
    </div>

module.exports = ShipInfoCheckboxArea
