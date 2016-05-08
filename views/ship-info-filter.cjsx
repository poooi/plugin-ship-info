{React, ReactBootstrap, jQuery, __, config} = window
{Grid, Row, Col, Input, Button, ButtonGroup} = ReactBootstrap
shipTypes = ['', '海防艦', '駆逐艦', '軽巡洋艦', '重雷装巡洋艦', '重巡洋艦', '航空巡洋艦', '軽空母', '戦艦', '戦艦', '航空戦艦', '正規空母',
             '超弩級戦艦', '潜水艦', '潜水空母', '補給艦', '水上機母艦', '揚陸艦', '装甲空母', '工作艦', '潜水母艦', '練習巡洋艦']


TypeCheck = React.createClass
  getInitialState: ->
    checked: [false, true, true, true, true, true, true, true, true, false, true, true,
              true, true, true, true, true, true, true, true, true, true, true, true]
    checkedAll: true
  componentDidMount: ->
    {checked} = @state
    for shipType, i in shipTypes
      checked[i] = false
    for i in @props.shipTypeBoxes
      checked[i] = true
    checkedAll = config.get "plugin.ShipInfo.shipCheckedAll", true
    @setState {checked, checkedAll}
  handleClickCheckbox: (index) ->
    checkboxes = []
    {checked, checkedAll} = @state
    checked[index] = !checked[index]
    for shipType, i in shipTypes
      checkboxes.push i if checked[i]
    checkedAll = false
    config.set "plugin.ShipInfo.shipCheckedAll", checkedAll
    @setState {checked, checkedAll}
    @props.filterRules('type', checkboxes)
  handleCilckCheckboxAll: ->
    checkboxes = []
    {checked, checkedAll} = @state
    if checkedAll
      for shipType, i in shipTypes
        checked[i] = false
      checkedAll = false
      config.set "plugin.ShipInfo.shipCheckedAll", checkedAll
      @setState {checked, checkedAll}
      @props.filterRules('type', checkboxes)
    else
      for shipType, i in shipTypes
        if i != 0 && i != 9
          checked[i] = true
          checkboxes.push i
      checkedAll = true
      config.set "plugin.ShipInfo.shipCheckedAll", checkedAll
      @setState {checked, checkedAll}
      @props.filterRules('type', checkboxes)
  handleClickFilterButton: (type) ->
    checkboxes = []
    {checked, checkedAll} = @state
    checkedAll = false
    for shipType, i in shipTypes
      checked[i] = false
    switch type
      when 'ALL'
        for shipType, i in shipTypes
          if i != 0 && i != 9
            checked[i] = true
            checkboxes.push i
        checkedAll = true
      when 'DD'
        checked[2] = true
        checkboxes.push 2
      when 'CL'
        checked[3] = true
        checked[4] = true
        checked[21] = true
        checkboxes.push 3
        checkboxes.push 4
        checkboxes.push 21
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
    config.set "plugin.ShipInfo.shipCheckedAll", checkedAll
    @setState {checked, checkedAll}
    @props.filterRules('type', checkboxes)
  render: ->
    <div>
      {
        if @props.buttonsOnly
          <Row>
            <Col xs={12}>
              <Button className="filter-button-all" bsStyle='default' bsSize='small' onClick={@handleClickFilterButton.bind(@, 'ALL')} block>{__ 'All'}</Button>
            </Col>
          </Row>
        else
          <div>
            <Row>
              <Col xs={2}>
                <Input type='checkbox' label={__ 'All'} onChange={@handleCilckCheckboxAll} checked={@state.checkedAll} />
              </Col>
            </Row>
            <Row>
            {
              for shipType, index in shipTypes
                continue if index < 1 or shipType == shipTypes[index - 1]
                <Col key={index} xs={2}>
                  <Input type='checkbox' label={shipType} key={index} value={index} onChange={@handleClickCheckbox.bind(@, index)} checked={@state.checked[index]} />
                </Col>
            }
            </Row>
          </div>
      }
      <Row>
        <Col xs={2}>
          <Button className="filter-button" bsStyle='default' bsSize='small' onClick={@handleClickFilterButton.bind(@, 'DD')} block>{__ 'FilterDD'}</Button>
        </Col>
        <Col xs={2}>
          <Button className="filter-button" bsStyle='default' bsSize='small' onClick={@handleClickFilterButton.bind(@, 'CL')} block>{__ 'FilterCL'}</Button>
        </Col>
        <Col xs={2}>
          <Button className="filter-button" bsStyle='default' bsSize='small' onClick={@handleClickFilterButton.bind(@, 'CA')} block>{__ 'FilterCA'}</Button>
        </Col>
        <Col xs={2}>
          <Button className="filter-button" bsStyle='default' bsSize='small' onClick={@handleClickFilterButton.bind(@, 'BB')} block>{__ 'FilterBB'}</Button>
        </Col>
        <Col xs={2}>
          <Button className="filter-button" bsStyle='default' bsSize='small' onClick={@handleClickFilterButton.bind(@, 'CV')} block>{__ 'FilterCV'}</Button>
        </Col>
        <Col xs={2}>
          <Button className="filter-button" bsStyle='default' bsSize='small' onClick={@handleClickFilterButton.bind(@, 'SS')} block>{__ 'FilterSS'}</Button>
        </Col>
      </Row>
    </div>

LvCheck = React.createClass
  getInitialState: ->
    checked : [false, false, true]
  handleCilckRadio: (index) ->
    @props.filterRules('lv', index)
  render: ->
    <div>
      <Row>
        <Col xs={2} className='filter-span'><span>{__ 'Level Setting'}</span></Col>
        <Col xs={2}>
          <Input type='radio' label={__ 'All'} onChange={@handleCilckRadio.bind(@, 0)} checked={(@props.keyRadio == 0)} />
        </Col>
        <Col xs={2}>
          <Input type='radio' label={__ 'Lv.1'} onChange={@handleCilckRadio.bind(@, 1)} checked={(@props.keyRadio == 1)} />
        </Col>
        <Col xs={2}>
          <Input type='radio' label={__ 'Above Lv.2'} onChange={@handleCilckRadio.bind(@, 2)} checked={(@props.keyRadio == 2)} />
        </Col>
      </Row>
    </div>

LockedCheck = React.createClass
  getInitialState: ->
    checked : [false, true, false]
  handleCilckRadio: (index) ->
    @props.filterRules('locked', index)
  render: ->
    <div>
      <Row>
        <Col xs={2}  className='filter-span'><span>{__ 'Lock Setting'}</span></Col>
        <Col xs={2}>
          <Input type='radio' label={__ 'All'} onChange={@handleCilckRadio.bind(@, 0)} checked={(@props.keyRadio == 0)} />
        </Col>
        <Col xs={2}>
          <Input type='radio' label={__ 'Locked'} onChange={@handleCilckRadio.bind(@, 1)} checked={(@props.keyRadio == 1)} />
        </Col>
        <Col xs={2}>
          <Input type='radio' label={__ 'Not Locked'} onChange={@handleCilckRadio.bind(@, 2)} checked={(@props.keyRadio == 2)} />
        </Col>
      </Row>
    </div>

ExpeditionCheck = React.createClass
  getInitialState: ->
    checked : [true, false, false]
  handleCilckRadio: (index) ->
    @props.filterRules('expedition', index)
  render: ->
    <div>
      <Row>
        <Col xs={2} className='filter-span'><span>{__ 'Expedition Setting'}</span></Col>
        <Col xs={2}>
          <Input type='radio' label={__ 'All'} onChange={@handleCilckRadio.bind(@, 0)} checked={(@props.keyRadio == 0)} />
        </Col>
        <Col xs={2}>
          <Input type='radio' label={__ 'In Expedition'} onChange={@handleCilckRadio.bind(@, 1)} checked={(@props.keyRadio == 1)} />
        </Col>
        <Col xs={2}>
          <Input type='radio' label={__ 'Not In Expedition'} onChange={@handleCilckRadio.bind(@, 2)} checked={(@props.keyRadio == 2)} />
        </Col>
      </Row>
    </div>

ModernizationCheck = React.createClass
  getInitialState: ->
    checked : [true, false, false]
  handleCilckRadio: (index) ->
    @props.filterRules('modernization', index)
  render: ->
    <div>
      <Row>
        <Col xs={2} className='filter-span'><span>{__ 'Modernization Setting'}</span></Col>
        <Col xs={2}>
          <Input type='radio' label={__ 'All'} onChange={@handleCilckRadio.bind(@, 0)} checked={(@props.keyRadio == 0)} />
        </Col>
        <Col xs={2}>
          <Input type='radio' label={__ 'Modernization Completed'} onChange={@handleCilckRadio.bind(@, 1)} checked={(@props.keyRadio == 1)} />
        </Col>
        <Col xs={2}>
          <Input type='radio' label={__ 'Modernization Incompleted'} onChange={@handleCilckRadio.bind(@, 2)} checked={(@props.keyRadio == 2)} />
        </Col>
      </Row>
    </div>

RemodelCheck = React.createClass
  getInitialState: ->
    checked : [true, false, false]
  handleCilckRadio: (index) ->
    @props.filterRules('remodel', index)
  render: ->
    <div>
      <Row>
        <Col xs={2} className='filter-span'><span>{__ 'Remodel Setting'}</span></Col>
        <Col xs={2}>
          <Input type='radio' label={__ 'All'} onChange={@handleCilckRadio.bind(@, 0)} checked={(@props.keyRadio == 0)} />
        </Col>
        <Col xs={2}>
          <Input type='radio' label={__ 'Not Remodelable'} onChange={@handleCilckRadio.bind(@, 1)} checked={(@props.keyRadio == 1)} />
        </Col>
        <Col xs={2}>
          <Input type='radio' label={__ 'Remodelable'} onChange={@handleCilckRadio.bind(@, 2)} checked={(@props.keyRadio == 2)} />
        </Col>
      </Row>
    </div>

SallyAreaCheck = React.createClass
  getInitialState: ->
    checked: @props.sallyAreaBoxes
    checkedAll: @props.sallyAreaBoxes.reduce (a,b) -> a and b 
  handleCilckBox: (index) ->
    {checked, checkedAll} = @state
    if index is -1
      checkedAll = !checkedAll
      checked = checked.map -> checkedAll
    else
      checked[index] = !@state.checked[index]
      checkedAll = checked.reduce (a,b) -> a and b    
    @props.filterRules 'sallyArea', checked
    @setState
      checkedAll: checkedAll
      checked: checked
  
  render: ->
    <div>
      <Row>
        <Col xs={2} className='filter-span'><span>{__ 'Sally Area Setting'}</span></Col>

      </Row>
      <Row>
        <Col xs={2}>
          <Button className='filter-button'  onClick={@handleCilckBox.bind(@, -1)} bsStyle={if @state.checkedAll then 'success' else 'default'} bsSize='small' block>
            {__ 'All'}
          </Button>
        </Col>
        <Col xs={10}>
          <ButtonGroup justified>
            {
              for tag, idx in @props.sallyTags
                continue if idx is @props.sallyTags.length - 1
                <Button key={idx} className='filter-button' onClick={@handleCilckBox.bind(@, idx)} bsStyle={if @state.checked[idx] then 'success' else 'default'} 
                        bsSize='small' style={width: (100/(@props.sallyTags.length - 1))+"%"} >
                  {__ tag}
                </Button>              
            }
          </ButtonGroup>  
         </Col>
      </Row>
    </div>

ShipInfoFilter = React.createClass
  render: ->
    <Grid>
      <TypeCheck shipTypeBoxes={@props.shipTypeBoxes} filterRules={@props.typeFilterRules} buttonsOnly={!@props.showDetails} />
      {
        if @props.showDetails
          <div>
            <LvCheck keyRadio={@props.lvRadio} filterRules={@props.lvFilterRules} />
            <LockedCheck keyRadio={@props.lockedRadio} filterRules={@props.lockedFilterRules} />
            <ExpeditionCheck keyRadio={@props.expeditionRadio} filterRules={@props.expeditionFilterRules} />
            <ModernizationCheck keyRadio={@props.modernizationRadio} filterRules={@props.modernizationFilterRules} />
            <RemodelCheck keyRadio={@props.remodelRadio} filterRules={@props.remodelFilterRules} />
            <SallyAreaCheck sallyTags={@props.sallyTags} filterRules={@props.sallyAreaFilterRules} sallyAreaBoxes={@props.sallyAreaBoxes} />
          </div>
      }
    </Grid>


module.exports = ShipInfoFilter
