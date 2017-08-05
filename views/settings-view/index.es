import React, { Component } from 'react'
import { connect } from 'react-redux'
import { Button, ButtonGroup, ButtonToolbar, Collapse } from 'react-bootstrap'
import FA from 'react-fontawesome'
import { get } from 'lodash'

import { extensionSelectorFactory } from 'views/utils/selectors'

import BookmarkDropdown from './bookmark-dropdown'
import ConfigMenu from './config-menu'
import ExportDropdown from './export-dropdown'

const { __, config } = window

const ShipInfoCheckboxArea = connect(
  state => ({
    toTop: get(extensionSelectorFactory('poi-plugin-ship-info')(state), 'ui.toTop', 0),
  })
)(class ShipInfoCheckboxArea extends Component {
  state = {
    menuShow: false,
    autoShow: true,
  }

  handleResetAll = () => {
    const { bounds } = config.get('plugin.ShipInfo', {})
    config.set('plugin.ShipInfo', {
      bounds,
    })
  }

  handleMenuOpen = () => {
    this.setState({
      menuShow: !this.state.menuShow,
    })
  }

  handleAutoShow = () => {
    this.setState({
      autoShow: !this.state.autoShow,
    })
  }

  render() {
    const { menuShow, autoShow } = this.state
    const { toTop } = this.props
    return (
      <div id="ship-info-settings">
        <div>
          <ButtonToolbar id="settings-toolbar">
            <ButtonGroup>
              <Button
                onClick={this.handleAutoShow}
                bsStyle={autoShow ? 'success' : 'default'}
              >
                <FA name={autoShow ? 'unlock' : 'lock'} />
              </Button>
              <Button
                onClick={this.handleMenuOpen}
                bsStyle={menuShow ? 'success' : 'default'}
              >
                <FA name="filter" style={{ marginRight: '1ex' }} />{__('Filter Setting')}
              </Button>
            </ButtonGroup>

            <ButtonGroup>
              <Button
                onClick={this.handleResetAll}
                id="reset-button"
              >
                <FA name="undo" style={{ marginRight: '1ex' }} />{__('Reset')}
              </Button>
              <BookmarkDropdown />
            </ButtonGroup>
            <ButtonGroup>
              <ExportDropdown />
            </ButtonGroup>
          </ButtonToolbar>
        </div>
        <div>
          <Collapse in={menuShow || (toTop && autoShow)}>
            <div>
              <ConfigMenu />
            </div>
          </Collapse>
        </div>
      </div>
    )
  }
})

export default ShipInfoCheckboxArea
