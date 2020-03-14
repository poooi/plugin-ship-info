import React from 'react'

import { Column } from 'react-table'

import { APIShip } from 'kcsapi/api_port/port/response'

export const getColumns = (): Column<APIShip>[] => [
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
    accessor: row => row.api_ship_id,
  },
  {
    id: 'type',
    Header: 'Class',
    width: 90,
    accessor: row => row.api_ship_id,
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
    accessor: row => row.api_slot.concat(row.api_slot_ex),
  },
  {
    id: 'lock',
    Header: 'Lock',
    width: 40,
    accessor: row => row.api_locked,
  },
]
