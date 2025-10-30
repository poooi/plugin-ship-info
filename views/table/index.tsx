import { get } from 'lodash'
import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react'
import { connect } from 'react-redux'
import styled from 'styled-components'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  ColumnDef,
  flexRender,
  SortingState,
  FilterFn,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { atom, useAtom, useAtomValue } from 'jotai'

import { WindowEnv } from 'views/components/etc/window-env'

import {
  allShipRowsSelector,
  shipInfoConfigSelector,
  shipInfoFiltersSelector,
  shipTypesSelecor,
  expeditionShipsSelector,
} from '../selectors'
import {
  Cell as NormalCell,
  Cells as ShipInfoCells,
  IShipRawData,
} from './cells'
import { ColumnsConfig, TableRow } from './columns-config'
import { TitleCell } from './title-cell'
import { isShipCompleted, canEquipDaihatsu } from '../utils'

const ROW_INDEX_WIDTH = 40

const ROW_HEIGHT = 35

// Jotai atoms for active cell tracking
const activeRowAtom = atom(-1)
const activeColumnAtom = atom(-1)

// Global filter function that applies all filter criteria
const globalFilterFn: FilterFn<TableRow> = (row, columnId, filterValue) => {
  const { shipData } = row.original
  const { shipTypes, expeditionShips, config, filters } = filterValue as {
    shipTypes: number[]
    expeditionShips: number[]
    config: any
    filters: any
  }

  const { ship, $ship, fleetIdMap, db } = shipData
  const shipId = ship.api_id
  const typeId = $ship.api_stype
  const lv = ship.api_lv
  const locked = ship.api_locked
  const fleetId = fleetIdMap[shipId]
  const after = parseInt($ship.api_aftershipid || '0', 10)
  const sallyArea = ship.api_sally_area || 0
  const exslot = ship.api_slot_ex
  const cond = ship.api_cond
  const isCompleted = isShipCompleted(ship, $ship)
  const daihatsu = canEquipDaihatsu($ship.api_id, db)

  // Type filter
  if (!shipTypes.includes(typeId)) return false

  // Level range filter
  const { minLevel, maxLevel } = filters
  if (lv < Math.min(minLevel, maxLevel) || lv > Math.max(minLevel, maxLevel)) {
    return false
  }

  // Locked filter
  const { lockedRadio } = config
  if (lockedRadio === 1 && locked !== 1) return false
  if (lockedRadio === 2 && locked !== 0) return false

  // Expedition filter
  const { expeditionRadio } = config
  const inExpedition = expeditionShips.includes(shipId)
  if (expeditionRadio === 1 && !inExpedition) return false
  if (expeditionRadio === 2 && inExpedition) return false

  // Modernization filter
  const { modernizationRadio } = config
  if (modernizationRadio === 1 && !isCompleted) return false
  if (modernizationRadio === 2 && isCompleted) return false

  // Remodel filter
  const { remodelRadio } = config
  const remodelable = after !== 0
  if (remodelRadio === 1 && !remodelable) return false
  if (remodelRadio === 2 && remodelable) return false

  // Sally area filter
  const { sallyAreaChecked } = config
  const allChecked = sallyAreaChecked.reduce(
    (all: boolean, checked: boolean) => all && checked,
    true,
  )
  if (!allChecked && !sallyAreaChecked[sallyArea || 0]) return false

  // In fleet filter
  const { inFleetRadio } = config
  const isInFleet = fleetId > -1
  if (inFleetRadio === 1 && !isInFleet) return false
  if (inFleetRadio === 2 && isInFleet) return false

  // Sparkle filter
  const { sparkleRadio } = config
  if (sparkleRadio === 1 && cond < 50) return false
  if (sparkleRadio === 2 && cond >= 50) return false

  // Ex slot filter
  const { exSlotRadio } = config
  if (exSlotRadio === 1 && exslot === 0) return false
  if (exSlotRadio === 2 && exslot !== 0) return false

  // Daihatsu filter
  const { daihatsuRadio } = config
  if (daihatsuRadio === 1 && !daihatsu) return false
  if (daihatsuRadio === 2 && daihatsu) return false

  return true
}

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
  allShipsData: IShipRawData[]
  window: Window
  sortName: string
  sortOrder: number
  shipTypes: number[]
  expeditionShips: number[]
  filterConfig: any
  filterSettings: any
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
  allShipsData,
  window: windowObj,
  sortName,
  sortOrder,
  shipTypes,
  expeditionShips,
  filterConfig,
  filterSettings,
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

  // Build table data from all ships
  const data = useMemo<TableRow[]>(
    () =>
      allShipsData.map((shipData, index) => ({
        id: shipData.ship.api_id,
        shipData,
        index,
      })),
    [allShipsData],
  )

  // Global filter value that includes all filter criteria
  const globalFilterValue = useMemo(
    () => ({
      shipTypes,
      expeditionShips,
      config: filterConfig,
      filters: filterSettings,
    }),
    [shipTypes, expeditionShips, filterConfig, filterSettings],
  )

  // Define columns using ColumnsConfig
  const columns = useMemo<ColumnDef<TableRow>[]>(() => {
    // Row index column
    const rowIndexColumn: ColumnDef<TableRow> = {
      id: 'rowIndex',
      header: () => <div />,
      cell: ({ row }) => (
        <RowIndexCell
          rowIndex={row.index}
          onClickCell={onClickCell}
          onContextMenu={onContextMenu}
        />
      ),
      size: ROW_INDEX_WIDTH,
      enableSorting: false,
    }

    // Data columns from ColumnsConfig
    const dataColumns: ColumnDef<TableRow>[] = ColumnsConfig.map(
      (config, index) => ({
        id: config.name,
        accessorFn: (row) => row.shipData,
        header: () => (
          <TitleCell
            title={config.title}
            sortable={config.sortable}
            centerAlign={config.certer}
            sorting={sortName === config.name}
            up={Boolean(sortOrder)}
            onClick={() => config.sortable && handleClickTitle(config.name)}
          />
        ),
        cell: ({ row }) => (
          <DataCell
            columnIndex={index + 1}
            rowIndex={row.index}
            shipData={row.original.shipData}
            cellType={config.name}
            onClickCell={onClickCell}
            onContextMenu={onContextMenu}
          />
        ),
        size: config.width,
        enableSorting: config.sortable,
        sortingFn: config.sortingFn,
      }),
    )

    return [rowIndexColumn, ...dataColumns]
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
      globalFilter: globalFilterValue,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    globalFilterFn,
  })

  // Get filtered rows from table
  const { rows } = table.getRowModel()

  // Virtualizer for rows
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
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
            const row = rows[virtualRow.index]
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
  allShipsData: IShipRawData[]
  shipTypes: number[]
  expeditionShips: number[]
  filterConfig: any
  filterSettings: any
  sortName: string
  sortOrder: number
}

const sortNameSelector = (state: ReduxState): string =>
  get(state.config, 'plugin.ShipInfo.sortName', 'lv')

const sortOrderSelector = (state: ReduxState): number =>
  get(state.config, 'plugin.ShipInfo.sortOrder', 0)

const mapStateToProps = (state: ReduxState): MappedProps => ({
  allShipsData: allShipRowsSelector(state as any) as IShipRawData[],
  shipTypes: shipTypesSelecor(state as any) as number[],
  expeditionShips: expeditionShipsSelector(state as any) as number[],
  filterConfig: shipInfoConfigSelector(state as any),
  filterSettings: shipInfoFiltersSelector(state as any),
  sortName: sortNameSelector(state),
  sortOrder: sortOrderSelector(state),
})

const ShipInfoTableArea = connect(mapStateToProps)(ShipInfoTableAreaBase)

export const TableView = (props: object) => (
  <WindowEnv.Consumer>
    {({ window }) => <ShipInfoTableArea window={window} {...props} />}
  </WindowEnv.Consumer>
)
