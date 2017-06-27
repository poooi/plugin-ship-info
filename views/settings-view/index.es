import React, { Component } from 'react'
import { Button, ButtonGroup, ButtonToolbar } from 'react-bootstrap'

import BookmarkDropdown from './bookmark-dropdown'
import ConfigDropdown from './config-dropdown'

const { __, config } = window

export default class ShipInfoCheckboxArea extends Component {
  constructor() {
    super()
    this.state = {
      filterShow: false,
    }
  }

  handleResetAll = () => {
    const { bounds } = config.get('plugin.ShipInfo', {})
    config.set('plugin.ShipInfo', {
      bounds,
    })
  }

  render() {
    return (
      <div id="ship-info-settings">
        <ButtonToolbar id="settings-toolbar">
          <ButtonGroup>
            <ConfigDropdown />
          </ButtonGroup>

          <ButtonGroup>
            <Button
              onClick={this.handleResetAll}
              id="reset-button"
            >
              {__('Reset')}
            </Button>
            <BookmarkDropdown />
          </ButtonGroup>
        </ButtonToolbar>
      </div>
    )
  }
}
