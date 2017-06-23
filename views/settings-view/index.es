import React, { Component } from 'react'
import { Grid, Button, ButtonGroup, ButtonToolbar } from 'react-bootstrap'

import TypeDropdown from './type-dropdown'
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
        <div id="ship-info-filter" style={{ display: 'block' }}>
          <Grid>
            <ButtonToolbar id="settings-toolbar">
              <ButtonGroup>
                <TypeDropdown />
                <ConfigDropdown />
              </ButtonGroup>

              <ButtonGroup>
                <Button
                  onClick={this.handleResetAll}
                  id="reset-button"
                >
                  {__('Reset all Filters & Settings')}
                </Button>
                <BookmarkDropdown />
              </ButtonGroup>
            </ButtonToolbar>
          </Grid>
        </div>
      </div>
    )
  }
}
