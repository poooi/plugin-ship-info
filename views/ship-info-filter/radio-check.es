import React, { Component } from 'react'
import { Row, Col, Input } from 'react-bootstrap'
import { connect } from 'react-redux'
import { get } from 'lodash'


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

export default RadioCheck
