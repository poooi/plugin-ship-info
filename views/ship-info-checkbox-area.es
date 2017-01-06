import React, {Component} from 'react'
import {Button, Input, Col, Grid, Row} from 'react-bootstrap'

import Divider from './divider'
import ShipInfoFilter from './ship-info-filter'

export default class ShipInfoCheckboxArea extends Component {
  constructor(){
    super()
    this.state = {
      filterShow: false,
    }
  }

  handleFilterShow = () => {
    this.setState({
      filterShow: !this.state.filterShow,
    })
  }

  render(){
    return(
      <div id='ship-info-settings'>
        <div onClick={this.handleFilterShow}>
          <Divider text={__('Filter Setting')} icon={true} show={this.state.filterShow} />
        </div>
        <div id='ship-info-filter' style={{display: 'block'}}>
          <ShipInfoFilter
            showDetails={this.state.filterShow}
          />
        </div>
      </div>
    )
  }
}
