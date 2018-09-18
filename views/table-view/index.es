import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import cls from 'classnames'
import { MultiGrid, AutoSizer } from 'react-virtualized'
import { sum, floor, get, memoize, map } from 'lodash'
import { translate } from 'react-i18next'

import { extensionSelectorFactory } from 'views/utils/selectors'
import { WindowEnv } from 'views/components/etc/window-env'

import { shipInfoShape } from '../utils'
import { shipRowsSelector, shipInfoConfigSelector } from '../selectors'
import ShipInfoCells from './ship-info-cells'
import COLUMNS from './columns'

const TYPES = map(COLUMNS, 'name')
const TITLES = map(COLUMNS, 'title')
const SORTABLES = map(COLUMNS, 'sortable')
const CENTER_ALIGNS = map(COLUMNS, 'center')
// width will always unshift 1 extra element for row index
const WIDTHS = [40].concat(map(COLUMNS, 'width'))

const ROW_HEIGHT = 35

const TitleCell = translate(['poi-plugin-ship-info'])(
  ({
    style,
    title,
    sortable,
    centerAlign,
    sorting,
    up,
    down,
    handleClickTitle,
    className,
    t,
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
      {t(title)}
    </div>
  ),
)

TitleCell.propTypes = {
  style: PropTypes.shape({
    height: PropTypes.number,
    width: PropTypes.number,
  }),
  title: PropTypes.string.isRequired,
  sortable: PropTypes.bool.isRequired,
  handleClickTitle: PropTypes.func,
  centerAlign: PropTypes.bool.isRequired,
  sorting: PropTypes.bool.isRequired,
  up: PropTypes.bool.isRequired,
  down: PropTypes.bool.isRequired,
  className: PropTypes.string.isRequired,
  t: PropTypes.func.isRequired,
}

@connect(state => ({
  rows: shipRowsSelector(state),
  ...shipInfoConfigSelector(state),
  toTop: get(
    extensionSelectorFactory('poi-plugin-ship-info')(state),
    'ui.toTop',
    0,
  ),
  isExtend: get(
    extensionSelectorFactory('poi-plugin-ship-info')(state),
    'ui.isExtend',
    true,
  ),
}))
class ShipInfoTableArea extends Component {
  static propTypes = {
    rows: PropTypes.arrayOf(PropTypes.shape(shipInfoShape)).isRequired,
    sortName: PropTypes.string.isRequired,
    sortOrder: PropTypes.number.isRequired,
    toTop: PropTypes.bool,
    // isExtend: PropTypes.bool,
    dispatch: PropTypes.func,
    window: PropTypes.instanceOf(window.constructor),
  }

  constructor(props) {
    super(props)
    this.tableWidth = sum(WIDTHS)
    this.setRef = this.setRef.bind(this)
    this.onClickFactory = memoize(this.onClickFactory)
    this.state = {
      tableAreaWidth: props.window.width,
      activeRow: -1,
    }
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

  setRef = ref => {
    this.grid = ref
  }

  getColumnWidth = ({ index }) => {
    // 20: magic number, seems it need to be greater than 16
    const width = floor(
      (WIDTHS[index] || 40) *
        (this.state.tableAreaWidth - 20 > this.tableWidth
          ? (this.state.tableAreaWidth - 20) / this.tableWidth
          : 1),
    )
    return width
  }

  handleContentRendered = e => {
    const { rowStopIndex, columnStopIndex } = e
    if (this.activeColumn !== -1 && this.activeRow !== -1) {
      this.setState({
        activeColumn:
          this.state.activeColumn + columnStopIndex - this.columnStopIndex,
        activeRow: this.state.activeRow + rowStopIndex - this.rowStopIndex,
      })
    }
    this.rowStopIndex = rowStopIndex
    this.columnStopIndex = columnStopIndex
  }

  handleClickTitle = title => () => {
    if (this.props.sortName !== title) {
      const order =
        title === 'id' || title === 'type' || title === 'name' ? 1 : 0
      this.saveSortRules(title, order)
    } else {
      this.saveSortRules(this.props.sortName, (this.props.sortOrder + 1) % 2)
    }
  }

  handleScroll = ({ scrollTop }) => {
    const { rows } = this.props
    const contentHeight = rows.length * ROW_HEIGHT
    const safeZone = Math.round(
      window.screen.height / config.get('poi.zoomLevel', 1),
    )
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

  cellRenderer = ({ columnIndex, key, rowIndex, style }) => {
    const { rows, sortName, sortOrder } = this.props

    const highlight =
      (columnIndex === this.state.activeColumn ||
        rowIndex === this.state.activeRow) &&
      !(columnIndex === 0 && rowIndex !== this.state.activeRow) &&
      !(rowIndex === 0 && columnIndex !== this.state.activeColumn)
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
        columnIndex,
        style,
        sortName,
        sortOrder,
        ...props,
      })
    } else if (columnIndex === 0) {
      content = (
        <div style={{ ...style, paddingLeft: '10px' }} key={key} {...props}>
          {rowIndex}
        </div>
      )
    } else {
      const index = columnIndex - 1
      const ship = rows[rowIndex - 1]
      const Cell = ShipInfoCells[TYPES[index]]
      content = <Cell ship={ship} style={style} {...props} />
    }

    return content
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

  handleResize = ({ width }) => {
    this.setState(
      {
        tableAreaWidth: width,
      },
      () => {
        if (this.grid) {
          this.grid.recomputeGridSize()
          this.grid.forceUpdateGrids()
        }
      },
    )
  }

  render() {
    const { rows } = this.props
    const { activeRow, activeColumn } = this.state

    return (
      <div id="ship-info-show">
        <div
          style={{ flex: 1, margin: 0, padding: 0 }}
          className="table-container"
          ref={r => {
            this.tableArea = r
          }}
        >
          <AutoSizer onResize={this.handleResize}>
            {({ height, width }) => (
              <MultiGrid
                rows={rows}
                ref={this.setRef}
                activeRow={activeRow}
                activeColumn={activeColumn}
                columnCount={WIDTHS.length}
                columnWidth={this.getColumnWidth}
                estimatedRowSize={100}
                fixedColumnCount={0}
                fixedRowCount={1}
                handleContentRendered={this.handleContentRendered}
                height={height}
                overscanColumnCount={10}
                overscanRowCount={5}
                cellRenderer={this.cellRenderer}
                rowCount={rows.length + 1}
                rowHeight={ROW_HEIGHT}
                scrollToAlignment="start"
                width={width} // 16: left and right padding (8 + 8)
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
}

export default props => (
  <WindowEnv.Consumer>
    {({ window }) => <ShipInfoTableArea window={window} {...props} />}
  </WindowEnv.Consumer>
)
