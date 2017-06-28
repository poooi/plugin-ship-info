import React, { Component } from 'react'
import { Button, ButtonGroup, ButtonToolbar, Collapse } from 'react-bootstrap'

import BookmarkDropdown from './bookmark-dropdown'
import ConfigMenu from './config-dropdown'

const { __, config } = window

export default class ShipInfoCheckboxArea extends Component {
  state = {
    filterShow: false,
    menuShow: true,
  }

  componentDidMount = () => {
    window.addEventListener('collapse-in', this.handleColllapseInEvent)
    window.addEventListener('collapse-out', this.handleColllapseOutEvent)
  }

  componentWillUnmount = () => {
    window.removeEventListener('collapse-in', this.handleColllapseInEvent)
    window.removeEventListener('collapse-out', this.handleColllapseOutEvent)
  }

  handleResetAll = () => {
    const { bounds } = config.get('plugin.ShipInfo', {})
    config.set('plugin.ShipInfo', {
      bounds,
    })
  }

  handleMenuOpen = (menuShow) => {
    if (menuShow === this.state.menuShow) return
    this.setState({ menuShow })
  }

  handleColllapseInEvent = () => {
    this.handleMenuOpen(true)
  }

  handleColllapseOutEvent = () => {
    this.handleMenuOpen(false)
  }

  render() {
    return (
      <div id="ship-info-settings">
        <div>
          <ButtonToolbar id="settings-toolbar">
            <ButtonGroup>
              <Button onClick={() => this.handleMenuOpen(!this.state.menuShow)}>
                {__('Options')}
              </Button>
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
        <div>
          <Collapse in={this.state.menuShow}>
            <div>
              <ConfigMenu />
            </div>
          </Collapse>
        </div>
      </div>
    )
  }
}
