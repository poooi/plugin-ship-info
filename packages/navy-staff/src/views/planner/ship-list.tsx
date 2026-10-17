import { Button, Checkbox, HTMLSelect } from '@blueprintjs/core'
import React from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

import { shipSuperTypeMap } from '@poi-plugins/ship-info-shared/ship-types'
import type { WorkspaceAreaView, WorkspaceShipRow } from '../workspace/selectors'
import { resolveAreaLabel } from './types'

// Sentinel target value for the explicit "Remove assignment" choice. The empty
// string is the safe default ("Choose destination") and never mutates.
export const REMOVE_TARGET = '__remove__'

const BatchBar = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5em;
  flex-wrap: wrap;
  margin-bottom: 0.5em;
`

const Rows = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

// Whole-row selection only. Clicking a row never edits the plan. Blueprint's
// control indicator is floated by default; flex it in so the checkbox and the
// row content share one baseline.
const Row = styled(Checkbox)`
  display: flex;
  align-items: center;
  gap: 0.5em;
  margin: 0;
  padding: 4px 6px;
  border-radius: 4px;

  .bp6-control-indicator {
    float: none;
    margin: 0;
    flex: none;
  }

  &:hover {
    background: rgba(128, 128, 128, 0.1);
  }
`

const RowContent = styled.span`
  display: flex;
  align-items: center;
  gap: 0.75em;
  flex: 1;
  min-width: 0;
`

const ShipName = styled.span`
  flex: 1 1 auto;
  min-width: 0;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const Meta = styled.span`
  flex: none;
  font-size: 0.85em;
  opacity: 0.8;
  white-space: nowrap;
`

const AreaMeta = styled.span`
  flex: 0 1 auto;
  min-width: 0;
  max-width: 45%;
  font-size: 0.85em;
  opacity: 0.8;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export interface ShipListProps {
  ships: WorkspaceShipRow[]
  areas: WorkspaceAreaView[]
  displayFleetName: boolean
  readOnly: boolean
  target: string
  onTargetChange: (value: string) => void
  selected: Set<number>
  onToggle: (shipId: number) => void
  onSelectAll: () => void
  onClear: () => void
  onApply: () => void
}

export const ShipList = ({
  ships,
  areas,
  displayFleetName,
  readOnly,
  target,
  onTargetChange,
  selected,
  onToggle,
  onSelectAll,
  onClear,
  onApply,
}: ShipListProps) => {
  const { t } = useTranslation(['poi-plugin-navy-staff', 'resources'])

  const labelFor = (row: WorkspaceShipRow): string => {
    const area = areas.find((candidate) =>
      candidate.ships.some((ship) => ship.ownedId === row.ownedId),
    )
    return area ? resolveAreaLabel(area, displayFleetName) : t('Unassigned')
  }

  const typeFor = (row: WorkspaceShipRow): string => {
    const group = shipSuperTypeMap[row.superTypeIndex]
    return group ? t(group.name) : t('Unknown type')
  }

  const nameFor = (row: WorkspaceShipRow): string =>
    row.live ? t(row.name ?? '', { ns: 'resources' }) : row.name ?? `#${row.ownedId}`

  return (
    <div data-testid="ship-list">
      {!readOnly && (
        <BatchBar>
          <Meta>{t('Selected {{count}}', { count: selected.size })}</Meta>
          <Button small text={t('Select all matching')} onClick={onSelectAll} />
          <Button small text={t('Clear selection')} disabled={selected.size === 0} onClick={onClear} />
          <HTMLSelect
            aria-label={t('Assign to')}
            value={target}
            onChange={(event) => onTargetChange(event.currentTarget.value)}
          >
            <option value="">{t('Choose destination')}</option>
            <option value={REMOVE_TARGET}>{t('Remove assignment')}</option>
            {areas.map((area) => (
              <option key={area.id} value={area.id}>
                {resolveAreaLabel(area, displayFleetName)}
              </option>
            ))}
          </HTMLSelect>
          <Button
            small
            intent="primary"
            text={t('Apply to selected')}
            disabled={selected.size === 0 || target === ''}
            onClick={onApply}
          />
        </BatchBar>
      )}
      <Rows>
        {ships.map((row) => (
          <Row
            key={row.ownedId}
            checked={selected.has(row.ownedId)}
            disabled={readOnly}
            onChange={() => onToggle(row.ownedId)}
            labelElement={
              <RowContent>
                <ShipName>{nameFor(row)}</ShipName>
                <Meta>Lv.{row.level ?? '?'}</Meta>
                <Meta>{typeFor(row)}</Meta>
                <AreaMeta>{labelFor(row)}</AreaMeta>
              </RowContent>
            }
          />
        ))}
      </Rows>
    </div>
  )
}
