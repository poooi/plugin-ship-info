import { get } from 'lodash'
import fp from 'lodash/fp'
import React, { forwardRef, Ref } from 'react'
import { useTranslation } from 'react-i18next'
import { connect, useDispatch } from 'react-redux'
import type { Action } from 'redux'
import type { ThunkDispatch } from 'redux-thunk'
import styled from 'styled-components'
import type { IState } from 'views/utils/selectors'

import { shipSuperTypeMap } from '@poi-plugins/ship-info-shared/ship-types'
import { assignShip } from '../workspace/actions'
import {
  assignedColorMapSelector,
  gridRowsSelector,
  type WorkspaceShipRow,
} from '../workspace/selectors'
import { ShipItem } from './ship-item'

const Grid = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
`

interface IProps {
  fill: string | null
  rows: WorkspaceShipRow[]
  assignedColors: Record<number, string>
  useAvatar: boolean
  ip: string
}

const groupLabel = (
  superTypeIndex: number,
  t: (key: string) => string,
): string => {
  const group = shipSuperTypeMap[superTypeIndex]
  return group ? t(group.name) : t('Unknown type')
}

export const ShipGrid = connect(
  (state: IState) => ({
    assignedColors: assignedColorMapSelector(state),
    ip: get(state, 'info.server.ip', '203.104.209.71'),
    rows: gridRowsSelector(state),
    useAvatar: get(state, ['config', 'poi', 'appearance', 'avatar'], true),
  }),
  null,
  null,
  { forwardRef: true },
)(
  forwardRef(
    (
      { fill, rows, assignedColors, useAvatar, ip }: IProps,
      ref: Ref<HTMLDivElement>,
    ) => {
      const dispatch = useDispatch<ThunkDispatch<IState, unknown, Action>>()
      const { t } = useTranslation(['poi-plugin-navy-staff'])

      const grouped = new Map<number, WorkspaceShipRow[]>()
      for (const row of rows) {
        const list = grouped.get(row.superTypeIndex) ?? []
        list.push(row)
        grouped.set(row.superTypeIndex, list)
      }
      // Render every known super-type group (even empty ones) plus an explicit
      // unknown group, so saved ships with a missing type never disappear.
      const keys = shipSuperTypeMap.map((_group, index) => index)
      if (grouped.has(-1)) keys.push(-1)

      // Background reflects the real assignment only. The palette selection
      // changes the click destination, never the displayed assignment.
      const colorFor = (row: WorkspaceShipRow): string =>
        assignedColors[row.ownedId] ?? '#000'

      return (
        <div ref={ref}>
          {keys.map((key) => (
            <div key={key}>
              <h2>{groupLabel(key, (name) => t(name))}</h2>
              <Grid>
                {fp.flow(
                  fp.sortBy([
                    (row: WorkspaceShipRow) => -(row.level ?? 0),
                    (row: WorkspaceShipRow) => -row.ownedId,
                  ]),
                  fp.map((row: WorkspaceShipRow) => (
                    <ShipItem
                      key={row.ownedId}
                      row={row}
                      color={colorFor(row)}
                      useAvatar={useAvatar}
                      ip={ip}
                      onClick={() => dispatch(assignShip(row.ownedId, fill))}
                      onContextmenu={() => dispatch(assignShip(row.ownedId, null))}
                    />
                  )),
                )(grouped.get(key) ?? [])}
              </Grid>
            </div>
          ))}
        </div>
      )
    },
  ),
)
