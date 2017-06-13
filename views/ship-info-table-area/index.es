import React, { Component, PropTypes } from 'react'
import { Table } from 'react-bootstrap'
import { connect } from 'react-redux'
import classNames from 'classnames'
import { CellMeasurer, CellMeasurerCache, Grid, MultiGrid, AutoSizer, WindowScroller } from 'react-virtualized'

import Divider from '../divider'
import { shipInfoShape } from './utils'
import { shipRowsSelector, shipInfoConfigSelector } from './selectors'
import ShipInfoCells from './ship-info-cells'

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

const types = [
  'id', 'name', 'type', 'soku', 'lv',
  'cond', 'karyoku', 'raisou', 'taiku', 'soukou',
  'lucky', 'kaihi', 'taisen', 'sakuteki', 'repairtime',
  'equipment', 'lock',
]
const titles = [
  'ID', 'Name', 'Class', 'Speed', 'Level',
  'Cond', 'Firepower', 'Torpedo', 'AA', 'Armor',
  'Luck', 'Evasion', 'ASW', 'LOS', 'Repair',
  'Equipment', 'Lock',
]
const sortables = [
  true, true, true, true, true,
  true, true, true, true, true,
  true, true, true, true, true,
  false, false,
]
const centerAligns = [
  false, false, false, false, true,
  true, true, true, true, true,
  true, true, true, true, true,
  false, false,
]

const TitleCell = ({ style, title, sortable, centerAlign, sorting, up, down, handleClickTitle }) => (
  <div
    role="button"
    tabIndex={0}
    style={{ ...style }}
    onClick={sortable ? handleClickTitle : ''}
    className={classNames({
      clickable: sortable,
      center: centerAlign,
      sorting,
      up,
      down,
    })}
  >
    {__(title)}
  </div>
)

const ShipInfoTableArea = connect(
  state => ({
    rows: shipRowsSelector(state),
    ...shipInfoConfigSelector(state),
  })
)(class ShipInfoTableArea extends Component {
  static propTypes = {
    rows: PropTypes.arrayOf(PropTypes.shape(shipInfoShape)).isRequired,
    sortName: PropTypes.string.isRequired,
    sortOrder: PropTypes.number.isRequired,
  }

  constructor(props) {
    super(props)

    this._cache = new CellMeasurerCache({
      defaultHeight: 30,
      defaultWidth: 60,
      fixedHeight: true,
    })
  }

  sortRules = (name, order) => {
    config.set('plugin.ShipInfo.sortName', name)
    config.set('plugin.ShipInfo.sortOrder', order)
  }

  titleRenderer = ({ columnIndex, style, sortName, sortOrder }) => {
    if (columnIndex === 0) {
      return <div style={style} />
    }

    const index = columnIndex - 1

    return (
      <TitleCell
        style={{ ...style }}
        title={titles[index]}
        sortable={sortables[index]}
        centerAlign={centerAligns[index]}
        sorting={sortName === types[index]}
        up={sortName === types[index] && sortOrder}
        down={sortName === types[index] && !sortOrder}
        handleClickTitle={sortables[index] && this.handleClickTitle(types[index])}
      />
    )
  }

  cellRenderer = ({ columnIndex, key, parent, rowIndex, style }) => {
    const { rows, sortName, sortOrder } = this.props

    let content
    if (rowIndex === 0) {
      content = this.titleRenderer({ columnIndex, style, sortName, sortOrder })
    } else {
      if (columnIndex === 0) {
        content = <div style={style}>{rowIndex}</div>
      } else {
        const index = columnIndex - 1
        const ship = rows[rowIndex - 1]
        const Cell = ShipInfoCells[types[index]]
        // console.log(Cell)
        content = <Cell ship={ship} style={style} />
      }
    }

    return content
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
    // const showRows = this.props.rows
    const { rows, sortName, sortOrder, pagedLayout } = this.props

    // const header =
    //   (
    //     <TitleHeader
    //       titles={titles}
    //       types={types}
    //       sortable={sortables}
    //       centerAlign={centerAligns}
    //       sortName={sortName}
    //       sortOrder={sortOrder}
    //       handleClickTitle={this.handleClickTitle}
    //     />
    //   )

    // const ShipRows = []

    // showRows.forEach((row, index) => {
    //   if (row) {
    //     ShipRows.push(
    //       <ShipInfoRow
    //         key={row.id}
    //         shipInfo={row}
    //       />
    //     )
    //   }
    //   if (index >= 0 && (index + 1) % 15 === 0 && pagedLayout) {
    //     ShipRows.push(header)
    //   }
    // })

    return (
      <div id="ship-info-show" style={{ display: 'flex', flexDirection: 'column' }}>
        <Divider text={__('Ship Girls Info')} icon={false} />
        <div style={{ flex: 1 }}>
          <AutoSizer>
            {
              ({ width, height }) => (
                <MultiGrid
                  sortName={sortName}
                  sortOrder={sortOrder}
                  columnCount={18}
                  columnWidth={40}
                  fixedColumnCount={3}
                  fixedRowCount={1}
                  height={height}
                  overscanColumnCount={6}
                  overscanRowCount={3}
                  cellRenderer={this.cellRenderer}
                  rowCount={rows.length + 1}
                  rowHeight={30}
                  width={width}
                />
              )}

          </AutoSizer>
        </div>
        {/*<div className="ship-info-table">
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
        </div>*/}
      </div>
    )
  }
})

export default ShipInfoTableArea
