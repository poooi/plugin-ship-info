import React, { Component } from 'react'
import propTypes from 'prop-types'
import { Checkbox } from 'react-bootstrap'
import { connect } from 'react-redux'
import { get } from 'lodash'
import cls from 'classnames'

const { __ } = window.i18n['poi-plugin-ship-info']

const hexToRGBA = (hex, opacity = 1) => {
  if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
    let color = hex.substring(1)
    if (color.length === 3) {
      color = [color[0], color[0], color[1], color[1], color[2], color[2]]
    }
    const r = parseInt(color.slice(0, 2), 16)
    const g = parseInt(color.slice(2, 4), 16)
    const b = parseInt(color.slice(4, 6), 16)
    return `rgba(${r}, ${g}, ${b}, ${opacity})`
  }
  return ''
}

// to ensure a downgrade compatibility, another config key is used
// Sally area value starts from 1, 0 is used for non-tagged ships
const SallyAreaCheck = connect(
  (state) => {
    const displayFleetName = get(state.config, 'plugin.ShipInfo.displayFleetName', false)
    const mapname = displayFleetName
      ? get(state, ['fcd', 'shiptag', 'fleetname', window.language], [])
      : get(state, ['fcd', 'shiptag', 'mapname'], [])
    const defaultChecked = Array(mapname.length + 1).fill(true)
    let checked = get(state.config, 'plugin.ShipInfo.sallyAreaChecked', defaultChecked)

    // reset config values if updated
    checked = (mapname.length + 1) === checked.length
      ? checked
      : defaultChecked
    const checkedAll = checked.reduce((a, b) => a && b, true)

    return ({
      mapname,
      color: get(state, 'fcd.shiptag.color', []),
      checked,
      checkedAll,
      displayFleetName,
    })
  }
)(class SallyAreaCheck extends Component {
  static propTypes = {
    checked: propTypes.arrayOf(propTypes.bool).isRequired,
    checkedAll: propTypes.bool.isRequired,
    mapname: propTypes.arrayOf(propTypes.string),
    color: propTypes.arrayOf(propTypes.string),
    displayFleetName: propTypes.bool.isRequired,
  }

  handleClickBox = index => () => {
    const checked = this.props.checked.slice()
    let { checkedAll } = this.props

    if (index === -1) {
      checkedAll = !checkedAll
      checked.fill(checkedAll)
    } else {
      checked[index] = !checked[index]
      checkedAll = checked.reduce((a, b) => a && b, true)
    }

    config.set('plugin.ShipInfo.sallyAreaChecked', checked)
  }

  handleChangeDisplayFleetName = () => {
    config.set('plugin.ShipInfo.displayFleetName', !this.props.displayFleetName)
  }

  render() {
    const {
      mapname, color, checked, checkedAll, displayFleetName,
    } = this.props
    return (
      <div className="radio-check">
        <div className="filter-span">
          <span>{__('Sally Area')}</span>
          <Checkbox inline checked={displayFleetName} onChange={this.handleChangeDisplayFleetName}>{__('Show fleet name')}</Checkbox>
        </div>

        <div
          role="button"
          tabIndex="0"
          onClick={this.handleClickBox(-1)}
          className={cls('filter-option', {
            checked: checkedAll,
            dark: window.isDarkTheme,
            light: !window.isDarkTheme,
          })}
        >
          {__('All')}
        </div>
        <div
          role="button"
          tabIndex="0"
          onClick={this.handleClickBox(0)}
          className={cls('filter-option', {
            checked: checked[0],
            dark: window.isDarkTheme,
            light: !window.isDarkTheme,
          })}
        >
          {__('Free')}
        </div>
        {
          mapname.map((name, idx) =>
            (
              <div
                key={name}
                onClick={this.handleClickBox(idx + 1)}
                className={cls('filter-option', {
                  dark: window.isDarkTheme,
                  light: !window.isDarkTheme,
                })}
                role="button"
                tabIndex="0"
                style={{
                  color: !checked[idx + 1] && color[idx],
                  backgroundColor: checked[idx + 1] && hexToRGBA(color[idx], 0.75),
                }}
              >
                {__(name)}
              </div>
            )
          )
        }
      </div>
    )
  }
})

export default SallyAreaCheck
