import { get as lodashGet } from 'lodash'
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
import { atom, useAtom, useAtomValue, useSetAtom } from 'jotai'

import { WindowEnv } from 'views/components/etc/window-env'

import {
  allShipRowsSelector,
  shipInfoConfigSelector,
  shipInfoFiltersSelector,
  shipTypesSelecor,
  expeditionShipsSelector,
} from '../selectors'
import { IShipRawData } from './cells'
import { columns as dataColumns, TableRow } from './columns-config'
import { TitleCell } from './title-cell'
import { isShipCompleted, canEquipDaihatsu } from '../utils'

const ROW_INDEX_WIDTH = 40

const ROW_HEIGHT = 35

// Jotai atoms for active cell tracking
const activeRowAtom = atom(-1)
const activeColumnAtom = atom(-1)

// Jotai atoms for filter state
export const filterShipTypesAtom = atom<number[]>([])
export const filterExpeditionShipsAtom = atom<number[]>([])
export const filterConfigAtom = atom<any>({})
export const filterSettingsAtom = atom<any>({ minLevel: 1, maxLevel: 10000 })

// Derived atom that combines all filter criteria
export const globalFilterAtom = atom((get) => ({
  shipTypes: get(filterShipTypesAtom),
  expeditionShips: get(filterExpeditionShipsAtom),
  config: get(filterConfigAtom),
  filters: get(filterSettingsAtom),
}))

// Cache filter results per row to avoid re-computing for each column
const filterCache = new Map<number, boolean>()

// Global filter function that applies all filter criteria
// Note: This is called once per column per row, so we cache the result
const globalFilterFn: FilterFn<TableRow> = (row, columnId, filterValue) => {
  const { shipData } = row.original
  const shipId = shipData.ship.api_id

  // Check cache first - if we've already filtered this row, return cached result
  if (filterCache.has(shipId)) {
    return filterCache.get(shipId)!
  }

  const { shipTypes, expeditionShips, config, filters } = filterValue as {
    shipTypes: number[]
    expeditionShips: number[]
    config: any
    filters: any
  }

  const { ship, $ship, fleetIdMap, db } = shipData
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
  if (!shipTypes.includes(typeId)) {
    filterCache.set(shipId, false)
    return false
  }

  // Level range filter
  const { minLevel, maxLevel } = filters
  if (lv < Math.min(minLevel, maxLevel) || lv > Math.max(minLevel, maxLevel)) {
    filterCache.set(shipId, false)
    return false
  }

  // Locked filter
  const { lockedRadio } = config
  if (lockedRadio === 1 && locked !== 1) {
    filterCache.set(shipId, false)
    return false
  }
  if (lockedRadio === 2 && locked !== 0) {
    filterCache.set(shipId, false)
    return false
  }

  // Expedition filter
  const { expeditionRadio } = config
  const inExpedition = expeditionShips.includes(shipId)
  if (expeditionRadio === 1 && !inExpedition) {
    filterCache.set(shipId, false)
    return false
  }
  if (expeditionRadio === 2 && inExpedition) {
    filterCache.set(shipId, false)
    return false
  }

  // Modernization filter
  const { modernizationRadio } = config
  if (modernizationRadio === 1 && !isCompleted) {
    filterCache.set(shipId, false)
    return false
  }
  if (modernizationRadio === 2 && isCompleted) {
    filterCache.set(shipId, false)
    return false
  }

  // Remodel filter
  const { remodelRadio } = config
  const remodelable = after !== 0
  if (remodelRadio === 1 && !remodelable) {
    filterCache.set(shipId, false)
    return false
  }
  if (remodelRadio === 2 && remodelable) {
    filterCache.set(shipId, false)
    return false
  }

  // Sally area filter
  const { sallyAreaChecked } = config
  const sallyAreaArray = sallyAreaChecked || []
  const allChecked = sallyAreaArray.reduce(
    (all: boolean, checked: boolean) => all && checked,
    true,
  )
  if (
    !allChecked &&
    !(typeof sallyArea !== 'undefined' ? sallyAreaArray[sallyArea || 0] : true)
  ) {
    filterCache.set(shipId, false)
    return false
  }

  // In fleet filter
  const { inFleetRadio } = config
  const isInFleet = fleetId > -1
  if (inFleetRadio === 1 && !isInFleet) {
    filterCache.set(shipId, false)
    return false
  }
  if (inFleetRadio === 2 && isInFleet) {
    filterCache.set(shipId, false)
    return false
  }

  // Sparkle filter
  const { sparkleRadio } = config
  if (sparkleRadio === 1 && cond < 50) {
    filterCache.set(shipId, false)
    return false
  }
  if (sparkleRadio === 2 && cond >= 50) {
    filterCache.set(shipId, false)
    return false
  }

  // Ex slot filter
  const { exSlotRadio } = config
  if (exSlotRadio === 1 && exslot === 0) {
    filterCache.set(shipId, false)
    return false
  }
  if (exSlotRadio === 2 && exslot !== 0) {
    filterCache.set(shipId, false)
    return false
  }

  // Daihatsu filter
  const { daihatsuRadio } = config
  if (daihatsuRadio === 1 && !daihatsu) {
    filterCache.set(shipId, false)
    return false
  }
  if (daihatsuRadio === 2 && daihatsu) {
    filterCache.set(shipId, false)
    return false
  }

  // Cache the result
  filterCache.set(shipId, true)
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
  height: 100%;
  display: flex;
  align-items: stretch;
`

const Row = styled.div<{ $isEven?: boolean }>`
  display: flex;
  position: absolute;
  width: 100%;
  background-color: ${(props) =>
    props.$isEven ? 'rgba(0, 123, 255, 0.05)' : 'transparent'};
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

// Styled wrapper for row index cells
const RowIndexCellWrapper = styled.div<{ $isHighlighted: boolean }>`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${(props) =>
    props.$isHighlighted ? 'rgba(138, 155, 168, 0.3)' : 'transparent'};
  cursor: default;
`

// Cell wrapper components that subscribe to Jotai atoms
const RowIndexCell: React.FC<{
  rowIndex: number
  onClickCell: (columnIndex: number, rowIndex: number) => void
  onContextMenu: () => void
}> = ({ rowIndex, onClickCell, onContextMenu }) => {
  const activeRow = useAtomValue(activeRowAtom)
  const isHighlighted = activeRow === rowIndex

  return (
    <RowIndexCellWrapper
      $isHighlighted={isHighlighted}
      onClick={() => onClickCell(0, rowIndex)}
      onContextMenu={onContextMenu}
    >
      {rowIndex + 1}
    </RowIndexCellWrapper>
  )
}

// Styled wrapper for cells with highlighting
const CellWrapperDiv = styled.div<{ $isHighlighted: boolean }>`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  background-color: ${(props) =>
    props.$isHighlighted ? 'rgba(138, 155, 168, 0.3)' : 'transparent'};
`

// Wrapper component for cells with highlighting
const CellWrapper: React.FC<{
  columnIndex: number
  rowIndex: number
  onClickCell: (columnIndex: number, rowIndex: number) => void
  onContextMenu: () => void
  children: React.ReactNode
}> = ({ columnIndex, rowIndex, onClickCell, onContextMenu, children }) => {
  const activeRow = useAtomValue(activeRowAtom)
  const activeColumn = useAtomValue(activeColumnAtom)
  const isHighlighted = activeColumn === columnIndex || activeRow === rowIndex

  return (
    <CellWrapperDiv
      role="gridcell"
      tabIndex={0}
      $isHighlighted={isHighlighted}
      onClick={() => onClickCell(columnIndex, rowIndex)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClickCell(columnIndex, rowIndex)
        }
      }}
      onContextMenu={onContextMenu}
    >
      {children}
    </CellWrapperDiv>
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

  // Sync Redux filter data to Jotai atoms
  const setFilterShipTypes = useSetAtom(filterShipTypesAtom)
  const setFilterExpeditionShips = useSetAtom(filterExpeditionShipsAtom)
  const setFilterConfig = useSetAtom(filterConfigAtom)
  const setFilterSettings = useSetAtom(filterSettingsAtom)

  useEffect(() => {
    filterCache.clear()
    setFilterShipTypes(shipTypes)
    setFilterExpeditionShips(expeditionShips)
    setFilterConfig(filterConfig)
    setFilterSettings(filterSettings)
  }, [
    shipTypes,
    expeditionShips,
    filterConfig,
    filterSettings,
    setFilterShipTypes,
    setFilterExpeditionShips,
    setFilterConfig,
    setFilterSettings,
  ])

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

  // Use Jotai atom for global filter (read-only, derived from other atoms)
  const globalFilterValue = useAtomValue(globalFilterAtom)

  // Define columns with row index column and highlighting wrappers
  const columns = useMemo<ColumnDef<TableRow>[]>(() => {
    // Row index column
    const rowIndexColumn: ColumnDef<TableRow> = {
      id: 'rowIndex',
      header: () => <div />,
      accessorFn: (row) => row.index,
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

    // Wrap data columns with title headers and highlighting
    const wrappedColumns = dataColumns.map((col, index) => {
      const columnId = col.id as string
      const meta = col.meta as any
      const originalCell = col.cell

      return {
        ...col,
        header: () => (
          <TitleCell
            title={meta?.title || ''}
            sortable={meta?.sortable !== false}
            centerAlign={meta?.center || false}
            sorting={sortName === columnId}
            up={Boolean(sortOrder)}
            onClick={() =>
              meta?.sortable !== false && handleClickTitle(columnId)
            }
          />
        ),
        cell: (props: any) => (
          <CellWrapper
            columnIndex={index + 1}
            rowIndex={props.row.index}
            onClickCell={onClickCell}
            onContextMenu={onContextMenu}
          >
            {typeof originalCell === 'function' ? originalCell(props) : null}
          </CellWrapper>
        ),
        size: meta?.width || 100,
      }
    })

    return [rowIndexColumn, ...wrappedColumns] as ColumnDef<TableRow>[]
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
    onGlobalFilterChange: () => {
      // Global filter is managed by Jotai atoms
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    globalFilterFn,
    enableFilters: true,
    enableGlobalFilter: true,
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
                $isEven={virtualRow.index % 2 === 0}
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
  lodashGet(state.config, 'plugin.ShipInfo.sortName', 'lv')

const sortOrderSelector = (state: ReduxState): number =>
  lodashGet(state.config, 'plugin.ShipInfo.sortOrder', 0)

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
