import fp from 'lodash/fp'
import React, { forwardRef, Ref } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch } from 'react-redux'
import type { Action } from 'redux'
import type { ThunkDispatch } from 'redux-thunk'
import styled from 'styled-components'
import type { IState } from 'views/utils/selectors'

import { shipSuperTypeMap } from '@poi-plugins/ship-info-shared/ship-types'
import { assignShip } from '../workspace/actions'
import type { DisplayContent, WorkspaceShipRow } from '../workspace/selectors'
import { ShipItem } from './ship-item'

const Grid = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
`

interface IProps {
  display: DisplayContent
  fill: string | null
  readOnly: boolean
}

const groupLabel = (
  superTypeIndex: number,
  t: (key: string) => string,
): string => {
  const group = shipSuperTypeMap[superTypeIndex]
  return group ? t(group.name) : t('Unknown type')
}

// Grid rows come from the passed display content, so a history preview shows
// captured ships only while editing can include eligible live-only ships.
export const ShipGrid = forwardRef(
  ({ display, fill, readOnly }: IProps, ref: Ref<HTMLDivElement>) => {
    const dispatch = useDispatch<ThunkDispatch<IState, unknown, Action>>()
    const { t } = useTranslation(['poi-plugin-navy-staff'])

    const rows = display.gridShips
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
                    color={row.assignedColor ?? '#000'}
                    onClick={
                      readOnly
                        ? undefined
                        : () => dispatch(assignShip(row.ownedId, fill))
                    }
                    onContextmenu={
                      readOnly
                        ? undefined
                        : () => dispatch(assignShip(row.ownedId, null))
                    }
                  />
                )),
              )(grouped.get(key) ?? [])}
            </Grid>
          </div>
        ))}
      </div>
    )
  },
)
