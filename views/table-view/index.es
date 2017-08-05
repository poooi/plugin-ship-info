import React, { Component } from 'react'
import propTypes from 'prop-types'
import { connect } from 'react-redux'
import cls from 'classnames'
import { MultiGrid, AutoSizer } from 'react-virtualized'
import { sum, debounce, floor, get } from 'lodash'

import { extensionSelectorFactory } from 'views/utils/selectors'

import Divider from '../divider'
import { shipInfoShape } from '../utils'
import { shipRowsSelector, shipInfoConfigSelector } from '../selectors'
import ShipInfoCells from './ship-info-cells'

const { __ } = window

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
  40,
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
  className,
}) => (
  <div
    role="button"
    tabIndex={0}
    style={{ ...style }}
    onClick={sortable ? handleClickTitle : ''}
    className={cls(className, {
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
    height: propTypes.number,
    width: propTypes.number,
  }),
  title: propTypes.string.isRequired,
  sortable: propTypes.bool.isRequired,
  handleClickTitle: propTypes.func,
  centerAlign: propTypes.bool.isRequired,
  sorting: propTypes.bool.isRequired,
  up: propTypes.bool.isRequired,
  down: propTypes.bool.isRequired,
  className: propTypes.string.isRequired,
}

const ShipInfoTableArea = connect(
  state => ({
    rows: shipRowsSelector(state),
    ...shipInfoConfigSelector(state),
    toTop: get(extensionSelectorFactory('poi-plugin-ship-info')(state), 'ui.toTop', 0),
  })
)(class ShipInfoTableArea extends Component {
  static propTypes = {
    rows: propTypes.arrayOf(propTypes.shape(shipInfoShape)).isRequired,
    sortName: propTypes.string.isRequired,
    sortOrder: propTypes.number.isRequired,
  }

  state = {
    windowWidth: document.body.clientWidth,
    activeColumn: -1,
    activeRow: -1,
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
    // console.log(document.querySelectorAll('.ReactVirtualized__Grid'))
    // document.querySelectorAll('.ReactVirtualized__Grid').forEach((target) => {
    //   target.addEventListener('scroll', this.handleScroll)
    // })
  }

  componentWillUnmount = () => {
    window.removeListener('resize', this.updateWindowWidth)
    // document.querySelectorAll('.ReactVirtualized__Grid').forEach((target) => {
    //   target.removeEventListener('scroll', this.handleScroll)
    // })
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
      return <div style={style} {...props} />
    }
    const index = columnIndex - 1
    return (
      <TitleCell
        {...props}
        style={style}
        title={titles[index]}
        sortable={sortables[index]}
        centerAlign={centerAligns[index]}
        sorting={sortName === types[index]}
        up={sortName === types[index] && Boolean(sortOrder)}
        down={sortName === types[index] && Boolean(!sortOrder)}
        handleClickTitle={this.handleClickTitle(types[index])}
      />
    )
  }

  cellRenderer = ({ columnIndex, key, rowIndex, style }) => {
    const { rows, sortName, sortOrder } = this.props
    const setState = this.setState.bind(this)
    const onClick = () => {
      const { activeColumn, activeRow } = this.state
      const off = activeColumn === columnIndex && activeRow === rowIndex
      setState({
        activeColumn: off ? -1 : columnIndex,
        activeRow: off ? -1 : rowIndex,
      })
    }
    const onContextMenu = () => {
      setState({
        activeColumn: -1,
        activeRow: -1,
      })
    }
    const highlight = (columnIndex === this.state.activeColumn || rowIndex === this.state.activeRow)
      && !(columnIndex === 0 && rowIndex !== this.state.activeRow)
      && !(rowIndex === 0 && columnIndex !== this.state.activeColumn)
    const props = {
      key,
      onClick,
      onContextMenu,
      className: cls({
        'ship-info-cell': true,
        center: centerAligns[columnIndex - 1],
        highlight,
        'even-dark': rowIndex % 2 === 1 && window.isDarkTheme,
        'even-light': rowIndex % 2 === 1 && !window.isDarkTheme,
      }),
    }
    let content
    if (rowIndex === 0) {
      content = this.titleRenderer({ columnIndex, style, sortName, sortOrder, ...props })
    } else if (columnIndex === 0) {
      content = <div style={{ ...style, paddingLeft: '10px' }} key={key} {...props}>{rowIndex}</div>
    } else {
      const index = columnIndex - 1
      const ship = rows[rowIndex - 1]
      const Cell = ShipInfoCells[types[index]]
      content = <Cell ship={ship} style={style} {...props} />
    }

    return content
  }

  handleContentRendered = (e) => {
    const { rowStopIndex, columnStopIndex } = e
    if (this.activeColumn !== -1 && this.activeRow !== -1) {
      this.setState({
        activeColumn: (this.state.activeColumn + columnStopIndex) - this.columnStopIndex,
        activeRow: (this.state.activeRow + rowStopIndex) - this.rowStopIndex,
      })
    }
    this.rowStopIndex = rowStopIndex
    this.columnStopIndex = columnStopIndex
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
    const width = floor((widths[index] || 40) *
      (this.state.windowWidth > this.tableWidth
        ? (this.state.windowWidth / this.tableWidth)
        : 1
      ),
    )
    return width
  }

  handleScroll = ({ scrollTop }) => {
    if (this.props.toTop !== !scrollTop) {
      this.props.dispatch({
        type: '@@poi-plugin-ship-info@scroll',
        toTop: !scrollTop,
      })
    }
  }

  setRef = (ref) => {
    this.grid = ref
  }

  render() {
    const { rows } = this.props
    const { windowWidth, activeRow, activeColumn } = this.state

    return (
      <div id="ship-info-show" style={{ display: 'flex', flexDirection: 'column' }}>
        <Divider icon={false} />
        <div style={{ flex: 1 }} className="table-container">
          <AutoSizer>
            {
              ({ width, height }) => (
                <MultiGrid
                  rows={rows}
                  ref={this.setRef}
                  activeRow={activeRow}
                  activeColumn={activeColumn}
                  windowWidth={windowWidth}
                  columnCount={18}
                  columnWidth={this.getColumnWidth}
                  estimatedRowSize={100}
                  fixedColumnCount={windowWidth > this.tableWidth ? 0 : 0}
                  fixedRowCount={1}
                  handleContentRendered={this.handleContentRendered}
                  height={height}
                  overscanColumnCount={10}
                  overscanRowCount={5}
                  cellRenderer={this.cellRenderer}
                  rowCount={rows.length + 1}
                  rowHeight={40}
                  scrollToAlignment="start"
                  width={width}
                  scrollToColumn={0}
                  scrollToRow={0}
                  onScroll={this.handleScroll}
                />
              )}
          </AutoSizer>
        </div>
      </div>
    )
  }
})

export default ShipInfoTableArea
