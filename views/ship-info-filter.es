import React, { Component } from 'react'
import { Grid, Row, Col, Input, Button, ButtonGroup, Label } from 'react-bootstrap'
import { connect } from 'react-redux'
import { get, isEqual, difference } from 'lodash'
import { typeMap, shipTypeMap,
  lvOptions, lockedOptions, expeditionOptions, modernizationOptions, remodelOptions } from './constants'

const __ = window.__

const shipTypes = ['', '海防艦', '駆逐艦', '軽巡洋艦', 
  '重雷装巡洋艦', '重巡洋艦', '航空巡洋艦', '軽空母', '戦艦', 
  '戦艦', '航空戦艦', '正規空母', '超弩級戦艦', '潜水艦', 
  '潜水空母', '補給艦', '水上機母艦', '揚陸艦', '装甲空母', 
  '工作艦', '潜水母艦', '練習巡洋艦']


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

// new ship type check is based on preset ship type collections as in typeMap
// to ensure a downgrade compatibility, another cofig key is used
const TypeCheck = connect(
  (state, props) => {
    // const $shipTypes = get(state, 'const.$shipTypes', {})
    // const shipTypeIds = Object.keys($shipTypes).map(key => $shipTypes[key].api_id)
    // let othersId = shipTypeIds.slice()
    // Object.keys(typeMap).forEach(type => 
    //   othersId = difference(othersId, typeMap[type])
    // )
    // const types = {
    //   ...typeMap,
    //   others: othersId,
    // }
    // const defaultBoxes = shipTypeIds.slice()

    const defaultChecked = shipTypeMap.slice().fill(true)

    let checked = config.get("plugin.ShipInfo.shipTypeChecked", defaultChecked)
    checked = defaultChecked.length == checked.length ? checked : defaultChecked
    const checkedAll = checked.reduce((a, b) => a && b)

    return({
      checked,
      checkedAll,
    })
  }
)(class TypeCheck extends Component {
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

  handleClickBox = (index) => () => {
    let checked = this.props.checked.slice()
    let {checkedAll, typeIndex} = this.props

    if (index == -1) {
      checkedAll = !checkedAll
      checked.fill(checkedAll)
    } else {
      checked[index] = !checked[index]
      checkedAll = checked.reduce((a, b) => a && b)
    }

    config.set ("plugin.ShipInfo.shipTypeChecked", checked)
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
    console.log(this.props.types)
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
})

const SallyAreaCheck = connect(
  (state, props) => {
    const mapname = get(state, 'fcd.shiptag.mapname', [])
    const defaultChecked = mapname.slice().fill(true)
    let checked = JSON.parse(config.get("plugin.ShipInfo.sallyAreaBoxes", JSON.stringify(defaultChecked)))

    checked = mapname.length == checked.length ? checked : defaultChecked
    const checkedAll = checked.reduce((a, b) => a && b)

    return({
      mapname,
      color: get(state, 'fcd.shiptag.color', []),
      checked,
      checkedAll,
    })
  }
)(class SallyAreaCheck extends Component {

  shouldComponentUpdate = (nextProps, nextState) => {
    return nextProps.mapname.length != this.props.mapname.length ||
      !isEqual(nextProps.checked, this.props.checked)
  }

  handleClickBox = (index) => () => {
    let checked = this.props.checked.slice()
    let {checkedAll} = this.props

    if (index == -1) {
      checkedAll = !checkedAll
      checked.fill(checkedAll)
    } else {
      checked[index] = !checked[index]
      checkedAll = checked.reduce((a, b) => a && b)
    }

    config.set ("plugin.ShipInfo.sallyAreaBoxes", JSON.stringify(checked))
  }

  render(){
    const {mapname, color, checked, checkedAll} = this.props
    const xs = Math.floor(12 / (1 + mapname.length))
    console.log(mapname, color, checked, checkedAll)
    return(
      <div>
        <Row>
          <Col xs={2} className='filter-span'><span>{__('Sally Area Setting')}</span></Col>
          <Col xs={10}>
            <Col xs={xs}>
              <Input type='checkbox' 
                label={__ ('All')} 
                onChange={this.handleClickBox(-1)} 
                checked={checkedAll}
              />
            </Col>
            {
              mapname.map((name, idx) =>
                <Col xs={xs} key={idx}>
                  <Input type='checkbox' 
                    label={__(name)} 
                    onChange={this.handleClickBox(idx)} 
                    checked={checked[idx]} 
                    style={{color: color[idx] || ''}}
                  />                
                </Col>
              )
            }
          </Col>
        </Row>
      </div>
    )
  }
})


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
              <SallyAreaCheck />
            </div>
        }
      </Grid>      
    )
  }
}
