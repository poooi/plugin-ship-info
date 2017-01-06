import React, { Component } from 'react'
import { Grid, Row, Col, Input, Label } from 'react-bootstrap'
import { connect } from 'react-redux'
import { get, isEqual } from 'lodash'
import { shipTypeMap,
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

// new ship type check is based on preset ship type collections as in shipTypeMap
// to ensure a downgrade compatibility, another cofig key is used
const TypeCheck = connect(
  (state, props) => {
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

  render(){
    const {checked, checkedAll} = this.props
    const xs = Math.floor(24 / (1 + shipTypeMap.length))
    return(
      <div className='filter-type'>
        <Row>
          <Col xs={2} className='filter-span'><span>{__('Ship Type Setting')}</span></Col>
          <Col xs={10}>
            <Col xs={xs} className='filter-span'>
              <Input type='checkbox' 
                label={__ ('All')} 
                onChange={this.handleClickBox(-1)} 
                checked={checkedAll}
              />
            </Col>
            <Col xs={12-xs}>
              {
              shipTypeMap.map((type, idx) =>
                <Col xs={xs} key={idx}>
                  <Input type='checkbox' 
                    label={__(`Filter${type.name}`)} 
                    onChange={this.handleClickBox(idx)} 
                    checked={checked[idx]} 
                  />                
                </Col>
              )
            }
            </Col>
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
    let checked = config.get("plugin.ShipInfo.sallyAreaChecked", defaultChecked)

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
        <TypeCheck />
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
