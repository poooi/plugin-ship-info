import React, { Component } from 'react'
import propTypes from 'prop-types'
import { connect } from 'react-redux'
import { Button, ButtonGroup, ButtonToolbar, Collapse } from 'react-bootstrap'
import FA from 'react-fontawesome'
import { get } from 'lodash'
import { observe } from 'redux-observers'

import { extensionSelectorFactory } from 'views/utils/selectors'
import { store } from 'views/create-store'
import { WindowEnv } from 'views/components/etc/window-env'
import i18next from 'views/env-parts/i18next'

import BookmarkDropdown from './bookmark-dropdown'
import ConfigMenu from './config-menu'
import ExportDropdown from './export-dropdown'
import PlannerDropdown from './planner-dropdown'
import StatDropdown from './stat-dropdown'

import { dataObserver, initStore } from '../redux'

const { config } = window
const __ = i18next.getFixedT(null, ['poi-plugin-ship-info', 'resources'])

const ShipInfoCheckboxArea = connect(state => ({
  toTop: get(
    extensionSelectorFactory('poi-plugin-ship-info')(state),
    'ui.toTop',
    true,
  ),
}))(
  class ShipInfoCheckboxArea extends Component {
    static propTypes = {
      toTop: propTypes.bool,
      dispatch: propTypes.func,
      window: propTypes.instanceOf(window.constructor),
    }

    state = {
      menuShow: false,
      autoShow: true,
    }

    componentDidMount = () => {
      this.props.dispatch(initStore)
      this.unsubscribeObserver = observe(store, [dataObserver])
    }

    componentWillUnmount = () => {
      if (this.unsubscribeObserver) {
        this.unsubscribeObserver()
      }
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

    updateCollapseComponentExtended = isExtend =>
      this.props.dispatch({
        type: '@@poi-plugin-ship-info@extend',
        isExtend,
      })

    render() {
      const { menuShow, autoShow } = this.state
      const { toTop, window } = this.props
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
                  <FA name="filter" style={{ marginRight: '1ex' }} />
                  {__('Filter Setting')}
                </Button>
              </ButtonGroup>

              <ButtonGroup>
                <Button onClick={this.handleResetAll} id="reset-button">
                  <FA name="undo" style={{ marginRight: '1ex' }} />
                  {__('Reset')}
                </Button>
                <BookmarkDropdown />
              </ButtonGroup>
              <ButtonGroup>
                <ExportDropdown />
              </ButtonGroup>
              <ButtonGroup>
                <PlannerDropdown window={window} />
              </ButtonGroup>
              <ButtonGroup>
                <StatDropdown window={window} />
              </ButtonGroup>
            </ButtonToolbar>
          </div>
          <div>
            <Collapse
              in={menuShow || (toTop && autoShow)}
              timeout={750}
              onEntered={() => this.updateCollapseComponentExtended(true)}
              onExit={() => this.updateCollapseComponentExtended(false)}
            >
              <div>
                <ConfigMenu />
              </div>
            </Collapse>
          </div>
        </div>
      )
    }
  },
)

export default props => (
  <WindowEnv.Consumer>
    {({ window }) => <ShipInfoCheckboxArea window={window} {...props} />}
  </WindowEnv.Consumer>
)
