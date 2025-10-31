import React from 'react'
import { createColumnHelper, ColumnDef } from '@tanstack/react-table'
import { connect } from 'react-redux'
import type { IShipRawData } from './cells'
import * as CellComponents from './cells'
import { enableAvatarConfigSelector } from './cells'

export interface TableRow {
  id: number
  shipData: IShipRawData
  index: number
}

// Helper function for katakana to hiragana conversion
const katakanaToHiragana = (str: string) => {
  return str.replace(/[\u30a1-\u30f6]/g, (match) => {
    const chr = match.charCodeAt(0) - 0x60
    return String.fromCharCode(chr)
  })
}

// Create column helper
const columnHelper = createColumnHelper<TableRow>()

// Connected Name component
const ConnectedName = connect((state) => ({
  enableAvatar: enableAvatarConfigSelector(state),
}))(CellComponents.Name)

// Export column metadata for use in column configuration
export const getColumnTitle = (columnId: string): string => {
  const column = columns.find((col) => col.id === columnId)
  return (column?.meta as any)?.title || columnId
}

export const columns: ColumnDef<TableRow, any>[] = [
  columnHelper.accessor((row) => row.shipData.ship.api_id, {
    id: 'id',
    meta: { title: 'ID', width: 50, center: false, sortable: true },
    cell: ({ row }) => <CellComponents.Id shipData={row.original.shipData} />,
    sortingFn: (rowA, rowB) =>
      rowA.original.shipData.ship.api_id - rowB.original.shipData.ship.api_id,
  }),

  columnHelper.accessor((row) => row.shipData.$ship.api_name, {
    id: 'name',
    meta: { title: 'Name', width: 220, center: false, sortable: true },
    cell: ({ row }) => <ConnectedName shipData={row.original.shipData} />,
    sortingFn: (rowA, rowB) => {
      const dataA = rowA.original.shipData
      const dataB = rowB.original.shipData
      const yomiA = katakanaToHiragana(dataA.$ship.api_yomi)
      const yomiB = katakanaToHiragana(dataB.$ship.api_yomi)
      if (yomiA !== yomiB) return yomiA.localeCompare(yomiB)
      if (dataA.ship.api_lv !== dataB.ship.api_lv) {
        return dataA.ship.api_lv - dataB.ship.api_lv
      }
      return dataB.ship.api_id - dataA.ship.api_id
    },
  }),

  columnHelper.accessor((row) => row.shipData.$ship.api_stype, {
    id: 'type',
    meta: { title: 'Class', width: 90, center: false, sortable: true },
    cell: ({ row }) => <CellComponents.Type shipData={row.original.shipData} />,
    sortingFn: (rowA, rowB) => {
      const dataA = rowA.original.shipData
      const dataB = rowB.original.shipData
      if (dataA.$ship.api_stype !== dataB.$ship.api_stype) {
        return dataA.$ship.api_stype - dataB.$ship.api_stype
      }
      if (dataA.$ship.api_sortno !== dataB.$ship.api_sortno) {
        return (dataB.$ship.api_sortno || 0) - (dataA.$ship.api_sortno || 0)
      }
      if (dataA.ship.api_lv !== dataB.ship.api_lv) {
        return dataA.ship.api_lv - dataB.ship.api_lv
      }
      return dataB.ship.api_id - dataA.ship.api_id
    },
  }),

  columnHelper.accessor((row) => row.shipData.ship.api_soku, {
    id: 'soku',
    meta: { title: 'Speed', width: 40, center: false, sortable: true },
    cell: ({ row }) => <CellComponents.Soku shipData={row.original.shipData} />,
    sortingFn: (rowA, rowB) => {
      const valueA = rowA.original.shipData.ship.api_soku
      const valueB = rowB.original.shipData.ship.api_soku
      return (valueA || 0) - (valueB || 0)
    },
  }),

  columnHelper.accessor((row) => row.shipData.ship.api_lv, {
    id: 'lv',
    meta: { title: 'Level', width: 40, center: true, sortable: true },
    cell: ({ row }) => <CellComponents.Lv shipData={row.original.shipData} />,
    sortingFn: (rowA, rowB) => {
      const dataA = rowA.original.shipData
      const dataB = rowB.original.shipData
      if (dataA.ship.api_lv !== dataB.ship.api_lv) {
        return dataA.ship.api_lv - dataB.ship.api_lv
      }
      if (dataA.$ship.api_sortno !== dataB.$ship.api_sortno) {
        return (dataB.$ship.api_sortno || 0) - (dataA.$ship.api_sortno || 0)
      }
      return dataB.ship.api_id - dataA.ship.api_id
    },
  }),

  columnHelper.accessor((row) => row.shipData.ship.api_cond, {
    id: 'cond',
    meta: { title: 'Cond', width: 40, center: true, sortable: true },
    cell: ({ row }) => <CellComponents.Cond shipData={row.original.shipData} />,
    sortingFn: (rowA, rowB) => {
      const valueA = rowA.original.shipData.ship.api_cond
      const valueB = rowB.original.shipData.ship.api_cond
      return (valueA || 0) - (valueB || 0)
    },
  }),

  columnHelper.accessor((row) => row.shipData.ship.api_maxhp, {
    id: 'hp',
    meta: { title: 'HP', width: 40, center: true, sortable: true },
    cell: ({ row }) => <CellComponents.Hp shipData={row.original.shipData} />,
    sortingFn: (rowA, rowB) =>
      rowA.original.shipData.ship.api_maxhp -
      rowB.original.shipData.ship.api_maxhp,
  }),

  columnHelper.accessor(
    (row) => {
      const value = row.shipData.ship.api_karyoku
      return Array.isArray(value) ? value[0] : value
    },
    {
      id: 'karyoku',
      meta: { title: 'Firepower', width: 60, center: true, sortable: true },
      cell: ({ row }) => (
        <CellComponents.Karyoku shipData={row.original.shipData} />
      ),
      sortingFn: (rowA, rowB) => {
        const valueA = rowA.original.shipData.ship.api_karyoku
        const valueB = rowB.original.shipData.ship.api_karyoku
        const numA = Array.isArray(valueA) ? valueA[0] : valueA
        const numB = Array.isArray(valueB) ? valueB[0] : valueB
        return (numA || 0) - (numB || 0)
      },
    },
  ),

  columnHelper.accessor(
    (row) => {
      const value = row.shipData.ship.api_raisou
      return Array.isArray(value) ? value[0] : value
    },
    {
      id: 'raisou',
      meta: { title: 'Torpedo', width: 60, center: true, sortable: true },
      cell: ({ row }) => (
        <CellComponents.Raisou shipData={row.original.shipData} />
      ),
      sortingFn: (rowA, rowB) => {
        const valueA = rowA.original.shipData.ship.api_raisou
        const valueB = rowB.original.shipData.ship.api_raisou
        const numA = Array.isArray(valueA) ? valueA[0] : valueA
        const numB = Array.isArray(valueB) ? valueB[0] : valueB
        return (numA || 0) - (numB || 0)
      },
    },
  ),

  columnHelper.accessor(
    (row) => {
      const value = row.shipData.ship.api_taiku
      return Array.isArray(value) ? value[0] : value
    },
    {
      id: 'taiku',
      meta: { title: 'AA', width: 60, center: true, sortable: true },
      cell: ({ row }) => (
        <CellComponents.Taiku shipData={row.original.shipData} />
      ),
      sortingFn: (rowA, rowB) => {
        const valueA = rowA.original.shipData.ship.api_taiku
        const valueB = rowB.original.shipData.ship.api_taiku
        const numA = Array.isArray(valueA) ? valueA[0] : valueA
        const numB = Array.isArray(valueB) ? valueB[0] : valueB
        return (numA || 0) - (numB || 0)
      },
    },
  ),

  columnHelper.accessor(
    (row) => {
      const value = row.shipData.ship.api_soukou
      return Array.isArray(value) ? value[0] : value
    },
    {
      id: 'soukou',
      meta: { title: 'Armor', width: 60, center: true, sortable: true },
      cell: ({ row }) => (
        <CellComponents.Soukou shipData={row.original.shipData} />
      ),
      sortingFn: (rowA, rowB) => {
        const valueA = rowA.original.shipData.ship.api_soukou
        const valueB = rowB.original.shipData.ship.api_soukou
        const numA = Array.isArray(valueA) ? valueA[0] : valueA
        const numB = Array.isArray(valueB) ? valueB[0] : valueB
        return (numA || 0) - (numB || 0)
      },
    },
  ),

  columnHelper.accessor(
    (row) => {
      const value = row.shipData.ship.api_lucky
      return Array.isArray(value) ? value[0] : value
    },
    {
      id: 'lucky',
      meta: { title: 'Luck', width: 60, center: true, sortable: true },
      cell: ({ row }) => (
        <CellComponents.Lucky shipData={row.original.shipData} />
      ),
      sortingFn: (rowA, rowB) => {
        const valueA = rowA.original.shipData.ship.api_lucky
        const valueB = rowB.original.shipData.ship.api_lucky
        const numA = Array.isArray(valueA) ? valueA[0] : valueA
        const numB = Array.isArray(valueB) ? valueB[0] : valueB
        return (numA || 0) - (numB || 0)
      },
    },
  ),

  columnHelper.accessor(
    (row) => {
      const value = row.shipData.ship.api_kaihi
      return Array.isArray(value) ? value[0] : value
    },
    {
      id: 'kaihi',
      meta: { title: 'Evasion', width: 40, center: true, sortable: true },
      cell: ({ row }) => (
        <CellComponents.Kaihi shipData={row.original.shipData} />
      ),
      sortingFn: (rowA, rowB) => {
        const valueA = rowA.original.shipData.ship.api_kaihi
        const valueB = rowB.original.shipData.ship.api_kaihi
        const numA = Array.isArray(valueA) ? valueA[0] : valueA
        const numB = Array.isArray(valueB) ? valueB[0] : valueB
        return (numA || 0) - (numB || 0)
      },
    },
  ),

  columnHelper.accessor(
    (row) => {
      const value = row.shipData.ship.api_taisen
      return Array.isArray(value) ? value[0] : value
    },
    {
      id: 'taisen',
      meta: { title: 'ASW', width: 40, center: true, sortable: true },
      cell: ({ row }) => (
        <CellComponents.Taisen shipData={row.original.shipData} />
      ),
      sortingFn: (rowA, rowB) => {
        const valueA = rowA.original.shipData.ship.api_taisen
        const valueB = rowB.original.shipData.ship.api_taisen
        const numA = Array.isArray(valueA) ? valueA[0] : valueA
        const numB = Array.isArray(valueB) ? valueB[0] : valueB
        return (numA || 0) - (numB || 0)
      },
    },
  ),

  columnHelper.accessor(
    (row) => {
      const value = row.shipData.ship.api_sakuteki
      return Array.isArray(value) ? value[0] : value
    },
    {
      id: 'sakuteki',
      meta: { title: 'LOS', width: 40, center: true, sortable: true },
      cell: ({ row }) => (
        <CellComponents.Sakuteki shipData={row.original.shipData} />
      ),
      sortingFn: (rowA, rowB) => {
        const valueA = rowA.original.shipData.ship.api_sakuteki
        const valueB = rowB.original.shipData.ship.api_sakuteki
        const numA = Array.isArray(valueA) ? valueA[0] : valueA
        const numB = Array.isArray(valueB) ? valueB[0] : valueB
        return (numA || 0) - (numB || 0)
      },
    },
  ),

  columnHelper.accessor((row) => row.shipData.ship.api_ndock_time, {
    id: 'repairtime',
    meta: { title: 'Repair', width: 80, center: true, sortable: true },
    cell: ({ row }) => (
      <CellComponents.RepairTime shipData={row.original.shipData} />
    ),
    sortingFn: (rowA, rowB) => {
      const valueA = rowA.original.shipData.ship.api_ndock_time
      const valueB = rowB.original.shipData.ship.api_ndock_time
      return (valueA || 0) - (valueB || 0)
    },
  }),

  columnHelper.accessor((row) => row.shipData.ship.api_slot, {
    id: 'equipment',
    meta: { title: 'Equipment', width: 180, center: false, sortable: false },
    cell: ({ row }) => (
      <CellComponents.Equipment shipData={row.original.shipData} />
    ),
    enableSorting: false,
  }),

  columnHelper.accessor((row) => row.shipData.ship.api_locked, {
    id: 'lock',
    meta: { title: 'Lock', width: 40, center: true, sortable: false },
    cell: ({ row }) => <CellComponents.Lock shipData={row.original.shipData} />,
    enableSorting: false,
  }),
]
