import React, { Component } from 'react'
import propTypes from 'prop-types'
import { connect } from 'react-redux'
import cls from 'classnames'
import { MultiGrid, AutoSizer } from 'react-virtualized'
import { sum, debounce, floor } from 'lodash'

import Divider from '../divider'
import { shipInfoShape } from './utils'
import { shipRowsSelector, shipInfoConfigSelector } from './selectors'
import ShipInfoCells from './ship-info-cells'

const { __ } = window

const floor5 = num => floor(num / 5) * 5
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
  false, true,
]

// width will always unshift 1 extra element for row index
const widths = [
  30,
  50, 160, 90, 40, 40,
  40, 60, 60, 60, 60,
  60, 40, 40, 40, 80,
  180, 40,
]

const TitleCell = ({
  style,
  title,
  sortable,
  centerAlign,
  sorting,
  up,
  down,
  handleClickTitle,
}) => (
  <div
    role="button"
    tabIndex={0}
    style={{ ...style }}
    onClick={sortable ? handleClickTitle : ''}
    className={cls({
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

TitleCell.propTypes = {
  style: propTypes.shape({
    height: propTypes.string,
    width: propTypes.string,
  }),
  title: propTypes.string.isRequired,
  sortable: propTypes.bool.isRequired,
  handleClickTitle: propTypes.func.isRequired,
  centerAlign: propTypes.bool.isRequired,
  sorting: propTypes.bool.isRequired,
  up: propTypes.bool.isRequired,
  down: propTypes.bool.isRequired,
}

const ShipInfoTableArea = connect(
  state => ({
    rows: shipRowsSelector(state),
    ...shipInfoConfigSelector(state),
  })
)(class ShipInfoTableArea extends Component {
  static propTypes = {
    rows: propTypes.arrayOf(propTypes.shape(shipInfoShape)).isRequired,
    sortName: propTypes.string.isRequired,
    sortOrder: propTypes.number.isRequired,
  }

  state = {
    windowWidth: document.body.clientWidth,
  }

  constructor(props) {
    super(props)
    this.tableWidth = sum(widths)
    this.updateWindowWidth = debounce(this.updateWindowWidth, 500)
    this.setRef = this.setRef.bind(this)
  }

  componentDidMount = () => {
    this.updateWindowWidth()
    window.addEventListener('resize', this.updateWindowWidth)
  }

  componentWillUnmount = () => {
    window.removeListener('resize', this.updateWindowWidth)
  }

  updateWindowWidth = () => {
    this.setState({
      windowWidth: document.body.clientWidth,
    })
    if (this.grid) {
      this.grid.recomputeGridSize()
      this.grid.forceUpdateGrids()
    }
  }

  saveSortRules = (name, order) => {
    config.set('plugin.ShipInfo.sortName', name)
    config.set('plugin.ShipInfo.sortOrder', order)
  }

  titleRenderer = ({ columnIndex, style, sortName, sortOrder, ...props }) => {
    if (columnIndex === 0) {
      return <div style={style} />
    }
    const index = columnIndex - 1
    return (
      <TitleCell
        {...props}
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
  cellRenderer = ({ columnIndex, key, rowIndex, style }) => {
    const { rows, sortName, sortOrder } = this.props
    const { windowWidth } = this.state
    const props = {
      key,
      windowWidth,
      className: cls({
        'ship-info-cell': true,
        center: centerAligns[columnIndex - 1],
      }),
    }
    let content
    if (rowIndex === 0) {
      content = this.titleRenderer({ columnIndex, style, sortName, sortOrder, ...props })
    } else if (columnIndex === 0) {
      content = <div style={style} key={key} {...props}>{rowIndex}</div>
    } else {
      const index = columnIndex - 1
      const ship = rows[rowIndex - 1]
      const Cell = ShipInfoCells[types[index]]
      content = <Cell ship={ship} style={style} {...props} />
    }

    return content
  }

  handleClickTitle = title => () => {
    if (this.props.sortName !== title) {
      const order = (title === 'id' || title === 'type' || title === 'name') ? 1 : 0
      this.saveSortRules(title, order)
    } else {
      this.saveSortRules(this.props.sortName, (this.props.sortOrder + 1) % 2)
    }
  }

  getColumnWidth = ({ index }) => {
    const width = floor5((widths[index] || 40) *
      (this.state.windowWidth > this.tableWidth
        ? (this.state.windowWidth / this.tableWidth)
        : 1
      ),
    )
    return width
  }

  setRef = (ref) => {
    this.grid = ref
  }

  render() {
    const { rows, sortName, sortOrder } = this.props
    const { windowWidth } = this.state

    return (
      <div id="ship-info-show" style={{ display: 'flex', flexDirection: 'column' }}>
        <Divider text={__('Ship Girls Info')} icon={false} />
        <div style={{ flex: 1 }}>
          <AutoSizer>
            {
              ({ width, height }) => (
                <MultiGrid
                  ref={this.setRef}
                  sortName={sortName}
                  sortOrder={sortOrder}
                  windowWidth={windowWidth}
                  columnCount={18}
                  columnWidth={this.getColumnWidth}
                  estimatedRowSize={100}
                  fixedColumnCount={windowWidth > this.tableWidth ? 0 : 3}
                  fixedRowCount={1}
                  height={height}
                  overscanColumnCount={3}
                  overscanRowCount={10}
                  cellRenderer={this.cellRenderer}
                  rowCount={rows.length + 1}
                  rowHeight={40}
                  scrollToAlignment="start"
                  width={width}
                />
              )}
          </AutoSizer>
        </div>
      </div>
    )
  }
})

export default ShipInfoTableArea
