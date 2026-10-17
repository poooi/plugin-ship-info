import { Menu, MenuItem, Position, Tag } from '@blueprintjs/core'
import React from 'react'
import FA from 'react-fontawesome'
import { useTranslation } from 'react-i18next'
import { useDispatch } from 'react-redux'
import type { ThunkDispatch } from 'redux-thunk'
import type { Action } from 'redux'
import styled from 'styled-components'
import { Popover } from 'views/components/etc/overlay'
import type { IState } from 'views/utils/selectors'

import { shipTypeLabel } from '@poi-plugins/ship-info-shared/ship-types'
import { assignShip, removeShipFromArea } from '../workspace/actions'
import type { WorkspaceShipRow } from '../workspace/selectors'
import { ActualSortieTag } from './actual-sortie-tag'
import { FleetBadge } from './fleet-badge'
import type { AreaChoice } from './types'

const Chip = styled(Tag)`
  margin: 0;
  max-width: 100%;
`

// The inner text ellipsizes; the full label stays available as a tooltip.
const ChipContent = styled.span`
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
`

interface IProps {
  row: WorkspaceShipRow
  others: AreaChoice[]
  planAreaId: string
  readOnly: boolean
  /** True to prefer translated fleet labels for the live sortie tag. */
  displayFleetName: boolean
}

// The chip already separates name/level with whitespace, so the inline tag needs
// its own small gap; list/grid use their own row gaps.
const ChipActualTag = styled(ActualSortieTag)`
  margin-left: 0.35em;
`

// A saved ship row. There is no automatic reconciliation: the chip never moves
// itself to a live sortie tag, and removing/moving is always explicit. A history
// preview renders the same chip read-only.
export const ShipChip = ({
  row,
  others,
  planAreaId,
  readOnly,
  displayFleetName,
}: IProps) => {
  const dispatch = useDispatch<ThunkDispatch<IState, unknown, Action>>()
  const { t } = useTranslation(['poi-plugin-navy-staff', 'resources'])

  const typeLabel =
    row.typeId !== null
      ? shipTypeLabel(row.typeId, (key) => t(key, { ns: 'poi-plugin-navy-staff' }))
      : ''
  const name = row.live
    ? t(row.name ?? '', { ns: 'resources' })
    : row.name ?? `#${row.ownedId}`
  const label = `${typeLabel}${typeLabel ? ' | ' : ''}${name} Lv.${row.level ?? '?'}`

  return (
    <Chip
      large
      minimal
      title={label}
      interactive={!readOnly}
      onRemove={readOnly ? undefined : () => dispatch(removeShipFromArea(planAreaId, row.ownedId))}
      onContextMenu={
        readOnly ? undefined : () => dispatch(removeShipFromArea(planAreaId, row.ownedId))
      }
    >
      <Popover
        position={Position.TOP}
        hasBackdrop
        disabled={readOnly}
        content={
          <Menu>
            {others.map((area) => (
              <MenuItem
                key={area.id}
                onClick={() => dispatch(assignShip(row.ownedId, area.id))}
                text={
                  <>
                    {t('Move to ')}{' '}
                    <Tag minimal style={{ color: area.color }}>
                      <FA name="tag" />
                      {area.label}
                    </Tag>
                  </>
                }
              />
            ))}
          </Menu>
        }
      >
        <ChipContent>
          {typeLabel}
          {typeLabel ? ' | ' : ''}
          {name} <span>Lv.{row.level ?? '?'}</span>
        </ChipContent>
      </Popover>
      <FleetBadge fleetId={row.fleetId} />
      <ChipActualTag actualTag={row.actualTag} translated={displayFleetName} />
    </Chip>
  )
}
