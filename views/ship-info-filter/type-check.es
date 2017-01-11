import React, { Component } from 'react'
import { Row, Col, Input, Button } from 'react-bootstrap'
import { connect } from 'react-redux'
import { get, isEqual, map, intersection } from 'lodash'
import FontAwesome from 'react-fontawesome'
import { shipSuperTypeMap } from '../constants'

const __ = window.__

// new super ship type check is based on preset ship type collections as in shipSuperTypeMap
// to ensure a downgrade compatibility, another config key is used
const TypeCheck = connect(
  (state, props) => {
    const $shipTypes = get(state, 'const.$shipTypes')
    const defaultChecked = map($shipTypes, type => type.api_id).fill(true)

    let checked = get(state.config, "plugin.ShipInfo.shipTypeChecked", defaultChecked)
    checked = defaultChecked.length == checked.length ? checked : defaultChecked
    const checkedAll = checked.reduce((a, b) => a && b, true)

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

  handleClickSingleBox = (index) => () => {
    let checked = this.props.checked.slice()
    let {checkedAll} = this.props

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
                  onChange={this.handleClickSingleBox(-1)} 
                  checked={checkedAll} 
                />  
              :
                <Button 
                  className='filter-button-all'
                  onClick={this.handleClickSingleBox(-1)} 
                  bsStyle={checkedAll ? 'success': 'warning'}
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
                    onChange={this.handleClickSingleBox(key - 1)} 
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
                  bsStyle={
                    this.getArrayInclusion(checkedTypes, supertype.id)
                    ? 'success' : 'warning'
                  }
                >
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

export default TypeCheck