import React, { Component } from 'react'
import propTypes from 'prop-types'
import { Dropdown, Button } from 'react-bootstrap'
import { connect } from 'react-redux'
import FontAwesome from 'react-fontawesome'

import { shipRowsSelector } from '../selectors'
import { parseCsv } from '../csv-parser'

const { __ } = window

class ExportMenu extends Component {
  handleExport = () => {
    console.log(parseCsv(this.props.rows))
  }

  render() {
    return (
      <ul className="dropdown-menu">
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
