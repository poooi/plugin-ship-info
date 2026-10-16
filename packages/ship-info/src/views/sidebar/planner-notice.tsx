import { Button, Classes } from '@blueprintjs/core'
import React, { useState } from 'react'
import FontAwesome from 'react-fontawesome'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'
import { Dialog } from 'views/components/etc/overlay'

// The original sortie-planner entry point, kept in place as a migration notice.
// It owns no planner state and does not touch persistence.

const NoticeDialog = styled(Dialog)`
  width: 60vw;
  max-width: 36em;
`

const Package = styled.code`
  user-select: all;
`

export const PlannerNotice = () => {
  const [isOpen, setIsOpen] = useState(false)
  const { t } = useTranslation('poi-plugin-ship-info')

  return (
    <>
      <Button
        aria-label={t('Deck Planner')}
        minimal
        onClick={() => setIsOpen(true)}
      >
        <FontAwesome name="tags" />
      </Button>
      <NoticeDialog
        isOpen={isOpen}
        autoFocus
        canOutsideClickClose
        onClose={() => setIsOpen(false)}
        title={t('Deck Planner')}
      >
        <div className={Classes.DIALOG_BODY}>
          <p>{t('plannerMovedNotice')}</p>
          <p>{t('plannerMovedInstall')}</p>
          <p>
            {t('plannerManualInstall')}{' '}
            <Package>poi-plugin-navy-staff</Package>
          </p>
        </div>
      </NoticeDialog>
    </>
  )
}
