import React from 'react'
import { size, concat, filter, Dictionary } from 'lodash'

import { Column, UseTableColumnOptions } from 'react-table'

import { APIShip } from 'kcsapi/api_port/port/response'
import { APIMstShip, APIMstStype } from 'kcsapi/api_start2/getData/response'

interface ColumnDependencies {
  shipsMeta: PoiData<APIMstShip>
  shipTypesMeta: PoiData<APIMstStype>
  cells: Dictionary<UseTableColumnOptions<APIShip>['Cell']>
}

export const getColumns = ({
  shipsMeta,
  shipTypesMeta,
  cells,
}: ColumnDependencies): Column<APIShip>[] => [
  {
    id: 'index',
    Header: 'Index',
    accessor: (_, i) => i,
  },
  {
    id: 'id',
    Header: 'ID',
    width: 50,
    accessor: row => row.api_id,
  },
  {
    id: 'name',
    Header: 'Name',
    width: 220,
    accessor: row => shipsMeta[row.api_ship_id]?.api_name,
  },
  {
    id: 'tag',
    Header: 'Area',
    accessor: row => row.api_sally_area,
    Cell: cells.tag,
  },
  {
    id: 'type',
    Header: 'Class',
    width: 90,
    accessor: row => shipsMeta[row.api_ship_id]?.api_stype,
    Cell: ({ row }) =>
      shipTypesMeta[shipsMeta[row.original.api_ship_id]?.api_stype]?.api_name,
  },
  {
    id: 'speed',
    Header: 'Speed',
    width: 40,
    accessor: row => row.api_soku,
  },
  {
    id: 'lv',
    Header: 'Level',
    width: 40,
    accessor: row => row.api_lv,
  },
  {
    id: 'condition',
    Header: 'Condition',
    width: 40,
    accessor: row => row.api_cond,
  },
  {
    id: 'hp',
    Header: 'HP',
    width: 40,
    accessor: row => row.api_nowhp,
  },
  {
    id: 'firepower',
    Header: 'Firepower',
    width: 60,
    accessor: row => row.api_karyoku[0],
  },
  {
    id: 'torpedo',
    Header: 'Torpedo',
    width: 60,
    accessor: row => row.api_raisou[0],
  },
  {
    id: 'anti-air',
    Header: 'Anti-air',
    width: 60,
    accessor: row => row.api_taiku[0],
  },
  {
    id: 'armor',
    Header: 'Armor',
    width: 60,
    accessor: row => row.api_soukou[0],
  },
  {
    id: 'luck',
    Header: 'Luck',
    width: 60,
    accessor: row => row.api_lucky[0],
  },
  {
    id: 'evasion',
    Header: 'Evasion',
    width: 40,
    accessor: row => row.api_kaihi[0],
  },
  {
    id: 'asw',
    Header: 'ASW',
    width: 40,
    accessor: row => row.api_taisen[0],
  },
  {
    id: 'los',
    Header: 'LOS',
    width: 40,
    accessor: row => row.api_sakuteki[0],
  },
  {
    id: 'repair',
    Header: 'Repair',
    width: 80,
    accessor: row => row.api_ndock_time / 1000,
  },
  {
    id: 'equipment',
    Header: 'Equipment',
    width: 180,
    accessor: row =>
      size(filter(concat(row.api_slot, row.api_slot_ex), i => i > 0)),
    Cell: cells.equipment,
  },
  {
    id: 'lock',
    Header: 'Lock',
    width: 40,
    accessor: row => row.api_locked,
  },
]
