import { Button } from '@blueprintjs/core'
import React from 'react'
import { useTranslation } from 'react-i18next'
import FA from 'react-fontawesome'
import styled from 'styled-components'
import { Popover } from 'views/components/etc/overlay'

import { ColumnConfig } from './column-config'

const ColumnsContainer = styled.div`
  padding: 20px;
  max-width: 80vw;
  max-height: 80vh;
  overflow: auto;
`

export const Columns = () => {
  const { t } = useTranslation('poi-plugin-ship-info')

  return (
    <Popover
      content={
        <ColumnsContainer>
          <ColumnConfig />
        </ColumnsContainer>
      }
      hasBackdrop
    >
      <Button aria-label={t('Columns')} minimal>
        <FA name="columns" />
      </Button>
    </Popover>
  )
}
