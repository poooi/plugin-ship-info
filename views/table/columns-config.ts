import { SortingFn, AccessorFn } from '@tanstack/react-table'
import type { IShipRawData } from './cells'

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

export const ColumnsConfig: Array<{
  certer: boolean
  name: string
  sortable: boolean
  title: string
  width: number
  sortingFn?: SortingFn<TableRow>
  accessorFn: AccessorFn<TableRow>
}> = [
  {
    certer: false,
    name: 'id',
    sortable: true,
    title: 'ID',
    width: 50,
    accessorFn: (row) => row.shipData.ship.api_id,
    sortingFn: (rowA, rowB) => {
      return (
        rowA.original.shipData.ship.api_id - rowB.original.shipData.ship.api_id
      )
    },
  },
  {
    certer: false,
    name: 'name',
    sortable: true,
    title: 'Name',
    width: 220,
    accessorFn: (row) => row.shipData.$ship.api_name,
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
  },
  {
    certer: false,
    name: 'type',
    sortable: true,
    title: 'Class',
    width: 90,
    accessorFn: (row) => row.shipData.$ship.api_stype,
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
  },
  {
    certer: false,
    name: 'soku',
    sortable: true,
    title: 'Speed',
    width: 40,
    accessorFn: (row) => row.shipData.ship.api_soku,
    sortingFn: (rowA, rowB) => {
      const valueA = rowA.original.shipData.ship.api_soku
      const valueB = rowB.original.shipData.ship.api_soku
      return (valueA || 0) - (valueB || 0)
    },
  },
  {
    certer: true,
    name: 'lv',
    sortable: true,
    title: 'Level',
    width: 40,
    accessorFn: (row) => row.shipData.ship.api_lv,
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
  },
  {
    certer: true,
    name: 'cond',
    sortable: true,
    title: 'Cond',
    width: 40,
    accessorFn: (row) => row.shipData.ship.api_cond,
    sortingFn: (rowA, rowB) => {
      const valueA = rowA.original.shipData.ship.api_cond
      const valueB = rowB.original.shipData.ship.api_cond
      return (valueA || 0) - (valueB || 0)
    },
  },
  {
    certer: true,
    name: 'hp',
    sortable: true,
    title: 'HP',
    width: 40,
    accessorFn: (row) => row.shipData.ship.api_maxhp,
    sortingFn: (rowA, rowB) => {
      return (
        rowA.original.shipData.ship.api_maxhp -
        rowB.original.shipData.ship.api_maxhp
      )
    },
  },
  {
    certer: true,
    name: 'karyoku',
    sortable: true,
    title: 'Firepower',
    width: 60,
    accessorFn: (row) => {
      const value = row.shipData.ship.api_karyoku
      return Array.isArray(value) ? value[0] : value
    },
    sortingFn: (rowA, rowB) => {
      const valueA = rowA.original.shipData.ship.api_karyoku
      const valueB = rowB.original.shipData.ship.api_karyoku
      const numA = Array.isArray(valueA) ? valueA[0] : valueA
      const numB = Array.isArray(valueB) ? valueB[0] : valueB
      return (numA || 0) - (numB || 0)
    },
  },
  {
    certer: true,
    name: 'raisou',
    sortable: true,
    title: 'Torpedo',
    width: 60,
    accessorFn: (row) => {
      const value = row.shipData.ship.api_raisou
      return Array.isArray(value) ? value[0] : value
    },
    sortingFn: (rowA, rowB) => {
      const valueA = rowA.original.shipData.ship.api_raisou
      const valueB = rowB.original.shipData.ship.api_raisou
      const numA = Array.isArray(valueA) ? valueA[0] : valueA
      const numB = Array.isArray(valueB) ? valueB[0] : valueB
      return (numA || 0) - (numB || 0)
    },
  },
  {
    certer: true,
    name: 'taiku',
    sortable: true,
    title: 'AA',
    width: 60,
    accessorFn: (row) => {
      const value = row.shipData.ship.api_taiku
      return Array.isArray(value) ? value[0] : value
    },
    sortingFn: (rowA, rowB) => {
      const valueA = rowA.original.shipData.ship.api_taiku
      const valueB = rowB.original.shipData.ship.api_taiku
      const numA = Array.isArray(valueA) ? valueA[0] : valueA
      const numB = Array.isArray(valueB) ? valueB[0] : valueB
      return (numA || 0) - (numB || 0)
    },
  },
  {
    certer: true,
    name: 'soukou',
    sortable: true,
    title: 'Armor',
    width: 60,
    accessorFn: (row) => {
      const value = row.shipData.ship.api_soukou
      return Array.isArray(value) ? value[0] : value
    },
    sortingFn: (rowA, rowB) => {
      const valueA = rowA.original.shipData.ship.api_soukou
      const valueB = rowB.original.shipData.ship.api_soukou
      const numA = Array.isArray(valueA) ? valueA[0] : valueA
      const numB = Array.isArray(valueB) ? valueB[0] : valueB
      return (numA || 0) - (numB || 0)
    },
  },
  {
    certer: true,
    name: 'lucky',
    sortable: true,
    title: 'Luck',
    width: 60,
    accessorFn: (row) => {
      const value = row.shipData.ship.api_lucky
      return Array.isArray(value) ? value[0] : value
    },
    sortingFn: (rowA, rowB) => {
      const valueA = rowA.original.shipData.ship.api_lucky
      const valueB = rowB.original.shipData.ship.api_lucky
      const numA = Array.isArray(valueA) ? valueA[0] : valueA
      const numB = Array.isArray(valueB) ? valueB[0] : valueB
      return (numA || 0) - (numB || 0)
    },
  },
  {
    certer: true,
    name: 'kaihi',
    sortable: true,
    title: 'Evasion',
    width: 40,
    accessorFn: (row) => {
      const value = row.shipData.ship.api_kaihi
      return Array.isArray(value) ? value[0] : value
    },
    sortingFn: (rowA, rowB) => {
      const valueA = rowA.original.shipData.ship.api_kaihi
      const valueB = rowB.original.shipData.ship.api_kaihi
      const numA = Array.isArray(valueA) ? valueA[0] : valueA
      const numB = Array.isArray(valueB) ? valueB[0] : valueB
      return (numA || 0) - (numB || 0)
    },
  },
  {
    certer: true,
    name: 'taisen',
    sortable: true,
    title: 'ASW',
    width: 40,
    accessorFn: (row) => {
      const value = row.shipData.ship.api_taisen
      return Array.isArray(value) ? value[0] : value
    },
    sortingFn: (rowA, rowB) => {
      const valueA = rowA.original.shipData.ship.api_taisen
      const valueB = rowB.original.shipData.ship.api_taisen
      const numA = Array.isArray(valueA) ? valueA[0] : valueA
      const numB = Array.isArray(valueB) ? valueB[0] : valueB
      return (numA || 0) - (numB || 0)
    },
  },
  {
    certer: true,
    name: 'sakuteki',
    sortable: true,
    title: 'LOS',
    width: 40,
    accessorFn: (row) => {
      const value = row.shipData.ship.api_sakuteki
      return Array.isArray(value) ? value[0] : value
    },
    sortingFn: (rowA, rowB) => {
      const valueA = rowA.original.shipData.ship.api_sakuteki
      const valueB = rowB.original.shipData.ship.api_sakuteki
      const numA = Array.isArray(valueA) ? valueA[0] : valueA
      const numB = Array.isArray(valueB) ? valueB[0] : valueB
      return (numA || 0) - (numB || 0)
    },
  },
  {
    certer: true,
    name: 'repairtime',
    sortable: true,
    title: 'Repair',
    width: 80,
    accessorFn: (row) => row.shipData.ship.api_ndock_time,
    sortingFn: (rowA, rowB) => {
      const valueA = rowA.original.shipData.ship.api_ndock_time
      const valueB = rowB.original.shipData.ship.api_ndock_time
      return (valueA || 0) - (valueB || 0)
    },
  },
  {
    certer: false,
    name: 'equipment',
    sortable: false,
    title: 'Equipment',
    width: 180,
    accessorFn: (row) => row.shipData.ship.api_slot,
  },
  {
    certer: true,
    name: 'lock',
    sortable: false,
    title: 'Lock',
    width: 40,
    accessorFn: (row) => row.shipData.ship.api_locked,
  },
]
