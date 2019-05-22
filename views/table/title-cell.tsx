import React, { HTMLAttributes } from 'react'
import FA from 'react-fontawesome'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

export interface ITitleCellProps extends HTMLAttributes<HTMLDivElement> {
  title: string
  sortable: boolean
  centerAlign: boolean
  sorting: boolean
  up: boolean
}

export const noop = (): void => {
  /* do nothing */
}

const TitleCellContainer = styled.div<Partial<ITitleCellProps>>`
  text-align: ${props => props.centerAlign && 'center'};
  cursor: ${props => props.sortable && 'pointer'};
  color: ${props => props.sorting && props.theme.BLUE5};
  line-height: 35px;
`

export const TitleCell = ({
  title,
  sortable,
  onClick,
  sorting,
  up,
  ...props
}: ITitleCellProps) => {
  const { t } = useTranslation(['poi-plugin-ship-info'])
  return (
    <TitleCellContainer
      {...props}
      role="button"
      tabIndex={0}
      onClick={sortable ? onClick : noop}
      sorting={sorting}
      sortable={sortable}
    >
      {t(title)}
      {sorting && <FA name={up ? 'sort-up' : 'sort-down'} />}
    </TitleCellContainer>
  )
}
