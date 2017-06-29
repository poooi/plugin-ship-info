import React, { Component } from 'react'
import propTypes from 'prop-types'
import { remote, clipboard } from 'electron'
import { Dropdown, Button } from 'react-bootstrap'
import { connect } from 'react-redux'
import FA from 'react-fontawesome'
import cls from 'classnames'
import fs from 'fs-extra'
import { promisify } from 'bluebird'

import { allShipRowsSelector, shipRowsSelector } from '../selectors'
import { parseCsv } from '../csv-parser'

const { dialog } = remote
const outputFile = promisify(fs.outputFile)

const { __ } = window

const isWin = process.platform === 'win32'

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
      end: isWin ? '\r\n' : '\n',
      selection: 'current',
    }
  }

  handleChange = name => value => () => {
    this.setState({
      [name]: value,
    })
  }

  handleExportToClipboard = () => {
    const { sep, end, selection } = this.state
    const rows = selection === 'current' ? this.props.rows : this.props.allRows
    clipboard.writeText(parseCsv(rows, sep, end))
  }

  handleExportToFile = () => {
    const bw = remote.getCurrentWindow()
    dialog.showSaveDialog(bw, {
      title: __('Position the file to save into'),
      filters: [{
        name: 'CSV file',
        extensions: ['csv'],
      }],
    }, async (filename) => {
      if (filename) {
        const { sep, end, selection } = this.state
        const rows = selection === 'current' ? this.props.rows : this.props.allRows
        try {
          await outputFile(filename, parseCsv(rows, sep, end))
        } catch (e) {
          console.error(e)
        }
      }
    })
  }

  render() {
    const { sep, end, selection } = this.state
    return (
      <ul className="dropdown-menu pull-right">
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
            label="Line break"
            options={endOptions}
            value={end}
            onChange={this.handleChange('end')}
          />
        </div>
        <div style={{ display: 'flex', paddingLeft: '10px' }}>
          <Button onClick={this.handleExportToClipboard} style={{ flex: 1 }}>
            <FA name="clipboard" style={{ marginRight: '1ex' }} />{__('Copy To Clipboard')}
          </Button>
          <Button onClick={this.handleExportToFile} style={{ flex: 1 }}>
            <FA name="file-text" style={{ marginRight: '1ex' }} />{__('Export to file')}
          </Button>
        </div>
      </ul>
    )
  }
}


const ExportDropdown = connect(
  state => ({
    allRows: allShipRowsSelector(state),
    rows: shipRowsSelector(state),
  })
)(({ allRows, rows }) => (
  <Dropdown id="export" pullRight>
    <Dropdown.Toggle>
      <FA name="download" style={{ marginRight: '1ex' }} />{__('Export Data')}
    </Dropdown.Toggle>
    <ExportMenu bsRole="menu" allRows={allRows} rows={rows} />
  </Dropdown>
))

export default ExportDropdown
