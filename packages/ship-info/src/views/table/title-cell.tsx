import React, { HTMLAttributes } from 'react'
import FA from 'react-fontawesome'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

export interface ITitleCellProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'onClick'> {
  title: string
  sortable: boolean
  centerAlign: boolean
  sorting: boolean
  up: boolean
  onClick?: () => void
}

export const noop = (): void => {
  /* do nothing */
}

const TitleCellContainer = styled.div<{
  $centerAlign: boolean
  $sortable: boolean
  $sorting: boolean
}>`
  text-align: ${props => props.$centerAlign && 'center'};
  cursor: ${props => props.$sortable && 'pointer'};
  color: ${props => props.$sorting && props.theme.BLUE5};
  line-height: 35px;
`

export const TitleCell = ({
  title,
  sortable,
  onClick,
  sorting,
  up,
  centerAlign,
  ...props
}: ITitleCellProps) => {
  const { t } = useTranslation(['poi-plugin-ship-info'])
  return (
    <TitleCellContainer
      {...props}
      role="button"
      tabIndex={0}
      onClick={sortable ? onClick : noop}
      onKeyDown={(event) => {
        if (!sortable) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick?.()
        }
      }}
      $centerAlign={centerAlign}
      $sortable={sortable}
      $sorting={sorting}
    >
      {t(title)}
      {sorting && <FA name={up ? 'sort-up' : 'sort-down'} />}
    </TitleCellContainer>
  )
}
