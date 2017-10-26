import React, { Component } from 'react'
import propTypes from 'prop-types'
import { Dropdown, Button, ButtonGroup, ButtonToolbar } from 'react-bootstrap'
import { connect } from 'react-redux'
import { get, each, findIndex } from 'lodash'
import FontAwesome from 'react-fontawesome'
import cls from 'classnames'

import { extensionSelectorFactory } from 'views/utils/selectors'

import LeyteStat from './leyte-stat'

const { __ } = window


const StatView = connect(
  state => ({
    color: get(state, 'fcd.shiptag.color', []),
    mapname: get(state, 'fcd.shiptag.mapname', []),
    vibrant: get(state, 'config.poi.vibrant'),
  })
)(class StatView extends Component {
  static propTypes = {
    vibrant: propTypes.number,
    open: propTypes.bool,
  }

  constructor(props) {
    super(props)

    this.state = {
      view: 'leyte',
      left: 0,
    }
  }

  componentWillReceiveProps = (nextProps) => {
    if (!this.props.open && nextProps.open) {
      const toolbar = document.querySelector('#settings-toolbar')
      const planner = document.querySelector('#stat')
      if (toolbar && planner) {
        const { left: outerLeft } = toolbar.getBoundingClientRect()
        const { left: innerLeft } = planner.getBoundingClientRect()
        this.setState({
          left: Math.round(outerLeft - innerLeft),
        })
      }
    }
  }

  render() {
    const { left, view } = this.state
    const { vibrant } = this.props
    return (
      <ul
        className="dropdown-menu"
        style={{
          width: '99vw',
          height: '95vh',
          left,
          background: `rgba(51, 51, 51, ${vibrant ? 0.95 : 1})`,
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
              {__('Leyte Gulf')}
            </div>
          </div>
        </div>
        {
          view === 'leyte' &&
          <LeyteStat />
        }
      </ul>
    )
  }
})

const handleToggleAction = () => ({
  type: '@@poi-plugin-ship-info@active-dropdown',
  activeDropdown: 'stat',
})


const PlannerDropdown = connect(
  state => ({
    activeDropdown: get(extensionSelectorFactory('poi-plugin-ship-info')(state), 'ui.activeDropdown', 0),
  }),
  { handleToggle: handleToggleAction },
)(({ activeDropdown, handleToggle }) =>
  (<Dropdown id="stat" pullRight open={activeDropdown === 'stat'} onToggle={handleToggle}>
    <Dropdown.Toggle>
      <FontAwesome name="line-chart" style={{ marginRight: '1ex' }} />{__('Statistics')} <sup>BETA</sup>
    </Dropdown.Toggle>
    <StatView bsRole="menu" open={activeDropdown === 'stat'} />
  </Dropdown>)
)

export default PlannerDropdown
