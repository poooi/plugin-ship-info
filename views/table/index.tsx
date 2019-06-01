import { debounce, Dictionary, floor, get, map, memoize, sum } from 'lodash'
import React, { Component, createRef } from 'react'
import { connect, DispatchProp } from 'react-redux'
import AutoSizer from 'react-virtualized-auto-sizer'
import {
  GridChildComponentProps,
  GridOnScrollProps,
  VariableSizeGrid as Grid,
} from 'react-window'
import styled from 'styled-components'

import { WindowEnv } from 'views/components/etc/window-env'

import { IShip } from 'views/types'
import { allShipRowsMapSelector, filterShipIdsSelector } from '../selectors'
import { Cell as NormalCell, Cells as ShipInfoCells } from './cells'
import { ColumnsConfig } from './columns-config'
import { TitleCell } from './title-cell'

const TYPES = map(ColumnsConfig, 'name')
const TITLES = map(ColumnsConfig, 'title')
const SORTABLES = map(ColumnsConfig, 'sortable')
const CENTER_ALIGNS: boolean[] = map(ColumnsConfig, 'center')
// width will always unshift 1 extra element for row index
const WIDTHS = [40].concat(map(ColumnsConfig, 'width'))

const ROW_HEIGHT = 35

const GridWrapper = styled.div`
  flex: 1;
  margin: 0;
  padding: 0;
`

const Spacer = styled.div`
  height: 35px;
`

const GridHeader = styled(Grid)`
  ::-webkit-scrollbar {
    height: 0;
    width: 0;
  }

  ::-webkit-scrollbar-thumb {
    height: 0;
    width: 0;
  }
`

interface IShipInfoTableAreaBaseProps extends DispatchProp {
  ids: number[]
  ships: Dictionary<IShip>
  window: Window
  sortName: string
  sortOrder: number
}

interface IShipInfoTableAreaBaseState {
  activeRow: number
  activeColumn: number
}

class ShipInfoTableAreaBase extends Component<
  IShipInfoTableAreaBaseProps,
  IShipInfoTableAreaBaseState
> {
  public tableWidth = sum(WIDTHS)
  public grid = createRef<Grid>()
  public gridHeader = createRef<Grid>()
  public tableArea = createRef<HTMLDivElement>()
  public activeColumn: number = -1
  public activeRow: number = -1
  public columnStopIndex: number = 0
  public rowStopIndex: number = 0
  public tableAreaWidth: number

  public handleClickTitle = memoize((title: string) => () => {
    if (this.props.sortName !== title) {
      const order =
        title === 'id' || title === 'type' || title === 'name' ? 1 : 0
      this.saveSortRules(title, order)
    } else {
      this.saveSortRules(this.props.sortName, (this.props.sortOrder + 1) % 2)
    }
  })

  public handleResize = debounce(({ width }: { width: number }) => {
    this.tableAreaWidth = width
    if (this.grid.current) {
      this.grid.current.resetAfterColumnIndex(0)
    }
    if (this.gridHeader.current) {
      this.gridHeader.current.resetAfterColumnIndex(0)
    }
  }, 100)

  constructor(props: IShipInfoTableAreaBaseProps) {
    super(props)
    this.onClickFactory = memoize(this.onClickFactory)
    this.state = {
      activeColumn: -1,
      activeRow: -1,
    }
    this.tableAreaWidth = props.window.innerWidth
  }

  public getItemKey = ({
    columnIndex,
    data,
    rowIndex,
  }: {
    columnIndex: number
    data: any
    rowIndex: number
  }) =>
    rowIndex === 0
      ? `title-${columnIndex}`
      : `${data[rowIndex].id}-${columnIndex}`

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

  public getColumnWidth = (index: number) => {
    // 20: magic number, seems it need to be greater than 16
    const width = floor(
      (WIDTHS[index] || 40) *
        (this.tableAreaWidth - 20 > this.tableWidth
          ? (this.tableAreaWidth - 20) / this.tableWidth
          : 1),
    )
    return width
  }

  public getRowHeight = () => ROW_HEIGHT

  public saveSortRules = (name: string, order: number) => {
    window.config.set('plugin.ShipInfo.sortName', name)
    window.config.set('plugin.ShipInfo.sortOrder', order)
  }

  public cellRenderer = ({
    columnIndex,
    rowIndex,
    style,
  }: GridChildComponentProps) => {
    const isHighlighteds =
      (columnIndex === this.state.activeColumn ||
        rowIndex === this.state.activeRow) &&
      !(columnIndex === 0 && rowIndex !== this.state.activeRow) &&
      !(rowIndex === 0 && columnIndex !== this.state.activeColumn)
    const props = {
      centerAlign: CENTER_ALIGNS[columnIndex - 1],
      isEven: rowIndex % 2 === 1,
      isHighlighteds,
      onClick: this.onClickFactory({ columnIndex, rowIndex }),
      onContextMenu: this.onContextMenu,
      style,
    }
    let content
    if (columnIndex === 0) {
      content = <NormalCell {...props}>{rowIndex + 1}</NormalCell>
    } else {
      const index = columnIndex - 1
      const { ids, ships } = this.props
      const ship = ships[ids[rowIndex]]
      const Cell = ShipInfoCells[TYPES[index] as keyof typeof ShipInfoCells]
      content = <Cell ship={ship} {...props} />
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
    const { sortName, sortOrder } = this.props
    const index = columnIndex - 1
    return (
      <TitleCell
        {...props}
        style={style}
        title={TITLES[index]}
        sortable={SORTABLES[index]}
        centerAlign={CENTER_ALIGNS[index]}
        sorting={sortName === TYPES[index]}
        up={Boolean(sortOrder)}
        onClick={this.handleClickTitle(TYPES[index])}
      />
    )
  }

  public handleScroll = ({ scrollLeft }: GridOnScrollProps) => {
    if (this.gridHeader.current) {
      this.gridHeader.current.scrollTo({ scrollLeft, scrollTop: 0 })
    }
  }

  public render() {
    const { ids, ships, sortName, sortOrder, window } = this.props
    const { activeRow, activeColumn } = this.state

    const hasSpacer = process.platform === 'darwin' && !window.isMain

    return (
      <GridWrapper>
        {/* leave some space for window handler */}
        {hasSpacer && <Spacer />}
        <AutoSizer onResize={this.handleResize}>
          {({ height, width }) => (
            <>
              <GridHeader
                ref={this.gridHeader}
                columnCount={WIDTHS.length}
                columnWidth={this.getColumnWidth}
                height={35}
                rowCount={1}
                rowHeight={this.getRowHeight}
                width={width - 32}
                itemData={{ sortName, sortOrder }} // to trigger header's re-render
              >
                {this.titleRenderer}
              </GridHeader>
              <Grid
                className="ship-info-scrollable"
                ref={this.grid}
                columnCount={WIDTHS.length}
                columnWidth={this.getColumnWidth}
                height={height - (hasSpacer ? 75 : 40)}
                itemData={map(ids, id => ships[id])}
                itemKey={this.getItemKey}
                rowCount={ids.length}
                rowHeight={this.getRowHeight}
                width={width - 16}
                onScroll={this.handleScroll}
              >
                {this.cellRenderer}
              </Grid>
            </>
          )}
        </AutoSizer>
      </GridWrapper>
    )
  }
}

const sortNameSelector = (state: { config: any }): string =>
  get(state.config, 'plugin.ShipInfo.sortName', 'lv')

const sortOrderSelector = (state: { config: any }): number =>
  get(state.config, 'plugin.ShipInfo.sortOrder', 0)

const ShipInfoTableArea = connect((state: { config: any }) => ({
  ids: filterShipIdsSelector(state),
  ships: allShipRowsMapSelector(state),
  sortName: sortNameSelector(state),
  sortOrder: sortOrderSelector(state),
}))(ShipInfoTableAreaBase)

export const TableView = (props: object) => (
  <WindowEnv.Consumer>
    {({ window }) => <ShipInfoTableArea window={window} {...props} />}
  </WindowEnv.Consumer>
)
