import React, { HTMLAttributes } from 'react'
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

const TitleLabel = styled.span`
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 20px;
`

const SortIndicator = styled.span<{ $up: boolean }>`
  position: absolute;
  left: 50%;
  width: 0;
  height: 0;
  border-left: 3px solid transparent;
  border-right: 3px solid transparent;
  border-bottom: ${(props) =>
    props.$up ? '4px solid currentColor' : '0'};
  border-top: ${(props) =>
    props.$up ? '0' : '4px solid currentColor'};
  line-height: 0;
  pointer-events: none;
  transform: translateX(-50%);
  ${(props) => (props.$up ? 'top: 2px;' : 'bottom: 2px;')}
`

const TitleCellContainer = styled.div<{
  $centerAlign: boolean
  $sortable: boolean
}>`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: ${(props) => (props.$centerAlign ? 'center' : 'flex-start')};
  width: 100%;
  height: 100%;
  min-width: 0;
  white-space: nowrap;
  text-align: ${(props) => props.$centerAlign && 'center'};
  cursor: ${(props) => props.$sortable && 'pointer'};
  line-height: 20px;
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
    >
      <TitleLabel data-title-label="">{t(title)}</TitleLabel>
      {sortable && sorting && (
        <SortIndicator
          data-sort-indicator=""
          $up={up}
          aria-hidden="true"
        />
      )}
    </TitleCellContainer>
  )
}
