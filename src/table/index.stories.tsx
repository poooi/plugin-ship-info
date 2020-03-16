import React from 'react'
import _, { Dictionary } from 'lodash'
import { UseTableColumnOptions } from 'react-table'
import { APIShip } from 'kcsapi/api_port/port/response'

import { Table } from './index'

import ships from '../mocks/ships.json'
import shipsMeta from '../mocks/ships-meta.json'
import shipTypesMeta from '../mocks/ship-types-meta.json'

export default { title: 'Table' }

const indexedShips = _.keyBy(ships, 'api_id')

const cells: Dictionary<UseTableColumnOptions<APIShip>['Cell']> = {
  tag: ({ cell: { value } }) => <div>{value}</div>,
  equipment: ({ row }) => (
    <div>
      {row.original.api_slot
        .concat(row.original.api_slot_ex)
        .filter(i => i > 0)
        .join(' / ')}
    </div>
  ),
}

export const TableWithData = () => (
  <Table
    cells={cells}
    ships={indexedShips}
    shipsMeta={shipsMeta}
    shipTypesMeta={shipTypesMeta}
  />
)
