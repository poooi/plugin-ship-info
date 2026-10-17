import { Card, Tag } from '@blueprintjs/core'
import { groupBy } from 'lodash'
import fp from 'lodash/fp'
import React from 'react'
import FA from 'react-fontawesome'
import { useTranslation } from 'react-i18next'
import { useDispatch } from 'react-redux'
import type { Action } from 'redux'
import type { ThunkDispatch } from 'redux-thunk'
import styled from 'styled-components'
import type { IState } from 'views/utils/selectors'

import { addShipToArea } from '../workspace/actions'
import type { WorkspaceAreaView } from '../workspace/selectors'
import { AddShip } from './add-ship'
import { ShipChip } from './ship-chip'
import { resolveAreaLabel, type AreaChoice } from './types'

// An area panel. It is not an interactive card: nothing happens when the panel
// body is clicked, so it must not carry card hover/selection affordances.
const Container = styled(Card)`
  padding: 12px;
`

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
`

const Title = styled.h5`
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  flex: 1;
  min-width: 0;
  font-size: 14px;
`

const Count = styled.span`
  flex: none;
  opacity: 0.7;
  font-size: 0.85em;
  font-variant-numeric: tabular-nums;
`

// Each type lane wraps its chips; sibling lanes get breathing room so adjacent
// type groups are not glued together.
const Lane = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;

  & + & {
    margin-top: 8px;
  }
`

const UnknownLabel = styled.div`
  width: 100%;
  font-size: 0.8em;
  opacity: 0.7;
`

interface IProps {
  area: WorkspaceAreaView
  others: AreaChoice[]
  displayFleetName: boolean
  readOnly: boolean
  canAdd: boolean
}

export const Area = ({ area, others, displayFleetName, readOnly, canAdd }: IProps) => {
  const dispatch = useDispatch<ThunkDispatch<IState, unknown, Action>>()
  const { t } = useTranslation('poi-plugin-navy-staff')

  const label = resolveAreaLabel(area, displayFleetName)
  const groups = groupBy(area.ships, (row) => row.superTypeIndex)
  const keys = Object.keys(groups)
    .map(Number)
    .sort((a, b) => (a === -1 ? 1 : b === -1 ? -1 : a - b))

  return (
    <Container>
      <Header>
        <Title>
          <Tag style={{ color: area.color }} minimal>
            <FA name="tag" />
          </Tag>{' '}
          {label}
        </Title>
        <Count>{area.ships.length}</Count>
        {!readOnly && canAdd && (
          <AddShip onSelect={(id) => dispatch(addShipToArea(area.id, id))} />
        )}
      </Header>

      <div>
        {keys.map((key) => (
          <Lane key={key}>
            {key === -1 && <UnknownLabel>{t('Unknown type')}</UnknownLabel>}
            {fp.flow(
              fp.sortBy([
                (row: WorkspaceAreaView['ships'][number]) => -(row.level ?? 0),
                (row: WorkspaceAreaView['ships'][number]) => -row.ownedId,
              ]),
              fp.map((row: WorkspaceAreaView['ships'][number]) => (
                <ShipChip
                  key={row.ownedId}
                  row={row}
                  others={others}
                  planAreaId={area.id}
                  readOnly={readOnly}
                  displayFleetName={displayFleetName}
                />
              )),
            )(groups[key])}
          </Lane>
        ))}
      </div>
    </Container>
  )
}
