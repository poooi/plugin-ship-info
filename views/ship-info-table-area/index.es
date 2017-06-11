import React, { Component, PropTypes } from 'react'
import { Table } from 'react-bootstrap'
import { sortBy, get } from 'lodash'
import { connect } from 'react-redux'
import classNames from 'classnames'
import memoize from 'fast-memoize'

import { fleetShipsIdSelectorFactory, fleetInExpeditionSelectorFactory } from 'views/utils/selectors'

import Divider from '../divider'
import { nameCompare, shipInfoShape } from './utils'
import { shipRowsSelector, shipInfoConfigSelector, shipFleetIdMapSelector } from './selectors'
import ShipInfoRow from './ship-info-row'

const { __ } = window

const TitleHeader = (props) => {
  const { titles, types, sortable,
      centerAlign, sortName, sortOrder, handleClickTitle } = props
  return (
    <tr className="title-row">
      <th>No.</th>
      {
        titles.map((title, index) => (
          <th
            key={title}
            onClick={sortable[index] ? handleClickTitle(types[index]) : ''}
            className={classNames({
              clickable: sortable[index],
              center: centerAlign[index],
              sorting: sortName === types[index],
              up: sortName === types[index] && sortOrder,
              down: sortName === types[index] && !sortOrder,
            })}
          >
            {__(title)}
          </th>
        ))
      }
    </tr>
  )
}


TitleHeader.propTypes = {
  titles: PropTypes.arrayOf(PropTypes.string).isRequired,
  types: PropTypes.arrayOf(PropTypes.string).isRequired,
  sortable: PropTypes.arrayOf(PropTypes.bool).isRequired,
  centerAlign: PropTypes.arrayOf(PropTypes.bool).isRequired,
  sortName: PropTypes.string.isRequired,
  sortOrder: PropTypes.number.isRequired,
  handleClickTitle: PropTypes.func.isRequired,
}

const ShipInfoTableArea = connect(
  state => ({
    rows: shipRowsSelector(state),
    ...shipInfoConfigSelector(state),
    sortName: PropTypes.string.isRequired,
    sortOrder: PropTypes.number.isRequired,
  })
)(class ShipInfoTableArea extends Component {
  static propTypes = {
    rows: PropTypes.arrayOf(PropTypes.shape(shipInfoShape)).isRequired,
  }

  sortRules = (name, order) => {
    config.set('plugin.ShipInfo.sortName', name)
    config.set('plugin.ShipInfo.sortOrder', order)
  }

  handleClickTitle = title => () => {
    if (this.props.sortName !== title) {
      const order = (title === 'id' || title === 'type' || title === 'name') ? 1 : 0
      this.sortRules(title, order)
    } else {
      this.sortRules(this.props.sortName, (this.props.sortOrder + 1) % 2)
    }
  }

  render() {
    const showRows = this.props.rows
    const { sortName, sortOrder, pagedLayout } = this.props
    const types = [
      'id', 'type', 'name', 'soku', 'lv',
      'cond', 'karyoku', 'raisou', 'taiku', 'soukou',
      'lucky', 'kaihi', 'taisen', 'sakuteki', 'repairtime',
      'Equipment', 'Lock',
    ]
    const titles = [
      'ID', 'Class', 'Name', 'Speed', 'Level',
      'Cond', 'Firepower', 'Torpedo', 'AA', 'Armor',
      'Luck', 'Evasion', 'ASW', 'LOS', 'Repair',
      'Equipment', 'Lock',
    ]
    const sortable = [
      true, true, true, true, true,
      true, true, true, true, true,
      true, true, true, true, true,
      false, false,
    ]
    const centerAlign = [
      false, false, false, false, true,
      true, true, true, true, true,
      true, true, true, true, true,
      false, false,
    ]

    const header =
      (
        <TitleHeader
          titles={titles}
          types={types}
          sortable={sortable}
          centerAlign={centerAlign}
          sortName={sortName}
          sortOrder={sortOrder}
          handleClickTitle={this.handleClickTitle}
        />
      )

    const ShipRows = []

    showRows.forEach((row, index) => {
      if (row) {
        ShipRows.push(
          <ShipInfoRow
            key={row.id}
            shipInfo={row}
          />
        )
      }
      if (index >= 0 && (index + 1) % 15 === 0 && pagedLayout) {
        ShipRows.push(header)
      }
    })

    return (
      <div id="ship-info-show">
        <Divider text={__('Ship Girls Info')} icon={false} />
        <div className="ship-info-table">
          <Table striped condensed hover>
            <thead>
              {header}
            </thead>
            <tbody>
              {
                ShipRows
            }
            </tbody>
          </Table>
        </div>
      </div>
    )
  }
})

export default ShipInfoTableArea
