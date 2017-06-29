import React, { Component } from 'react'
import propTypes from 'prop-types'
import { Dropdown, Button } from 'react-bootstrap'
import { connect } from 'react-redux'
import FontAwesome from 'react-fontawesome'
import cls from 'classnames'

import { shipRowsSelector } from '../selectors'
import { parseCsv } from '../csv-parser'

const { __ } = window

const RadioCheck = ({ label, options, value: currentValue, onChange }) => (
  <div className="radio-check">
    <div className="filter-span"><span>{__(label)}</span></div>
    {
    options.map(({ name, value }) =>
      (
        <div
          key={name}
          role="button"
          tabIndex="0"
          onClick={onChange(value)}
          className={cls('filter-option', {
            checked: currentValue === value,
            dark: window.isDarkTheme,
            light: !window.isDarkTheme,
          })}
        >
          {__(name)}
        </div>
      )
    )
  }
  </div>
)

const sepOptions = [
  {
    name: 'comma',
    value: ',',
  },
  {
    name: 'semicolon',
    value: ';',
  },
  {
    name: 'tab',
    value: '\t',
  },
]

const endOptions = [
  {
    name: 'Windows (CRLF)',
    value: '\r\n',
  },
  {
    name: 'Unix (LF)',
    value: '\n',
  },
]

const selectionOptions = [
  {
    name: 'Current list',
    value: 'current',
  },
  {
    name: 'All',
    value: 'all',
  },
]

class ExportMenu extends Component {

  constructor(props) {
    super(props)

    this.state = {
      sep: ',',
      end: process.platform === 'win32' ? '\r\n' : '\n',
      selection: 'all',
    }
  }

  handleChange = name => (value) => {
    this.setState({
      [name]: value,
    })
  }

  handleExport = () => {
    console.log(parseCsv(this.props.rows))
  }

  render() {
    const { sep, end, selection } = this.state
    return (
      <ul className="dropdown-menu">
        <div className="single-col">
          <RadioCheck
            label="Data"
            options={selectionOptions}
            value={selection}
            onChange={this.handleChange('selection')}
          />
          <RadioCheck
            label="Separator"
            options={sepOptions}
            value={sep}
            onChange={this.handleChange('sep')}
          />
          <RadioCheck
            label="Line end"
            options={endOptions}
            value={end}
            onChange={this.handleChange('end')}
          />
        </div>
        <div>
          <Button onClick={this.handleExport}>Download</Button>
        </div>
      </ul>
    )
  }
}


const ExportDropdown = connect(
  state => ({
    rows: shipRowsSelector(state),
  })
)(({ rows }) => (
  <Dropdown id="export" pullRight>
    <Dropdown.Toggle>
      <FontAwesome name="download" style={{ marginRight: '1ex' }} />{__('Export Data')}
    </Dropdown.Toggle>
    <ExportMenu bsRole="menu" rows={rows} />
  </Dropdown>
))

export default ExportDropdown
