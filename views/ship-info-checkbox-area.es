import React, { Component } from 'react'

import Divider from './divider'
import ShipInfoFilter from './ship-info-filter'

const { __ } = window

export default class ShipInfoCheckboxArea extends Component {
  constructor() {
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

  render() {
    return (
      <div id="ship-info-settings">
        <div onClick={this.handleFilterShow} role="button" tabIndex="0">
          <Divider text={__('Filter Setting')} icon show={this.state.filterShow} />
        </div>
        <div id="ship-info-filter" style={{ display: 'block' }}>
          <ShipInfoFilter
            showDetails={this.state.filterShow}
          />
        </div>
      </div>
    )
  }
}
