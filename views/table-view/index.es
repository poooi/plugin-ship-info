import React, { Component } from 'react'
import propTypes from 'prop-types'
import { connect } from 'react-redux'
import cls from 'classnames'
import { MultiGrid } from 'react-virtualized'
import { sum, debounce, floor, get, memoize } from 'lodash'

import { extensionSelectorFactory } from 'views/utils/selectors'

import Divider from '../divider'
import { shipInfoShape } from '../utils'
import { shipRowsSelector, shipInfoConfigSelector } from '../selectors'
import ShipInfoCells from './ship-info-cells'

const { __ } = window.i18n['poi-plugin-ship-info']

const TYPES = [
  'id', 'name', 'type', 'soku', 'lv',
  'cond', 'hp', 'karyoku', 'raisou', 'taiku',
  'soukou', 'lucky', 'kaihi', 'taisen', 'sakuteki',
  'repairtime', 'equipment', 'lock',
]
const TITLES = [
  'ID', 'Name', 'Class', 'Speed', 'Level',
  'Cond', 'HP', 'Firepower', 'Torpedo', 'AA',
  'Armor', 'Luck', 'Evasion', 'ASW', 'LOS',
  'Repair', 'Equipment', 'Lock',
]
const SORTABLES = [
  true, true, true, true, true,
  true, true, true, true, true,
  true, true, true, true, true,
  true, false, false,
]
const CENTER_ALIGNS = [
  false, false, false, false, true,
  true, true, true, true, true,
  true, true, true, true, true,
  true, false, true,
]

// width will always unshift 1 extra element for row index
const WIDTHS = [
  40,
  50, 220, 90, 40, 40,
  40, 40, 60, 60, 60,
  60, 60, 40, 40, 40,
  80, 180, 40,
]

const ROW_HEIGHT = 35

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
    onClick={sortable ? handleClickTitle : () => {}}
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
    isExtend: get(extensionSelectorFactory('poi-plugin-ship-info')(state), 'ui.isExtend', true),
  })
)(class ShipInfoTableArea extends Component {
  static propTypes = {
    rows: propTypes.arrayOf(propTypes.shape(shipInfoShape)).isRequired,
    sortName: propTypes.string.isRequired,
    sortOrder: propTypes.number.isRequired,
    toTop: propTypes.bool,
    isExtend: propTypes.bool,
    dispatch: propTypes.func,
  }

  static contextTypes = {
    overlayMountPoint: propTypes.instanceOf(<div />),
  }

  constructor(props) {
    super(props)
    this.tableWidth = sum(WIDTHS)
    this.updateWindowSize = debounce(this.updateWindowSize, 500)
    this.setRef = this.setRef.bind(this)
    this.onClickFactory = memoize(this.onClickFactory)
    this.state = {
      windowWidth: 800,
      windowHeight: 600,
      activeColumn: -1,
      activeRow: -1,
    }
  }

  componentDidMount = () => {
    this.updateWindowSize()
    window.addEventListener('resize', this.updateWindowSize)
    // console.log(document.querySelectorAll('.ReactVirtualized__Grid'))
    // document.querySelectorAll('.ReactVirtualized__Grid').forEach((target) => {
    //   target.addEventListener('scroll', this.handleScroll)
    // })
  }

  componentWillUnmount = () => {
    window.removeListener('resize', this.updateWindowSize)
    // document.querySelectorAll('.ReactVirtualized__Grid').forEach((target) => {
    //   target.removeEventListener('scroll', this.handleScroll)
    // })
  }

  onContextMenu = () =>
    this.setState({
      activeColumn: -1,
      activeRow: -1,
    })

  onClickFactory = ({ columnIndex, rowIndex }) => () => {
    const { activeColumn, activeRow } = this.state
    const off = activeColumn === columnIndex && activeRow === rowIndex
    this.setState({
      activeColumn: off ? -1 : columnIndex,
      activeRow: off ? -1 : rowIndex,
    })
  }

  setRef = (ref) => {
    this.grid = ref
  }

  getColumnWidth = ({ index }) => {
    // 20: magic number, seems it need to be greater than 16
    const width = floor((WIDTHS[index] || 40) *
      (this.state.windowWidth - 20 > this.tableWidth
        ? ((this.state.windowWidth - 20) / this.tableWidth)
        : 1
      ),
    )
    return width
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

  handleScroll = ({ scrollTop }) => {
    const { rows } = this.props
    const contentHeight = rows.length * ROW_HEIGHT
    const safeZone = Math.round(window.screen.height / config.get('poi.zoomLevel', 1))
    if (this.props.toTop !== !scrollTop && contentHeight > safeZone) {
      this.props.dispatch({
        type: '@@poi-plugin-ship-info@scroll',
        toTop: !scrollTop,
      })
    }
  }

  saveSortRules = (name, order) => {
    config.set('plugin.ShipInfo.sortName', name)
    config.set('plugin.ShipInfo.sortOrder', order)
  }

  cellRenderer = ({
    columnIndex, key, rowIndex, style,
  }) => {
    const { rows, sortName, sortOrder } = this.props

    const highlight = (columnIndex === this.state.activeColumn || rowIndex === this.state.activeRow)
      && !(columnIndex === 0 && rowIndex !== this.state.activeRow)
      && !(rowIndex === 0 && columnIndex !== this.state.activeColumn)
    const props = {
      key,
      onClick: this.onClickFactory({ columnIndex, rowIndex }),
      onContextMenu: this.onContextMenu,
      className: cls({
        'ship-info-cell': true,
        center: CENTER_ALIGNS[columnIndex - 1],
        highlight,
        'even-dark': rowIndex % 2 === 1 && window.isDarkTheme,
        'even-light': rowIndex % 2 === 1 && !window.isDarkTheme,
      }),
    }
    let content
    if (rowIndex === 0) {
      content = this.titleRenderer({
        columnIndex, style, sortName, sortOrder, ...props,
      })
    } else if (columnIndex === 0) {
      content = <div style={{ ...style, paddingLeft: '10px' }} key={key} {...props}>{rowIndex}</div>
    } else {
      const index = columnIndex - 1
      const ship = rows[rowIndex - 1]
      const Cell = ShipInfoCells[TYPES[index]]
      content = <Cell ship={ship} style={style} {...props} />
    }

    return content
  }

  titleRenderer = ({
    columnIndex, style, sortName, sortOrder, ...props
  }) => {
    if (columnIndex === 0) {
      return <div style={style} {...props} />
    }
    const index = columnIndex - 1
    return (
      <TitleCell
        {...props}
        style={style}
        title={TITLES[index]}
        sortable={SORTABLES[index]}
        centerAlign={CENTER_ALIGNS[index]}
        sorting={sortName === TYPES[index]}
        up={sortName === TYPES[index] && Boolean(sortOrder)}
        down={sortName === TYPES[index] && Boolean(!sortOrder)}
        handleClickTitle={this.handleClickTitle(TYPES[index])}
      />
    )
  }

  updateWindowSize = () => {
    this.setState({
      windowWidth: this.context.overlayMountPoint.querySelector('.poi-plugin').clientWidth,
      windowHeight: this.context.overlayMountPoint.querySelector('.poi-plugin').clientHeight,
    }, () => {
      if (this.grid) {
        this.grid.recomputeGridSize()
        this.grid.forceUpdateGrids()
      }
    })
  }

  render() {
    const { rows, isExtend } = this.props
    const {
      windowWidth, windowHeight, activeRow, activeColumn,
    } = this.state
    // 526, 85, 115: magic numbers for layout dimensions
    const height = Math.max(windowHeight - (isExtend ? 526 : 85), 115)
    return (
      <div id="ship-info-show" style={{ display: 'flex', flexDirection: 'column' }}>
        <Divider icon={false} />
        <div style={{ flex: 1 }} className="table-container">
          <MultiGrid
            rows={rows}
            ref={this.setRef}
            activeRow={activeRow}
            activeColumn={activeColumn}
            windowWidth={windowWidth}
            columnCount={WIDTHS.length}
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
            rowHeight={ROW_HEIGHT}
            scrollToAlignment="start"
            width={windowWidth - 16} // 16: left and right padding (8 + 8)
            scrollToColumn={0}
            scrollToRow={0}
            onScroll={this.handleScroll}
          />
        </div>
      </div>
    )
  }
})

export default ShipInfoTableArea
