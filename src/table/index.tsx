import React, { useMemo, FunctionComponent } from 'react'
import { useTable, useBlockLayout } from 'react-table'

import { APIShip } from 'kcsapi/api_port/port/response'

import { getColumns } from './get-columns'

interface TableProps {
  ships: APIShip[]
  shipsMeta: any
}

export const Table: FunctionComponent<TableProps> = ({ ships, shipsMeta }) => {
  const columns = useMemo(() => getColumns(), [])

  const {
    getTableProps,
    getTableBodyProps,
    rows,
    prepareRow,
    headers,
  } = useTable(
    {
      data: ships,
      columns,
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
