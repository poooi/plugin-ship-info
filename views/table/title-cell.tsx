import cls from 'classnames'
import React, { HTMLAttributes } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

export interface ITitleCellProps extends HTMLAttributes<HTMLDivElement> {
  title: string
  sortable: boolean
  handleClickTitle?: () => void
  centerAlign: boolean
  sorting: boolean
}

export const noop = (): void => {
  /* do nothing */
}

const TitleCellContainer = styled.div<Partial<ITitleCellProps>>`
  text-align: ${props => props.centerAlign && 'center'};
  cursor: ${props => props.sortable && 'pointer'};
  background-color: ${props => props.sorting && props.theme.BLUE1};
  line-height: 35px;
`

export const TitleCell = ({
  title,
  sortable,
  handleClickTitle,
  ...props
}: ITitleCellProps) => {
  const { t } = useTranslation(['poi-plugin-ship-info'])
  return (
    <TitleCellContainer
      role="button"
      tabIndex={0}
      onClick={sortable ? handleClickTitle : noop}
      {...props}
    >
      {t(title)}
    </TitleCellContainer>
  )
}
