import cls from 'classnames'
import { TranslationFunction } from 'i18next'
import { floor, get, map, memoize, sum } from 'lodash'
import PropTypes from 'prop-types'
import React, { Component, createRef } from 'react'
import { useTranslation, withTranslation } from 'react-i18next'
import { connect, DispatchProp } from 'react-redux'
import { AutoSizer, GridCellRenderer, MultiGrid } from 'react-virtualized'

import { WindowEnv } from 'views/components/etc/window-env'
import { extensionSelectorFactory } from 'views/utils/selectors'

import { IShip } from 'views/types'
import { shipInfoConfigSelector, shipRowsSelector } from '../selectors'
import { shipInfoShape } from '../utils'
import COLUMNS from './columns'
import ShipInfoCells from './ship-info-cells'

const { config } = window

const TYPES = map(COLUMNS, 'name')
const TITLES = map(COLUMNS, 'title')
const SORTABLES = map(COLUMNS, 'sortable')
const CENTER_ALIGNS: boolean[] = map(COLUMNS, 'center')
// width will always unshift 1 extra element for row index
const WIDTHS = [40].concat(map(COLUMNS, 'width'))

const ROW_HEIGHT = 35

interface ITitleCellProps {
  style: React.CSSProperties
  title: string
  sortable: boolean
  handleClickTitle?: () => void
  centerAlign: boolean
  sorting?: boolean
  up?: boolean
  down?: boolean
  className?: string
}

const noop = (): void => {
  /* do nothing */
}

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
}: ITitleCellProps) => {
  const { t } = useTranslation(['poi-plugin-ship-info'])

  return (
    <div
      role="button"
      tabIndex={0}
      style={style}
      onClick={sortable ? handleClickTitle : noop}
      className={cls(className, {
        center: centerAlign,
        clickable: sortable,
        down,
        sorting,
        up,
      })}
    >
      {t(title)}
    </div>
  )
}

interface IShipInfoTableAreaBaseProps extends DispatchProp {
  rows: IShip[]
  window: Window
}

interface IShipInfoTableAreaBaseState {
  tableAreaWidth: number
  activeRow: number
  activeColumn: number
}

class ShipInfoTableAreaBase extends Component<
  IShipInfoTableAreaBaseProps,
  IShipInfoTableAreaBaseState
> {
  public tableWidth = sum(WIDTHS)
  public grid = createRef<MultiGrid>()
  public tableArea = createRef<HTMLDivElement>()
  public activeColumn: number = -1
  public activeRow: number = -1
  public columnStopIndex: number = 0
  public rowStopIndex: number = 0

  constructor(props: IShipInfoTableAreaBaseProps) {
    super(props)
    this.onClickFactory = memoize(this.onClickFactory)
    this.state = {
      activeColumn: -1,
      activeRow: -1,
      tableAreaWidth: props.window.innerWidth,
    }
  }

  public onContextMenu = () =>
    this.setState({
      activeColumn: -1,
      activeRow: -1,
    })

  public onClickFactory = ({
    columnIndex,
    rowIndex,
  }: {
    columnIndex: number
    rowIndex: number
  }) => () => {
    const { activeColumn, activeRow } = this.state
    const off = activeColumn === columnIndex && activeRow === rowIndex
    this.setState({
      activeColumn: off ? -1 : columnIndex,
      activeRow: off ? -1 : rowIndex,
    })
  }

  public getColumnWidth = ({ index }: { index: number }) => {
    // 20: magic number, seems it need to be greater than 16
    const width = floor(
      (WIDTHS[index] || 40) *
        (this.state.tableAreaWidth - 20 > this.tableWidth
          ? (this.state.tableAreaWidth - 20) / this.tableWidth
          : 1),
    )
    return width
  }

  // public handleContentRendered = (e) => {
  //   const { rowStopIndex, columnStopIndex } = e
  //   if (this.activeColumn !== -1 && this.activeRow !== -1) {
  //     this.setState({
  //       activeColumn:
  //         this.state.activeColumn + columnStopIndex - this.columnStopIndex,
  //       activeRow: this.state.activeRow + rowStopIndex - this.rowStopIndex,
  //     })
  //   }
  //   this.rowStopIndex = rowStopIndex
  //   this.columnStopIndex = columnStopIndex
  // }

  // public handleClickTitle = (title: string) => () => {
  //   if (this.props.sortName !== title) {
  //     const order =
  //       title === 'id' || title === 'type' || title === 'name' ? 1 : 0
  //     this.saveSortRules(title, order)
  //   } else {
  //     this.saveSortRules(this.props.sortName, (this.props.sortOrder + 1) % 2)
  //   }
  // }

  // public handleScroll = ({ scrollTop }: { scrollTop: number}) => {
  //   const { rows } = this.props
  //   const contentHeight = rows.length * ROW_HEIGHT
  //   const safeZone = Math.round(
  //     window.screen.height / config.get('poi.zoomLevel', 1),
  //   )
  //   if (this.props.toTop !== !scrollTop && contentHeight > safeZone) {
  //     this.props.dispatch({
  //       type: '@@poi-plugin-ship-info@scroll',
  //       toTop: !scrollTop,
  //     })
  //   }
  // }

  // public saveSortRules = (name, order) => {
  //   config.set('plugin.ShipInfo.sortName', name)
  //   config.set('plugin.ShipInfo.sortOrder', order)
  // }

  public cellRenderer: GridCellRenderer = ({
    columnIndex,
    key,
    rowIndex,
    style,
  }) => {
    const { rows } = this.props

    const highlight =
      (columnIndex === this.state.activeColumn ||
        rowIndex === this.state.activeRow) &&
      !(columnIndex === 0 && rowIndex !== this.state.activeRow) &&
      !(rowIndex === 0 && columnIndex !== this.state.activeColumn)
    const props = {
      className: cls({
        center: CENTER_ALIGNS[columnIndex - 1],
        'even-dark': rowIndex % 2 === 1,
        'even-light': rowIndex % 2 === 1,
        highlight,
        'ship-info-cell': true,
      }),
      key,
      onClick: this.onClickFactory({ columnIndex, rowIndex }),
      onContextMenu: this.onContextMenu,
    }
    let content
    if (rowIndex === 0) {
      content = this.titleRenderer({
        columnIndex,
        style,
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
      const Cell = ShipInfoCells[TYPES[index] as keyof typeof ShipInfoCells]
      content = <Cell ship={ship} style={style} {...props} />
    }

    return content
  }

  public titleRenderer = ({
    columnIndex,
    style,
    ...props
  }: {
    columnIndex: number
    style: React.CSSProperties
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
        // sorting={sortName === TYPES[index]}
        // up={sortName === TYPES[index] && Boolean(sortOrder)}
        // down={sortName === TYPES[index] && Boolean(!sortOrder)}
        // handleClickTitle={this.handleClickTitle(TYPES[index])}
      />
    )
  }

  public handleResize = ({ width }: { width: number }) => {
    this.setState(
      {
        tableAreaWidth: width,
      },
      () => {
        if (this.grid.current) {
          this.grid.current.recomputeGridSize()
          this.grid.current.forceUpdateGrids()
        }
      },
    )
  }

  public render() {
    const { rows } = this.props
    const { activeRow, activeColumn } = this.state

    return (
      <div id="ship-info-show">
        <div
          style={{ flex: 1, margin: 0, padding: 0 }}
          className="table-container"
          ref={this.tableArea}
        >
          <AutoSizer onResize={this.handleResize}>
            {({ height, width }) => (
              <MultiGrid
                rows={rows}
                ref={this.grid}
                activeRow={activeRow}
                activeColumn={activeColumn}
                columnCount={WIDTHS.length}
                columnWidth={this.getColumnWidth}
                estimatedRowSize={100}
                fixedColumnCount={0}
                fixedRowCount={1}
                // handleContentRendered={this.handleContentRendered}
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
                // onScroll={this.handleScroll}
              />
            )}
          </AutoSizer>
        </div>
      </div>
    )
  }
}

const ShipInfoTableArea = connect(state => ({
  rows: shipRowsSelector(state),
}))(ShipInfoTableAreaBase)

export default (props: object) => (
  <WindowEnv.Consumer>
    {({ window }) => <ShipInfoTableArea window={window} {...props} />}
  </WindowEnv.Consumer>
)
