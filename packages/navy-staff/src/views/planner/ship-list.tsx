import { Button, Checkbox, HTMLSelect } from '@blueprintjs/core'
import { rgba } from 'polished'
import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

import { shipSuperTypeMap } from '@poi-plugins/ship-info-shared/ship-types'
import type { WorkspaceAreaView, WorkspaceShipRow } from '../workspace/selectors'
import { ActualSortieTag } from './actual-sortie-tag'
import { FleetBadge } from './fleet-badge'
import { resolveAreaLabel } from './types'

// Sentinel target value for the explicit "Remove assignment" choice. The empty
// string is the safe default ("Choose destination") and never mutates.
export const REMOVE_TARGET = '__remove__'

/**
 * Presentation order for the list: level descending, null levels last, then
 * owned id descending (matching the grid). Assignment state never affects order.
 */
export const sortShipRows = (
  rows: readonly WorkspaceShipRow[],
): WorkspaceShipRow[] =>
  [...rows].sort((a, b) => {
    if (a.level === null && b.level === null) return b.ownedId - a.ownedId
    if (a.level === null) return 1
    if (b.level === null) return -1
    if (a.level !== b.level) return b.level - a.level
    return b.ownedId - a.ownedId
  })

// Batch controls fill their own wrapping row inside the sticky Palette so they
// stay in view while the list scrolls.
const BatchBar = styled.div`
  display: flex;
  flex: 1 1 100%;
  align-items: center;
  gap: 0.5em;
  flex-wrap: wrap;
`

const Rows = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

// Whole-row selection only. Clicking a row never edits the plan. Blueprint's
// control indicator is floated by default; flex it in so the checkbox and the
// row content share one baseline. Assigned rows get a subtle theme-aware tint
// that stays distinct from the hover state.
const Row = styled(Checkbox)<{ $assigned: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5em;
  margin: 0;
  padding: 4px 6px;
  border-radius: 4px;
  background: ${(props) =>
    props.$assigned
      ? rgba(props.theme.COBALT3, props.theme.variant === 'dark' ? 0.18 : 0.1)
      : 'transparent'};
  transition: background-color 120ms ease;

  .bp6-control-indicator {
    float: none;
    margin: 0;
    flex: none;
  }

  &:hover {
    background: ${(props) =>
      rgba(props.theme.COBALT3, props.theme.variant === 'dark' ? 0.26 : 0.16)};
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
  display: inline-flex;
  align-items: center;
  gap: 0.3em;
  flex: 0 1 auto;
  min-width: 0;
  max-width: 45%;
  font-size: 0.85em;
`

const AreaColor = styled.span<{ $color: string }>`
  display: inline-block;
  flex: none;
  width: 0.75em;
  height: 0.75em;
  border-radius: 2px;
  background: ${(props) => props.$color};
`

const AreaLabel = styled.span`
  min-width: 0;
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
  selected: Set<number>
  onToggle: (shipId: number) => void
}

export interface ShipListControlsProps {
  areas: WorkspaceAreaView[]
  displayFleetName: boolean
  target: string
  onTargetChange: (value: string) => void
  selected: Set<number>
  onSelectAll: () => void
  onClear: () => void
  onApply: () => void
}

// Selection + batch assignment controls. Rendered inside the sticky Palette so
// they stay reachable while the list scrolls; the parent gates them on the
// editable state, so history stays free of editing controls.
export const ShipListControls = ({
  areas,
  displayFleetName,
  target,
  onTargetChange,
  selected,
  onSelectAll,
  onClear,
  onApply,
}: ShipListControlsProps) => {
  const { t } = useTranslation(['poi-plugin-navy-staff', 'resources'])

  return (
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
  )
}

// Row presentation only: the parent owns the sticky wrapper and batch controls.
export const ShipList = ({
  ships,
  areas,
  displayFleetName,
  readOnly,
  selected,
  onToggle,
}: ShipListProps) => {
  const { t } = useTranslation(['poi-plugin-navy-staff', 'resources'])
  const sortedShips = useMemo(() => sortShipRows(ships), [ships])

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
    <Rows>
      {sortedShips.map((row) => (
        <Row
          key={row.ownedId}
          $assigned={row.assignedColor !== null}
          checked={selected.has(row.ownedId)}
          data-assigned={row.assignedColor !== null ? 'true' : 'false'}
          disabled={readOnly}
          onChange={() => onToggle(row.ownedId)}
          labelElement={
            <RowContent>
              <FleetBadge fleetId={row.fleetId} />
              <ShipName>{nameFor(row)}</ShipName>
              <Meta>Lv.{row.level ?? '?'}</Meta>
              <Meta>{typeFor(row)}</Meta>
              <AreaMeta>
                {row.assignedColor !== null && (
                  <AreaColor
                    $color={row.assignedColor}
                    aria-hidden
                    data-testid="ship-list-area-color"
                  />
                )}
                <AreaLabel>{labelFor(row)}</AreaLabel>
              </AreaMeta>
              <ActualSortieTag actualTag={row.actualTag} translated={displayFleetName} />
            </RowContent>
          }
        />
      ))}
    </Rows>
  )
}
