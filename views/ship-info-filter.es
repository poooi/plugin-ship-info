import React, { Component } from 'react'
import { Grid, Row, Col, Input, Button, ButtonGroup, Label } from 'react-bootstrap'
import { connect } from 'react-redux'

const __ = window.__

const shipTypes = ['', '海防艦', '駆逐艦', '軽巡洋艦', 
  '重雷装巡洋艦', '重巡洋艦', '航空巡洋艦', '軽空母', '戦艦', 
  '戦艦', '航空戦艦', '正規空母', '超弩級戦艦', '潜水艦', 
  '潜水空母', '補給艦', '水上機母艦', '揚陸艦', '装甲空母', 
  '工作艦', '潜水母艦', '練習巡洋艦']

const typeMap = {
  'DD': [2],
  'CL': [3, 4, 21],
  'CA': [5, 6],
  'BB': [8, 10, 12],
  'CV': [7, 11, 18],
  'SS': [13, 14],
}

const lvOptions = {
  [0]: 'All',
  [1]: 'Lv.1',
  [2]: 'Above Lv.2',
}

const lockedOptions = {
  [0]: 'All',
  [1]: 'Locked',
  [2]: 'Not Locked',
}

const expeditionOptions = {
  [0]: 'All',
  [1]: 'In Expedition',
  [2]: 'Not In Expedition',  
}

const modernizationOptions = {
  [0]: 'All',
  [1]: 'Modernization Completed',
  [2]: 'Modernization Incompleted',
}

const remodelOptions = {
  [0]: 'All',
  [1]: 'Not Remodelable',
  [2]: 'Remodelable',
}

// single option check
// props: 
//  configKey@String, key for identify the component
//  label@String, displayed label
//  options@Array[Object{key@Number, label@String}], possible strings
//  default@Number, default option, optional
const RadioCheck = connect(
  (state, props) => ({
    currentRadio: config.get(`plugin.ShipInfo.${props.configKey}`, props.default || 0),
  })
)(class RadioCheck extends Component{

  shouldComponentUpdate = (nextProps, nextState) => {
    return this.props.currentRadio != nextProps.currentRadio
  }

  handleClickRadio = (index) => () => {
    config.set (`plugin.ShipInfo.${this.props.configKey}`, index)
  }

  render() {
    const {label, options, currentRadio} = this.props
    console.log(label, options, currentRadio)
    return(
      <div>
        <Row>
          <Col xs={2} className='filter-span'><span>{__(label)}</span></Col>
          {
            Object.keys(options).map(key => 
              <Col xs={2} key={key}>
                <Input 
                  type='radio' 
                  label={__(options[key])} 
                  onChange={this.handleClickRadio(parseInt(key))} 
                  checked={(key == currentRadio)} 
                />
              </Col>
            )
          }
        </Row>
      </div>
    )
  }
})

class TypeCheck extends Component {
  constructor(props) {
    super(props)
    const {shipTypeBoxes} = props
    const checked = shipTypes.slice().fill(false)
    shipTypeBoxes.map((v, i) => checked[v] = true)

    const checkedAll = config.get("plugin.ShipInfo.shipCheckedAll", true)

    this.state = {
      checked,
      checkedAll,
    }
  }

  handleClickCheckbox = (index) => () => {
    const checkboxes = []
    const checked = this.state.checked.slice()
    const checkedAll = false

    checked[index] = !checked[index]
    shipTypes.map((type, i) => {if(checked[i]) checkboxes.push[i]} )

    config.set("plugin.ShipInfo.shipCheckedAll", checkedAll)
    this.setState({
      checked,
      checkedAll,
    })
    this.props.filterRules('type', checkboxes)
  }

  handleClickCheckboxAll = () => {
    const checkboxes = []
    let checked = this.state.checked.slice()
    let {checkedAll} = this.state

    if(checkedAll) {
      checked = shipTypes.slice().fill(false)
      checkedAll = false
    } else {
      shipTypes.map((type, i) => {
        if(i != 0 && i != 9) {
          checked[i] = true
          checkboxes.push(i)
        }
      })
      checkedAll = true
    }

    config.set("plugin.ShipInfo.shipCheckedAll", checkedAll)
    this.setState({
      checked,
      checkedAll,
    })
    this.props.filterRules('type', checkboxes)
  }

  handleClickFilterButton = (type) => () => {
    const checkboxes = []
    const checked = shipTypes.slice().fill(false)
    let checkedAll = false
    let types = []

    switch(type) {
    case 'ALL':
      shipTypes.map((type, i) => {
        if(i != 0 && i != 9) {
          checked[i] = true
          checkboxes.push(i)
        }
      })
      checkedAll = true
      break
    default:
      types = typeMap[type] || []
      types.map(v => {
        checked[v] = true
        checkboxes.push(v)
      })
    }

    config.set("plugin.ShipInfo.shipCheckedAll", checkedAll)
    this.setState({
      checked,
      checkedAll,
    })
    this.props.filterRules('type', checkboxes)
  }

  render(){
    const {buttonsOnly} = this.props
    return(
      <div>
        {
          buttonsOnly ?
            <Row>
              <Col xs={12}>
                <Button className="filter-button-all" bsStyle='default' bsSize='small' onClick={this.handleClickFilterButton('ALL')} block>{__ ('All')}</Button>
              </Col>
            </Row>
          :
            <div>
              <Row>
                <Col xs={2}>
                  <Input type='checkbox' label={__('All')} onChange={this.handleClickCheckboxAll} checked={this.state.checkedAll} />
                </Col>
              </Row>
              <Row>
                {
                  shipTypes.map((shipType, index) => {
                    index >= 1 && shipType != shipTypes[index - 1] &&
                    <Col key={index} xs={2}>
                      <Input type='checkbox' label={shipType} key={index} value={index} onChange={this.handleClickCheckbox(index)} checked={this.state.checked[index]} />
                    </Col>
                  })
                }
              </Row>
            </div>
        }
        <Row>
          <Col xs={2}>
            <Button className="filter-button" bsStyle='default' bsSize='small' onClick={this.handleClickFilterButton('DD')} block>{__ ('FilterDD')}</Button>
          </Col>
          <Col xs={2}>
            <Button className="filter-button" bsStyle='default' bsSize='small' onClick={this.handleClickFilterButton('CL')} block>{__ ('FilterCL')}</Button>
          </Col>
          <Col xs={2}>
            <Button className="filter-button" bsStyle='default' bsSize='small' onClick={this.handleClickFilterButton('CA')} block>{__('FilterCA')}</Button>
          </Col>
          <Col xs={2}>
            <Button className="filter-button" bsStyle='default' bsSize='small' onClick={this.handleClickFilterButton('BB')} block>{__('FilterBB')}</Button>
          </Col>
          <Col xs={2}>
            <Button className="filter-button" bsStyle='default' bsSize='small' onClick={this.handleClickFilterButton('CV')} block>{__('FilterCV')}</Button>
          </Col>
          <Col xs={2}>
            <Button className="filter-button" bsStyle='default' bsSize='small' onClick={this.handleClickFilterButton('SS')} block>{__('FilterSS')}</Button>
          </Col>
        </Row>
      </div>
    )

  }
}

// TODO: merge all raido checkbox into one component to avoid code duplication

class LvCheck extends Component {
  constructor(){
    super()
    this.state = {
      checked : [false, false, true],
    }
  }

  handleClickRadio = (index) => () => {
    this.props.filterRules('lv', index)
  }

  render() {
    return(
      <div>
        <Row>
          <Col xs={2} className='filter-span'><span>{__ ('Level Setting')}</span></Col>
          <Col xs={2}>
            <Input type='radio' label={__('All')} onChange={this.handleClickRadio(0)} checked={(this.props.keyRadio == 0)} />
          </Col>
          <Col xs={2}>
            <Input type='radio' label={__('Lv.1')} onChange={this.handleClickRadio(1)} checked={(this.props.keyRadio == 1)} />
          </Col>
          <Col xs={2}>
            <Input type='radio' label={__('Above Lv.2')} onChange={this.handleClickRadio(2)} checked={(this.props.keyRadio == 2)} />
          </Col>
        </Row>
      </div>
    )
  }
}

class LockedCheck extends Component {
  constructor(){
    super()
    this.state = {
      checked : [false, true, false],
    }
  }

  handleClickRadio = (index) => () => {
    this.props.filterRules('locked', index)
  }

  render(){
    return(
      <div>
        <Row>
          <Col xs={2}  className='filter-span'><span>{__('Lock Setting')}</span></Col>
          <Col xs={2}>
            <Input type='radio' label={__('All')} onChange={this.handleClickRadio(0)} checked={(this.props.keyRadio == 0)} />
          </Col>
          <Col xs={2}>
            <Input type='radio' label={__('Locked')} onChange={this.handleClickRadio(1)} checked={(this.props.keyRadio == 1)} />
          </Col>
          <Col xs={2}>
            <Input type='radio' label={__('Not Locked')} onChange={this.handleClickRadio(2)} checked={(this.props.keyRadio == 2)} />
          </Col>
        </Row>
      </div>
    )
  }
}

class ExpeditionCheck extends Component {
  constructor(){
    super()
    this.state = {
      checked : [true, false, false],
    }
  }

  handleClickRadio = (index) => () => {
    this.props.filterRules('expedition', index)
  }

  render(){
    return(
      <div>
        <Row>
          <Col xs={2} className='filter-span'><span>{__ ('Expedition Setting')}</span></Col>
          <Col xs={2}>
            <Input type='radio' label={__('All')} onChange={this.handleClickRadio(0)} checked={(this.props.keyRadio == 0)} />
          </Col>
          <Col xs={2}>
            <Input type='radio' label={__('In Expedition')} onChange={this.handleClickRadio(1)} checked={(this.props.keyRadio == 1)} />
          </Col>
          <Col xs={2}>
            <Input type='radio' label={__('Not In Expedition')} onChange={this.handleClickRadio(2)} checked={(this.props.keyRadio == 2)} />
          </Col>
        </Row>
      </div>
    )
  }
}

class ModernizationCheck extends Component {
  constructor(){
    super()
    this.state = {
      checked : [true, false, false],
    }
  }

  handleClickRadio = (index) => () => {
    this.props.filterRules('modernization', index)
  }

  render(){
    return(
      <div>
        <Row>
          <Col xs={2} className='filter-span'><span>{__('Modernization Setting')}</span></Col>
          <Col xs={2}>
            <Input type='radio' label={__('All')} onChange={this.handleClickRadio(0)} checked={(this.props.keyRadio == 0)} />
          </Col>
          <Col xs={2}>
            <Input type='radio' label={__('Modernization Completed')} onChange={this.handleClickRadio(1)} checked={(this.props.keyRadio == 1)} />
          </Col>
          <Col xs={2}>
            <Input type='radio' label={__('Modernization Incompleted')} onChange={this.handleClickRadio(2)} checked={(this.props.keyRadio == 2)} />
          </Col>
        </Row>
      </div>
    )
  }
}

class RemodelCheck extends Component {
  constructor(){
    super()
    this.state = {
      checked : [true, false, false],
    }
  }

  handleClickRadio = (index) => () => {
    this.props.filterRules('remodel', index)
  }

  render(){
    return(
      <div>
        <Row>
          <Col xs={2} className='filter-span'><span>{__('Remodel Setting')}</span></Col>
          <Col xs={2}>
            <Input type='radio' label={__('All')} onChange={this.handleClickRadio(0)} checked={(this.props.keyRadio == 0)} />
          </Col>
          <Col xs={2}>
            <Input type='radio' label={__('Not Remodelable')} onChange={this.handleClickRadio(1)} checked={(this.props.keyRadio == 1)} />
          </Col>
          <Col xs={2}>
            <Input type='radio' label={__('Remodelable')} onChange={this.handleClickRadio(2)} checked={(this.props.keyRadio == 2)} />
          </Col>
        </Row>
      </div>
    )
  }
}

class SallyAreaCheck extends Component {
  constructor(props) {
    super(props)
    const {sallyAreaBoxes} = props
    this.state = {
      checked: sallyAreaBoxes,
      checkedAll: sallyAreaBoxes.reduce((a, b) => a && b),
    }
  }

  handleClickBox = (index) => () => {
    let checked = this.state.checked.slice()
    let {checkedAll} = this.state

    if (index == -1) {
      checkedAll = !checkedAll
      checked.fill(checkedAll)
    } else {
      checked[index] = !checked[index]
      checkedAll = checked.reduce((a, b) => a && b)
    }

    this.props.filterRules('sallyArea', checked)
    this.setState({
      checked,
      checkedAll,
    })
  }

  render(){
    const {sallyTags} = this.props
    const xs = Math.floor(12 / (1 + sallyTags.length))
    return(
      <div>
        <Row>
          <Col xs={2} className='filter-span'><span>{__('Sally Area Setting')}</span></Col>
          <Col xs={10}>
            <Col xs={xs}>
              <Input type='checkbox' label={__ ('All')} onChange={this.handleClickBox(-1)} checked={this.state.checkedAll} />
            </Col>
            {
              sallyTags.map((tag, idx) =>
                <Col xs={xs} key={idx}>
                  <Input type='checkbox' label={__(tag)} onChange={this.handleClickBox(idx)} checked={this.state.checked[idx]} />                
                </Col>
              )
            }
          </Col>
        </Row>
      </div>
    )
  }
}


export default class ShipInfoFilter extends Component {
  render(){
    const {showDetails} = this.props
    return(
      <Grid>
        <TypeCheck shipTypeBoxes={this.props.shipTypeBoxes} filterRules={this.props.typeFilterRules} buttonsOnly={!this.props.showDetails} />
        {
          showDetails &&
            <div>
              <RadioCheck 
                configKey='lvRadio'
                label='Level Setting'
                options={lvOptions}
                default={2}
              />
              <RadioCheck 
                configKey='lockedRadio'
                label='Lock Setting'
                options={lockedOptions}
                default={1}
              />
              <RadioCheck 
                configKey='expeditionRadio'
                label='Expedition Setting'
                options={expeditionOptions}
                default={0}
              />
              <RadioCheck 
                configKey='modernizationRadio'
                label='Modernization Setting'
                options={modernizationOptions}
                default={0}
              />
              <RadioCheck 
                configKey='remodelRadio'
                label='Remodel Setting'
                options={remodelOptions}
                default={0}
              />
              <SallyAreaCheck sallyTags={this.props.sallyTags} tagStyles={this.props.tagStyles}
                filterRules={this.props.sallyAreaFilterRules} sallyAreaBoxes={this.props.sallyAreaBoxes} 
              />
            </div>
        }
      </Grid>      
    )
  }
}
