import React, { Component } from 'react'
import propTypes from 'prop-types'
import { div } from 'react-bootstrap'
import { connect } from 'react-redux'
import { get } from 'lodash'
import cls from 'classnames'


const __ = window.__

// single option check
// props:
//  configKey@String, key for identify the component
//  label@String, displayed label
//  options@Array[Object{key@Number, label@String}], possible strings
//  default@Number, default option, optional
const RadioCheck = connect(
  (state, props) => ({
    currentRadio: get(state.config, `plugin.ShipInfo.${props.configKey}`, props.default || 0),
  })
)(class RadioCheck extends Component {

  static propTypes = {
    label: propTypes.string.isRequired,
    options: propTypes.objectOf(propTypes.string),
    currentRadio: propTypes.number.isRequired,
    configKey: propTypes.string.isRequired,
  }

  shouldComponentUpdate = nextProps => this.props.currentRadio !== nextProps.currentRadio

  handleClickRadio = index => () => {
    config.set(`plugin.ShipInfo.${this.props.configKey}`, index)
  }

  render() {
    const { label, options, currentRadio } = this.props
    return (
      <div className="radio-check">
        <div className="filter-span"><span>{__(label)}</span></div>
        {
        Object.keys(options).map(key =>
          (
            <div
              key={key}
              role="button"
              tabIndex="0"
              onClick={this.handleClickRadio(parseInt(key, 10))}
              className={cls('filter-option', {
                checked: parseInt(key, 10) === currentRadio,
                dark: window.isDarkTheme,
                light: !window.isDarkTheme,
              })}
            >
              {__(options[key])}
            </div>
          )
        )
      }
      </div>
    )
  }
})

export default RadioCheck
