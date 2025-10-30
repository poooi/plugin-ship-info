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

  console.log(`[Filter Check] Row ${shipId} - Column ${columnId}`)

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

  console.log(`[Filter] Ship ${shipId} (${$ship.api_name}):`, {
    typeId,
    lv,
    locked,
    fleetId,
    cond,
    sallyArea,
    exslot,
  })

  // Type filter
  const typePass = shipTypes.includes(typeId)
  console.log(
    `  Type filter: typeId=${typeId}, allowed=${shipTypes}, pass=${typePass}`,
  )
  if (!typePass) {
    console.log(`  ❌ FILTERED OUT by type`)
    filterCache.set(shipId, false)
    return false
  }

  // Level range filter
  const { minLevel, maxLevel } = filters
  const levelPass =
    lv >= Math.min(minLevel, maxLevel) && lv <= Math.max(minLevel, maxLevel)
  console.log(
    `  Level filter: lv=${lv}, range=[${minLevel},${maxLevel}], pass=${levelPass}`,
  )
  if (!levelPass) {
    console.log(`  ❌ FILTERED OUT by level`)
    filterCache.set(shipId, false)
    return false
  }

  // Locked filter
  const { lockedRadio } = config
  const lockedPass = !(
    (lockedRadio === 1 && locked !== 1) ||
    (lockedRadio === 2 && locked !== 0)
  )
  console.log(
    `  Locked filter: locked=${locked}, radio=${lockedRadio}, pass=${lockedPass}`,
  )
  if (!lockedPass) {
    console.log(`  ❌ FILTERED OUT by lock`)
    filterCache.set(shipId, false)
    return false
  }

  // Expedition filter
  const { expeditionRadio } = config
  const inExpedition = expeditionShips.includes(shipId)
  const expeditionPass = !(
    (expeditionRadio === 1 && !inExpedition) ||
    (expeditionRadio === 2 && inExpedition)
  )
  console.log(
    `  Expedition filter: inExpedition=${inExpedition}, radio=${expeditionRadio}, pass=${expeditionPass}`,
  )
  if (!expeditionPass) {
    console.log(`  ❌ FILTERED OUT by expedition`)
    filterCache.set(shipId, false)
    return false
  }

  // Modernization filter
  const { modernizationRadio } = config
  const modernizationPass = !(
    (modernizationRadio === 1 && !isCompleted) ||
    (modernizationRadio === 2 && isCompleted)
  )
  console.log(
    `  Modernization filter: isCompleted=${isCompleted}, radio=${modernizationRadio}, pass=${modernizationPass}`,
  )
  if (!modernizationPass) {
    console.log(`  ❌ FILTERED OUT by modernization`)
    filterCache.set(shipId, false)
    return false
  }

  // Remodel filter
  const { remodelRadio } = config
  const remodelable = after !== 0
  const remodelPass = !(
    (remodelRadio === 1 && !remodelable) ||
    (remodelRadio === 2 && remodelable)
  )
  console.log(
    `  Remodel filter: remodelable=${remodelable}, radio=${remodelRadio}, pass=${remodelPass}`,
  )
  if (!remodelPass) {
    console.log(`  ❌ FILTERED OUT by remodel`)
    filterCache.set(shipId, false)
    return false
  }

  // Sally area filter
  const { sallyAreaChecked } = config
  // Use empty array as fallback - empty array reduces to true (show all ships)
  const sallyAreaArray = sallyAreaChecked || []
  const allChecked = sallyAreaArray.reduce(
    (all: boolean, checked: boolean) => all && checked,
    true,
  )
  const sallyPass =
    allChecked ||
    (typeof sallyArea !== 'undefined' ? sallyAreaArray[sallyArea || 0] : true)
  console.log(
    `  Sally area filter: sallyArea=${sallyArea}, checked=${
      sallyAreaArray[sallyArea || 0]
    }, allChecked=${allChecked}, sallyAreaChecked=${JSON.stringify(
      sallyAreaChecked,
    )}, pass=${sallyPass}`,
  )
  if (!sallyPass) {
    console.log(`  ❌ FILTERED OUT by sally area`)
    filterCache.set(shipId, false)
    return false
  }

  // In fleet filter
  const { inFleetRadio } = config
  const isInFleet = fleetId > -1
  const inFleetPass = !(
    (inFleetRadio === 1 && !isInFleet) ||
    (inFleetRadio === 2 && isInFleet)
  )
  console.log(
    `  In fleet filter: isInFleet=${isInFleet}, radio=${inFleetRadio}, pass=${inFleetPass}`,
  )
  if (!inFleetPass) {
    console.log(`  ❌ FILTERED OUT by in fleet`)
    filterCache.set(shipId, false)
    return false
  }

  // Sparkle filter
  const { sparkleRadio } = config
  const sparklePass = !(
    (sparkleRadio === 1 && cond < 50) ||
    (sparkleRadio === 2 && cond >= 50)
  )
  console.log(
    `  Sparkle filter: cond=${cond}, radio=${sparkleRadio}, pass=${sparklePass}`,
  )
  if (!sparklePass) {
    console.log(`  ❌ FILTERED OUT by sparkle`)
    filterCache.set(shipId, false)
    return false
  }

  // Ex slot filter
  const { exSlotRadio } = config
  const exSlotPass = !(
    (exSlotRadio === 1 && exslot === 0) ||
    (exSlotRadio === 2 && exslot !== 0)
  )
  console.log(
    `  Ex slot filter: exslot=${exslot}, radio=${exSlotRadio}, pass=${exSlotPass}`,
  )
  if (!exSlotPass) {
    console.log(`  ❌ FILTERED OUT by ex slot`)
    filterCache.set(shipId, false)
    return false
  }

  // Daihatsu filter
  const { daihatsuRadio } = config
  const daihatsuPass = !(
    (daihatsuRadio === 1 && !daihatsu) ||
    (daihatsuRadio === 2 && daihatsu)
  )
  console.log(
    `  Daihatsu filter: daihatsu=${daihatsu}, radio=${daihatsuRadio}, pass=${daihatsuPass}`,
  )
  if (!daihatsuPass) {
    console.log(`  ❌ FILTERED OUT by daihatsu`)
    filterCache.set(shipId, false)
    return false
  }

  console.log(`  ✅ PASSED all filters`)

  // Cache the result
  filterCache.set(shipId, true)
  return true
}

// Clear filter cache when filter values change
let lastFilterValue: any = null

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

  // Sync Redux filter data to Jotai atoms
  const setFilterShipTypes = useSetAtom(filterShipTypesAtom)
  const setFilterExpeditionShips = useSetAtom(filterExpeditionShipsAtom)
  const setFilterConfig = useSetAtom(filterConfigAtom)
  const setFilterSettings = useSetAtom(filterSettingsAtom)

  useEffect(() => {
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

  // Clear filter cache when filter value changes
  useEffect(() => {
    if (globalFilterValue !== lastFilterValue) {
      filterCache.clear()
      lastFilterValue = globalFilterValue
      console.log('[Filter] Cache cleared due to filter value change')
    }
  }, [globalFilterValue])

  // Define columns using ColumnsConfig
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

    // Data columns from ColumnsConfig
    const dataColumns: ColumnDef<TableRow>[] = ColumnsConfig.map(
      (config, index) => ({
        id: config.name,
        accessorFn: config.accessorFn,
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
