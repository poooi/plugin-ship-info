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
import { FleetIcon } from '@poi-plugins/ship-info-shared/ui/fleet-icon'
import { assignShip, removeShipFromArea } from '../workspace/actions'
import type { WorkspaceShipRow } from '../workspace/selectors'
import type { AreaChoice } from './types'

const Chip = styled(Tag)`
  margin: 0.5ex 1ex;
`

interface IProps {
  row: WorkspaceShipRow
  others: AreaChoice[]
  planAreaId: string
  readOnly: boolean
}

// A saved ship row. There is no automatic reconciliation: the chip never moves
// itself to a live sortie tag, and removing/moving is always explicit. A history
// preview renders the same chip read-only.
export const ShipChip = ({ row, others, planAreaId, readOnly }: IProps) => {
  const dispatch = useDispatch<ThunkDispatch<IState, unknown, Action>>()
  const { t } = useTranslation(['poi-plugin-navy-staff', 'resources'])

  const typeLabel =
    row.typeId !== null
      ? shipTypeLabel(row.typeId, (key) => t(key, { ns: 'poi-plugin-navy-staff' }))
      : ''
  const name = row.live
    ? t(row.name ?? '', { ns: 'resources' })
    : row.name ?? `#${row.ownedId}`

  return (
    <Chip
      minimal
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
        <span>
          {typeLabel}
          {typeLabel ? ' | ' : ''}
          {name} <span>Lv.{row.level ?? '?'}</span>
        </span>
      </Popover>
      <span>{row.fleetId > -1 && <FleetIcon fleetId={row.fleetId} />}</span>
    </Chip>
  )
}
