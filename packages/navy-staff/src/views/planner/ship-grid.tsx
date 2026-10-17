import { get } from 'lodash'
import fp from 'lodash/fp'
import React, { forwardRef, Ref } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import type { Action } from 'redux'
import type { ThunkDispatch } from 'redux-thunk'
import styled from 'styled-components'
import type { IState } from 'views/utils/selectors'

import { shipSuperTypeMap } from '@poi-plugins/ship-info-shared/ship-types'
import { assignShip } from '../workspace/actions'
import type { DisplayContent, WorkspaceShipRow } from '../workspace/selectors'
import { DISPLAY_FLEET_NAME_CONFIG } from '../plugin-identity'
import { ShipItem } from './ship-item'
import { resolveAreaLabel } from './types'

// Container-driven grid: tracks fill the available width rather than the
// browser viewport, so a narrow plugin panel gets readable cards instead of a
// fixed column count. `min(160px, 100%)` keeps a very narrow panel from
// overflowing horizontally.
const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(160px, 100%), 1fr));
  gap: 8px;
`

// Modest group heading: keep h2 semantics but match poi's 14px body type
// instead of Blueprint's large default heading size.
const GroupHeading = styled.h2`
  margin: 12px 0 6px;
  font-size: 14px;
  font-weight: 500;
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
    const displayFleetName = useSelector((state: IState) =>
      get(state.config, DISPLAY_FLEET_NAME_CONFIG, false),
    )

    // Resolve each row's assigned area from the display areas, so a card can
    // name its assignment (beyond the colour scrim) without touching the row
    // domain type.
    const areaLabelFor = (row: WorkspaceShipRow): string | null => {
      const area = display.areas.find((candidate) =>
        candidate.ships.some((ship) => ship.ownedId === row.ownedId),
      )
      return area ? resolveAreaLabel(area, displayFleetName) : null
    }

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
            <GroupHeading>{groupLabel(key, (name) => t(name))}</GroupHeading>
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
                    areaLabel={areaLabelFor(row)}
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
