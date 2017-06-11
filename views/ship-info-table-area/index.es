import React, { Component, PropTypes } from 'react'
import { Table } from 'react-bootstrap'
import { sortBy, get } from 'lodash'
import { connect } from 'react-redux'
import classNames from 'classnames'
import memoize from 'fast-memoize'

import { fleetShipsIdSelectorFactory, fleetInExpeditionSelectorFactory } from 'views/utils/selectors'

import Divider from '../divider'
import { nameCompare, shipInfoShape } from './utils'
import { shipTableDataSelectorFactory, shipInfoConfigSelector, shipFleetIdMapSelector } from './selectors'
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
  (state, props) => {
    const $shipTypes = get(state, 'const.$shipTypes', {})

    // construct shiptype filter array
    const shipTypeChecked = get(state.config, 'plugin.ShipInfo.shipTypeChecked', Object.keys($shipTypes).slice().fill(true))
    const shipTypes = shipTypeChecked.reduce((types, checked, index) => checked && ((index + 1) in $shipTypes) ? types.concat([index + 1]) : types, [])

    const expeditionShips = [...Array(4).keys()].reduce((ships, fleetId) => fleetInExpeditionSelectorFactory(fleetId)(state) ?
        ships.concat(fleetShipsIdSelectorFactory(fleetId)(state))
        : ships, [])

    // construct ship data for filter and sort
    const _ships = get(state, 'info.ships', {})
    const rows = Object.keys(_ships).map(shipId => shipTableDataSelectorFactory(parseInt(shipId))(state))


    return ({
      ...shipInfoConfigSelector(state),
      fleetIdMap: shipFleetIdMapSelector(state),
      shipTypes,
      expeditionShips,
      rows,
    })
  }
)(class ShipInfoTableArea extends Component {
  static propTypes = {
    sortName: PropTypes.string.isRequired,
    sortOrder: PropTypes.number.isRequired,
    lvRadio: PropTypes.number.isRequired,
    lockedRadio: PropTypes.number.isRequired,
    expeditionRadio: PropTypes.number.isRequired,
    modernizationRadio: PropTypes.number.isRequired,
    remodelRadio: PropTypes.number.isRequired,
    sallyAreaChecked: PropTypes.arrayOf(PropTypes.bool).isRequired,
    pagedLayout: PropTypes.number.isRequired,
    inFleetRadio: PropTypes.number.isRequired,
    sparkleRadio: PropTypes.number.isRequired,
    exSlotRadio: PropTypes.number.isRequired,
    daihatsuRadio: PropTypes.number.isRequired,
    fleetIdMap: PropTypes.objectOf(PropTypes.number).isRequired,
    shipTypes: PropTypes.arrayOf(PropTypes.number).isRequired,
    expeditionShips: PropTypes.arrayOf(PropTypes.number).isRequired,
    rows: PropTypes.arrayOf(PropTypes.shape(shipInfoShape)).isRequired,
  }

  handleTypeFilter = memoize((typeId, shipTypes) => (shipTypes || []).includes(typeId))

  handleLvFilter = memoize((lv, lvRadio) => {
    switch (lvRadio) {
      case 1:
        return lv === 1
      case 2:
        return lv >= 2
      case 3:
        return lv >= 100
      case 0:
      default:
        return true
    }
  })

  handleLockedFilter = memoize((locked, lockedRadio) => {
    switch (lockedRadio) {
      case 1:
        return locked === 1
      case 2:
        return locked === 0
      case 0:
      default:
        return true
    }
  })

  handleExpeditionFilter = memoize((id, expeditionShips, expeditionRadio) => {
    switch (expeditionRadio) {
      case 1:
        return (expeditionShips || []).includes(id)
      case 2:
        return !(expeditionShips || []).includes(id)
      case 0:
      default:
        return true
    }
  })

  handleModernizationFilter = memoize((isCompleted, modernizationRadio) => {
    switch (modernizationRadio) {
      case 1:
        return isCompleted
      case 2:
        return !isCompleted
      case 0:
      default:
        return true
    }
  })

  handleRemodelFilter = memoize((after, remodelRadio) => {
    const remodelable = after !== '0'
    switch (remodelRadio) {
      case 1:
        return remodelable
      case 2:
        return !remodelable
      case 0:
      default:
        return true
    }
  })

  handleSallyAreaFilter = memoize((sallyArea, sallyAreaChecked) => {
    const checkedAll = (sallyAreaChecked || []).reduce((all, checked) =>
      all && checked
    , true)
    if (checkedAll) return true
    return typeof sallyArea !== 'undefined'
      ? (sallyAreaChecked || [])[sallyArea || 0]
      : true
  })

  handleInFleetFilter = memoize((fleetId, inFleetRadio) => {
    const isInFleet = Number.isInteger(fleetId)
    switch (inFleetRadio) {
      case 1:
        return isInFleet
      case 2:
        return !isInFleet
      case 0:
      default:
        return true
    }
  })

  handleSparkleFilter = memoize((cond, sparkleRadio) => {
    switch (sparkleRadio) {
      case 1:
        return cond >= 50
      case 2:
        return cond < 50
      case 0:
      default:
        return true
    }
  })

  handleExSlotFilter = memoize((exslot, exSlotRadio) => {
    switch (exSlotRadio) {
      case 1:
        return exslot !== 0
      case 2:
        return exslot === 0
      case 0:
      default:
        return true
    }
  })

  handleDaihatsuFilter = (daihatsu, daihatsuRadio) => {
    switch (daihatsuRadio) {
      case 1:
        return daihatsu
      case 2:
        return !daihatsu
      case 0:
      default:
        return true
    }
  }


  handleShowRows = () => {
    const { remodelRadio, lvRadio, lockedRadio, expeditionRadio, modernizationRadio,
      inFleetRadio, sparkleRadio, exSlotRadio, daihatsuRadio, fleetIdMap,
      shipTypes, expeditionShips, sallyAreaChecked, rows, sortName, sortOrder } = this.props

    let showRows = rows.filter((row = {}) =>
      this.handleTypeFilter(row.typeId, shipTypes) &&
      this.handleLvFilter(row.lv, lvRadio) &&
      this.handleLockedFilter(row.locked, lockedRadio) &&
      this.handleExpeditionFilter(row.id, expeditionShips, expeditionRadio) &&
      this.handleModernizationFilter(row.isCompleted, modernizationRadio) &&
      this.handleRemodelFilter(row.after, remodelRadio) &&
      this.handleSallyAreaFilter(row.sallyArea, sallyAreaChecked) &&
      this.handleInFleetFilter(fleetIdMap[row.id], inFleetRadio) &&
      this.handleExSlotFilter(row.exslot, exSlotRadio) &&
      this.handleSparkleFilter(row.cond, sparkleRadio) &&
      this.handleDaihatsuFilter(row.daihatsu, daihatsuRadio)
    )

    // sort
    switch (this.props.sortName) {
      case 'id':
        showRows = sortBy(showRows, 'id')
        break
      case 'name':
        showRows.sort(nameCompare)
        break
      case 'lv':
      // Sort rule of level in game (descending):
      // 1. level (descending)
      // 2. sortno (ascending)
      // 3. id (descending)
        showRows.sort((a, b) => {
          if (a.lv !== b.lv) return a.lv - b.lv
          if (a.sortno !== b.sortno) return -(a.sortno - b.sortno)
          if (a.id !== b.id) return -(a.id - b.id)
          return 0
        })
        break
      case 'type':
        showRows.sort((a, b) => {
          if (a.typeId !== b.typeId) return a.typeId - b.typeId
          if (a.sortno !== b.sortno) return -(a.sortno - b.sortno)
          if (a.lv !== b.lv) return a.lv - b.lv
          if (a.id !== b.id) return -(a.id - b.id)
          return 0
        })
        break
      default:
        showRows = sortBy(showRows, [sortName, 'sortno', row => -row.id])
    }

    if (!sortOrder) showRows.reverse()

    return showRows
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
    const showRows = this.handleShowRows()
    const { sortName, sortOrder, pagedLayout, fleetIdMap } = this.props
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
            fleetId={fleetIdMap[row.id]}
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
