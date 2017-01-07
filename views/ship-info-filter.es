import React, { Component } from 'react'
import { Grid, Row, Col, Input, Label, Button, ButtonGroup } from 'react-bootstrap'
import { connect } from 'react-redux'
import { get, isEqual, map, intersection } from 'lodash'
import FontAwesome from 'react-fontawesome'
import { shipSuperTypeMap,
  lvOptions, lockedOptions, expeditionOptions, modernizationOptions, remodelOptions } from './constants'

const __ = window.__

// single option check
// props: 
//  configKey@String, key for identify the component
//  label@String, displayed label
//  options@Array[Object{key@Number, label@String}], possible strings
//  default@Number, default option, optional
const RadioCheck = connect(
  (state, props) => ({
    currentRadio: get(state.config, `plugin.ShipInfo.${props.configKey}`, props.default || 0),
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

// new ship type check is based on preset ship type collections as in shipSuperTypeMap
// to ensure a downgrade compatibility, another config key is used
const TypeCheck = connect(
  (state, props) => {
    const $shipTypes = get(state, 'const.$shipTypes')
    const defaultChecked = map($shipTypes, type => type.api_id).fill(true)

    let checked = get(state.config, "plugin.ShipInfo.shipTypeChecked", defaultChecked)
    checked = defaultChecked.length == checked.length ? checked : defaultChecked
    const checkedAll = checked.reduce((a, b) => a && b)

    return({
      show: props.show || false,
      $shipTypes,
      checked,
      checkedAll,
    })
  }
)(class TypeCheck extends Component {

  shouldComponentUpdate = (nextProps, nextState) => {
    return !isEqual(nextProps.checked, this.props.checked) || this.props.show != nextProps.show
  }

  getTypeArray = (checked, $shipTypes) => {
    return checked.reduce((types, checked, index) => {
      return checked && ((index+1) in $shipTypes) ? types.concat([index + 1]) : types
    }, [])
  }

  getArrayInclusion = (array, subArray) => {
    return isEqual(intersection(array, subArray), subArray) && array.length > 0
  }

  handleClickSuperType = (checkedTypes, index) => () => {
    let checked = this.props.checked.slice()
    const keys = shipSuperTypeMap[index].id
    if(this.getArrayInclusion(checkedTypes, keys)){
      keys.forEach((key) => {
        checked[key - 1] = false
      })
    } else {
      keys.forEach((key) => {
        checked[key - 1] = true
      })
    }

    config.set ("plugin.ShipInfo.shipTypeChecked", checked)
  }

  handleClickSignleBox = (index) => () => {
    let checked = this.props.checked.slice()
    let {checkedAll} = this.props
    console.log(index)

    if (index == -1) {
      checkedAll = !checkedAll
      checked.fill(checkedAll)
    } else {
      checked[index] = !checked[index]
    }

    config.set ("plugin.ShipInfo.shipTypeChecked", checked)
  }

  render(){
    const {show, $shipTypes, checked, checkedAll} = this.props
    const xs = 2
    const checkedTypes = checked.reduce((types, checked, index) => {
      return checked && ((index + 1) in $shipTypes) ? types.concat([index + 1]) : types
    }, [] )
    

    return(
      <div className='filter-type'>
        <Row>
          <Col xs={12} className='super-type'>
            {
              show ?
                <Input type='checkbox' 
                  label={__('All')} 
                  onChange={this.handleClickSignleBox(-1)} 
                  checked={checkedAll} 
                />  
              :
                <Button 
                  className='filter-button-all'
                  onClick={this.handleClickSignleBox(-1)} 
                  bsStyle={checkedAll ? 'success': 'default'}
                >
                  {__ ('All')}
                </Button>
            }
          </Col>
        </Row>
        {
          show &&
          <Row>
            <Col xs={12}>
              {
              map($shipTypes, (type, key) =>
                <Col xs={xs} key={key}>
                  <Input type='checkbox' 
                    label={__(type.api_name)} 
                    onChange={this.handleClickSignleBox(key - 1)} 
                    checked={checked[key -1]} 
                  />                
                </Col>
              )
            }
            </Col>
          </Row>
        }
        <Row>
          <Col xs={12} className='super-type'>
            {
              shipSuperTypeMap.map((supertype, index) =>
                <Button
                  key={index}
                  className='filter-button'
                  onClick={this.handleClickSuperType(checkedTypes, index)} 
                  bsStyle='default'
                >
                  {this.getArrayInclusion(checkedTypes, supertype.id) ?
                    <FontAwesome name='check'/>  
                    :
                    ''
                  }
                  {__(`Filter${supertype.name}`)}              
                </Button>
              )
            }
          </Col>
        </Row>
      </div>
    )

  }
})

// to ensure a downgrade compatibility, another config key is used
const SallyAreaCheck = connect(
  (state, props) => {
    const mapname = get(state, 'fcd.shiptag.mapname', [])
    const defaultChecked = mapname.slice().fill(true)
    let checked = get(state.config, "plugin.ShipInfo.sallyAreaChecked", defaultChecked)

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

    config.set ("plugin.ShipInfo.sallyAreaChecked", checked)
  }

  render(){
    const {mapname, color, checked, checkedAll} = this.props
    const xs = Math.floor(12 / (1 + mapname.length))
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
                    label={<Label style={{color: color[idx]}}>{__(name)}</Label> } 
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
        <TypeCheck show={showDetails}/>
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
