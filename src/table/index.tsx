import React, { useMemo, FunctionComponent } from 'react'
import { useTable, useBlockLayout, UseTableColumnOptions } from 'react-table'
import { values, Dictionary } from 'lodash'

import { APIShip } from 'kcsapi/api_port/port/response'
import { APIMstShip, APIMstStype } from 'kcsapi/api_start2/getData/response'

import { getColumns } from './get-columns'

interface TableProps {
  ships: PoiData<APIShip>
  shipsMeta: PoiData<APIMstShip>
  shipTypesMeta: PoiData<APIMstStype>
  cells: Dictionary<UseTableColumnOptions<APIShip>['Cell']>
}

const getRowId = (row: APIShip) => String(row.api_id)

export const Table: FunctionComponent<TableProps> = ({
  ships,
  shipsMeta,
  shipTypesMeta,
  cells,
}) => {
  const columns = useMemo(
    () => getColumns({ shipsMeta, shipTypesMeta, cells }),
    [shipsMeta, shipTypesMeta],
  )

  const data = useMemo(() => values(ships), [ships])

  const {
    getTableProps,
    getTableBodyProps,
    rows,
    prepareRow,
    headers,
  } = useTable(
    {
      data,
      columns,
      getRowId,
    },
    useBlockLayout,
  )

  return (
    <div {...getTableProps()}>
      <div>
        {headers.map(column => (
          <div {...column.getHeaderProps()}>{column.render('Header')}</div>
        ))}
      </div>
      <div {...getTableBodyProps()}>
        {rows.map(row => {
          prepareRow(row)
          return (
            <div {...row.getRowProps()}>
              {row.cells.map(cell => (
                <div {...cell.getCellProps()}>{cell.render('Cell')}</div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
