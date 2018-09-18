import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { Dropdown } from 'react-bootstrap'
import { connect } from 'react-redux'
import { get } from 'lodash'
import FontAwesome from 'react-fontawesome'
import cls from 'classnames'
import { translate } from 'react-i18next'
import { compose } from 'redux'

import { extensionSelectorFactory } from 'views/utils/selectors'

import EuroStat from './euro-stat'
import CollectionProgress from './collection-progress'
import { captureRect } from '../../utils'

@translate(['poi-plugin-ship-info'])
@connect(state => ({
  color: get(state, 'fcd.shiptag.color', []),
  mapname: get(state, 'fcd.shiptag.mapname', []),
  vibrant: get(state, 'config.poi.vibrant'),
  zoomLevel: get(state, 'config.poi.zoomLevel', 1),
}))
class StatView extends Component {
  static propTypes = {
    vibrant: PropTypes.number,
    open: PropTypes.bool,
    window: PropTypes.instanceOf(window.constructor),
    zoomLevel: PropTypes.number.isRequired,
    t: PropTypes.func.isRequired,
  }

  constructor(props) {
    super(props)

    this.state = {
      view: 'leyte',
      left: 0,
      extend: false,
    }
  }

  componentWillReceiveProps = nextProps => {
    if (!this.props.open && nextProps.open) {
      const toolbar = nextProps.window.document.querySelector(
        '#settings-toolbar',
      )
      const planner = nextProps.window.document.querySelector('#stat')
      if (toolbar && planner) {
        const { left: outerLeft } = toolbar.getBoundingClientRect()
        const { left: innerLeft } = planner.getBoundingClientRect()
        this.setState({
          left: Math.round(outerLeft - innerLeft),
        })
      }
    }
  }

  handleCaptureRect = () => {
    this.setState({ extend: true }, async () => {
      await captureRect('#stat-rect', this.props.window.document)
      this.setState({ extend: false })
    })
  }

  render() {
    const { left, view, extend } = this.state
    const { vibrant, window, zoomLevel, t } = this.props

    return (
      <ul
        className="dropdown-menu"
        style={{
          width: `calc(95vw / ${zoomLevel})`,
          height: `calc(90vh / ${zoomLevel})`,
          left,
          background: `rgba(51, 51, 51, ${vibrant ? 0.95 : 1})`,
          overflowY: extend && 'visible',
        }}
      >
        <div
          style={{
            display: 'flex',
            position: 'sticky',
            top: '-5px',
            background: `rgba(51, 51, 51, ${vibrant ? 0.95 : 1})`,
            zIndex: 1,
          }}
        >
          <div className="radio-check" style={{ marginRight: '4em' }}>
            <div
              onClick={() => this.setState({ view: 'leyte' })}
              className={cls('filter-option', {
                checked: view === 'leyte',
                dark: window.isDarkTheme,
                light: !window.isDarkTheme,
              })}
              role="button"
              tabIndex="0"
            >
              {t('European')}
            </div>
            <div className="radio-check" style={{ marginRight: '4em' }}>
              <div
                onClick={() => this.setState({ view: 'collection' })}
                className={cls('filter-option', {
                  checked: view === 'collection',
                  dark: window.isDarkTheme,
                  light: !window.isDarkTheme,
                })}
                role="button"
                tabIndex="0"
              >
                {t('Collection')}
              </div>
            </div>
          </div>
          <div className="radio-check" style={{ marginRight: '4em' }}>
            <div
              onClick={this.handleCaptureRect}
              role="button"
              tabIndex="0"
              className="filter-option dark"
            >
              {t('Save to image')}
            </div>
          </div>
        </div>
        <div id="stat-rect" style={{ padding: extend && '1em' }}>
          {view === 'leyte' && <EuroStat />}
          {view === 'collection' && <CollectionProgress />}
        </div>
      </ul>
    )
  }
}

const handleToggleAction = () => ({
  type: '@@poi-plugin-ship-info@active-dropdown',
  activeDropdown: 'stat',
})

const PlannerDropdown = compose(
  translate(['poi-plugin-ship-info']),
  connect(
    (state, props) => ({
      activeDropdown: get(
        extensionSelectorFactory('poi-plugin-ship-info')(state),
        'ui.activeDropdown',
        0,
      ),
      window: props.window,
    }),
    { handleToggle: handleToggleAction },
  ),
)(({ activeDropdown, handleToggle, window, t }) => (
  <Dropdown
    id="stat"
    pullRight
    open={activeDropdown === 'stat'}
    onToggle={handleToggle}
  >
    <Dropdown.Toggle>
      <FontAwesome name="line-chart" style={{ marginRight: '1ex' }} />
      {t('Statistics')} <sup>BETA</sup>
    </Dropdown.Toggle>
    <StatView bsRole="menu" open={activeDropdown === 'stat'} window={window} />
  </Dropdown>
))

export default PlannerDropdown
