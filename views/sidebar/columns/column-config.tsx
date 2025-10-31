import { Button, Card, Checkbox, H5 } from '@blueprintjs/core'
import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import styled from 'styled-components'
import {
  columnOrderSelector,
  columnVisibilitySelector,
  columnPinningSelector,
} from '../../selectors'
import { getColumnTitle } from '../../table/columns-config'

const ColumnConfigContainer = styled.div`
  margin-bottom: 20px;
`

const ColumnList = styled.div`
  max-height: 400px;
  overflow-y: auto;
`

const StyledCard = styled(Card)<{ $visible: boolean }>`
  opacity: ${(props) => (props.$visible ? 1 : 0.5)};
  margin-bottom: 8px;
  user-select: none;
  padding: 12px;
  display: flex;
  align-items: center;
`

const CardContent = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
`

const ColumnTitle = styled.span`
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  line-height: 1.5;
`

const CheckboxGroup = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
`

const CheckboxWithLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  user-select: none;
  margin: 0;

  .bp5-control {
    margin-bottom: 0;
    display: flex;
    align-items: center;
  }

  .bp5-control-indicator {
    margin-top: 0;
    margin-bottom: 0;
  }

  > span {
    line-height: 1.5;
    display: flex;
    align-items: center;
  }
`

const ButtonGroup = styled.div`
  display: flex;
  gap: 4px;
  align-items: center;
`

export const ColumnConfig: React.FC = () => {
  const columnOrder = useSelector(columnOrderSelector)
  const columnVisibility = useSelector(columnVisibilitySelector)
  const columnPinning = useSelector(columnPinningSelector)
  const { t } = useTranslation('poi-plugin-ship-info')

  const handleToggleVisibility = useCallback(
    (columnId: string) => {
      const newVisibility = {
        ...columnVisibility,
        [columnId]: !columnVisibility[columnId],
      }
      window.config.set('plugin.ShipInfo.columnVisibility', newVisibility)
    },
    [columnVisibility],
  )

  const handleTogglePin = useCallback(
    (columnId: string) => {
      const leftPins = columnPinning.left || []
      const isPinned = leftPins.includes(columnId)

      const newPinning = {
        ...columnPinning,
        left: isPinned
          ? leftPins.filter((id) => id !== columnId)
          : [...leftPins, columnId],
      }
      window.config.set('plugin.ShipInfo.columnPinning', newPinning)
    },
    [columnPinning],
  )

  const handleMoveUp = useCallback(
    (index: number) => {
      if (index === 0) return
      const newOrder = [...columnOrder]
      const temp = newOrder[index - 1]
      newOrder[index - 1] = newOrder[index]
      newOrder[index] = temp
      window.config.set('plugin.ShipInfo.columnOrder', newOrder)
    },
    [columnOrder],
  )

  const handleMoveDown = useCallback(
    (index: number) => {
      if (index === columnOrder.length - 1) return
      const newOrder = [...columnOrder]
      const temp = newOrder[index + 1]
      newOrder[index + 1] = newOrder[index]
      newOrder[index] = temp
      window.config.set('plugin.ShipInfo.columnOrder', newOrder)
    },
    [columnOrder],
  )

  return (
    <ColumnConfigContainer>
      <H5>{t('Column Configuration')}</H5>
      <ColumnList>
        {columnOrder
          .filter((columnId) => columnId !== 'rowIndex') // Don't show row index in config
          .map((columnId) => {
            const actualIndex = columnOrder.indexOf(columnId)
            const title = getColumnTitle(columnId)
            const isVisible = columnVisibility[columnId] !== false
            const isPinned = (columnPinning.left || []).includes(columnId)
            return (
              <StyledCard key={columnId} $visible={isVisible} elevation={1}>
                <CardContent>
                  <CheckboxGroup>
                    <CheckboxWithLabel>
                      <Checkbox
                        checked={isVisible}
                        onChange={() => handleToggleVisibility(columnId)}
                      />
                      <span>{t('Visible')}</span>
                    </CheckboxWithLabel>
                    <CheckboxWithLabel>
                      <Checkbox
                        checked={isPinned}
                        onChange={() => handleTogglePin(columnId)}
                      />
                      <span>{t('Pin')}</span>
                    </CheckboxWithLabel>
                  </CheckboxGroup>
                  <ColumnTitle>{t(title)}</ColumnTitle>
                  <ButtonGroup>
                    <Button
                      icon="chevron-up"
                      small
                      minimal
                      disabled={actualIndex === 1} // Can't move above rowIndex
                      onClick={() => handleMoveUp(actualIndex)}
                    />
                    <Button
                      icon="chevron-down"
                      small
                      minimal
                      disabled={actualIndex === columnOrder.length - 1}
                      onClick={() => handleMoveDown(actualIndex)}
                    />
                  </ButtonGroup>
                </CardContent>
              </StyledCard>
            )
          })}
      </ColumnList>
    </ColumnConfigContainer>
  )
}
