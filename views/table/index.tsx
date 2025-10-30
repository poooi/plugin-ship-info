import { Dictionary, get, map } from 'lodash'
import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react'
import { connect } from 'react-redux'
import styled from 'styled-components'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  ColumnDef,
  flexRender,
  SortingState,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { atom, useAtom, useAtomValue } from 'jotai'

import { WindowEnv } from 'views/components/etc/window-env'

import { allShipRowsMapSelector, filterShipIdsSelector } from '../selectors'
import {
  Cell as NormalCell,
  Cells as ShipInfoCells,
  IShipRawData,
} from './cells'
import { ColumnsConfig } from './columns-config'
import { TitleCell } from './title-cell'

const TYPES = map(ColumnsConfig, 'name')
const TITLES = map(ColumnsConfig, 'title')
const SORTABLES = map(ColumnsConfig, 'sortable')
const CENTER_ALIGNS: boolean[] = map(ColumnsConfig, 'center')
const WIDTHS = [40].concat(map(ColumnsConfig, 'width'))

const ROW_HEIGHT = 35

// Jotai atoms for active cell tracking
const activeRowAtom = atom(-1)
const activeColumnAtom = atom(-1)

const TableWrapper = styled.div`
  flex: 1;
  margin: 0;
  padding: 0;
  overflow: auto;
  position: relative;
`

const Spacer = styled.div`
  height: 35px;
`

const TableContainer = styled.div`
  display: inline-block;
  min-width: 100%;
`

const TableHeader = styled.div`
  display: flex;
  position: sticky;
  top: 0;
  z-index: 1;
  background: ${(props) => props.theme.DARK_GRAY3};
`

const TableBody = styled.div`
  position: relative;
`

const HeaderCell = styled.div<{ width: number }>`
  width: ${(props) => props.width}px;
  flex-shrink: 0;
`

const Row = styled.div`
  display: flex;
  position: absolute;
  width: 100%;
`

interface ShipInfoTableAreaBaseProps {
  ids: number[]
  ships: Dictionary<IShipRawData>
  window: Window
  sortName: string
  sortOrder: number
}

interface TableRow {
  id: number
  shipData: IShipRawData
  index: number
}

// Cell wrapper components that subscribe to Jotai atoms
const RowIndexCell: React.FC<{
  rowIndex: number
  onClickCell: (columnIndex: number, rowIndex: number) => void
  onContextMenu: () => void
}> = ({ rowIndex, onClickCell, onContextMenu }) => {
  const activeRow = useAtomValue(activeRowAtom)
  const isHighlighted = activeRow === rowIndex

  return (
    <NormalCell
      isEven={rowIndex % 2 === 1}
      style={{
        backgroundColor: isHighlighted ? 'rgba(138, 155, 168, 0.3)' : undefined,
      }}
      onClick={() => onClickCell(0, rowIndex)}
      onContextMenu={onContextMenu}
    >
      {rowIndex + 1}
    </NormalCell>
  )
}

const DataCell: React.FC<{
  columnIndex: number
  rowIndex: number
  shipData: IShipRawData
  cellType: string
  onClickCell: (columnIndex: number, rowIndex: number) => void
  onContextMenu: () => void
}> = ({
  columnIndex,
  rowIndex,
  shipData,
  cellType,
  onClickCell,
  onContextMenu,
}) => {
  const activeRow = useAtomValue(activeRowAtom)
  const activeColumn = useAtomValue(activeColumnAtom)
  const isHighlighted = activeColumn === columnIndex || activeRow === rowIndex

  const Cell = ShipInfoCells[cellType as keyof typeof ShipInfoCells]

  return (
    <div
      style={{
        backgroundColor: isHighlighted ? 'rgba(138, 155, 168, 0.3)' : undefined,
      }}
    >
      <Cell
        shipData={shipData}
        onClick={() => onClickCell(columnIndex, rowIndex)}
        onContextMenu={onContextMenu}
      />
    </div>
  )
}

const ShipInfoTableAreaBase: React.FC<ShipInfoTableAreaBaseProps> = ({
  ids,
  ships,
  window: windowObj,
  sortName,
  sortOrder,
}) => {
  const [activeRow, setActiveRow] = useAtom(activeRowAtom)
  const [activeColumn, setActiveColumn] = useAtom(activeColumnAtom)
  const tableContainerRef = useRef<HTMLDivElement>(null)

  const hasSpacer = process.platform === 'darwin' && !windowObj.isMain

  const saveSortRules = useCallback((name: string, order: number) => {
    window.config.set('plugin.ShipInfo.sortName', name)
    window.config.set('plugin.ShipInfo.sortOrder', order)
  }, [])

  const handleClickTitle = useCallback(
    (columnName: string) => {
      if (sortName !== columnName) {
        const order =
          columnName === 'id' || columnName === 'type' || columnName === 'name'
            ? 1
            : 0
        saveSortRules(columnName, order)
      } else {
        saveSortRules(sortName, (sortOrder + 1) % 2)
      }
    },
    [sortName, sortOrder, saveSortRules],
  )

  const onContextMenu = useCallback(() => {
    setActiveColumn(-1)
    setActiveRow(-1)
  }, [setActiveColumn, setActiveRow])

  const onClickCell = useCallback(
    (columnIndex: number, rowIndex: number) => {
      const off = activeColumn === columnIndex && activeRow === rowIndex
      setActiveColumn(off ? -1 : columnIndex)
      setActiveRow(off ? -1 : rowIndex)
    },
    [activeColumn, activeRow, setActiveColumn, setActiveRow],
  )

  // Build table data
  const data = useMemo<TableRow[]>(
    () =>
      ids.map((id, index) => ({
        id,
        shipData: ships[id],
        index,
      })),
    [ids, ships],
  )

  // Define columns
  const columns = useMemo<ColumnDef<TableRow>[]>(() => {
    const cols: ColumnDef<TableRow>[] = [
      {
        id: 'rowIndex',
        header: () => <div />,
        cell: ({ row }) => (
          <RowIndexCell
            rowIndex={row.index}
            onClickCell={onClickCell}
            onContextMenu={onContextMenu}
          />
        ),
        size: WIDTHS[0],
        enableSorting: false,
      },
    ]

    TYPES.forEach((type, index) => {
      cols.push({
        id: type,
        accessorFn: (row) => row.shipData,
        header: () => (
          <TitleCell
            title={TITLES[index]}
            sortable={SORTABLES[index]}
            centerAlign={CENTER_ALIGNS[index]}
            sorting={sortName === type}
            up={Boolean(sortOrder)}
            onClick={() => SORTABLES[index] && handleClickTitle(type)}
          />
        ),
        cell: ({ row }) => (
          <DataCell
            columnIndex={index + 1}
            rowIndex={row.index}
            shipData={row.original.shipData}
            cellType={type}
            onClickCell={onClickCell}
            onContextMenu={onContextMenu}
          />
        ),
        size: WIDTHS[index + 1],
        enableSorting: SORTABLES[index],
      })
    })

    return cols
  }, [sortName, sortOrder, handleClickTitle, onClickCell, onContextMenu])

  // Initialize table with sorting state from Redux
  const [sorting, setSorting] = useState<SortingState>([
    { id: sortName, desc: sortOrder === 0 },
  ])

  // Update sorting state when Redux state changes
  useEffect(() => {
    setSorting([{ id: sortName, desc: sortOrder === 0 }])
  }, [sortName, sortOrder])

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualSorting: true, // We're handling sorting via Redux
  })

  // Virtualizer for rows
  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  })

  const virtualRows = rowVirtualizer.getVirtualItems()
  const totalSize = rowVirtualizer.getTotalSize()

  return (
    <TableWrapper ref={tableContainerRef} className="ship-info-scrollable">
      {hasSpacer && <Spacer />}
      <TableContainer>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <React.Fragment key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <HeaderCell key={header.id} width={header.column.getSize()}>
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
                  )}
                </HeaderCell>
              ))}
            </React.Fragment>
          ))}
        </TableHeader>
        <TableBody style={{ height: `${totalSize}px` }}>
          {virtualRows.map((virtualRow) => {
            const row = table.getRowModel().rows[virtualRow.index]
            return (
              <Row
                key={row.id}
                style={{
                  transform: `translateY(${virtualRow.start}px)`,
                  height: `${virtualRow.size}px`,
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <HeaderCell key={cell.id} width={cell.column.getSize()}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </HeaderCell>
                ))}
              </Row>
            )
          })}
        </TableBody>
      </TableContainer>
    </TableWrapper>
  )
}

interface ReduxState {
  config: Record<string, any>
  [key: string]: any
}

interface MappedProps {
  ids: number[]
  ships: Dictionary<IShipRawData>
  sortName: string
  sortOrder: number
}

const sortNameSelector = (state: ReduxState): string =>
  get(state.config, 'plugin.ShipInfo.sortName', 'lv')

const sortOrderSelector = (state: ReduxState): number =>
  get(state.config, 'plugin.ShipInfo.sortOrder', 0)

const mapStateToProps = (state: ReduxState): MappedProps => ({
  // @ts-expect-error - Complex reselect selector typing issue
  ids: filterShipIdsSelector(state as any) as number[],
  ships: allShipRowsMapSelector(state as any) as Dictionary<IShipRawData>,
  sortName: sortNameSelector(state),
  sortOrder: sortOrderSelector(state),
})

const ShipInfoTableArea = connect(mapStateToProps)(ShipInfoTableAreaBase)

export const TableView = (props: object) => (
  <WindowEnv.Consumer>
    {({ window }) => <ShipInfoTableArea window={window} {...props} />}
  </WindowEnv.Consumer>
)
