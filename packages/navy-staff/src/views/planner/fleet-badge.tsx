import React from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

import { FleetIcon } from '@poi-plugins/shared/ui/fleet-icon'

const Badge = styled.span`
  display: inline-flex;
  flex: none;
  align-self: center;
  align-items: center;
`

export interface FleetBadgeProps {
  /** Zero-based live fleet id; negative (history/captured) renders nothing. */
  fleetId: number
  size?: string
}

// Shared FleetIcon carries no accessible name, so this navy-local wrapper adds
// the localized, one-based "Fleet N" label for every planning view.
export const FleetBadge = ({ fleetId, size }: FleetBadgeProps) => {
  const { t } = useTranslation('poi-plugin-navy-staff')
  if (fleetId < 0 || fleetId > 3) return null
  const label = t('Fleet {{number}}', { number: fleetId + 1 })
  return (
    <Badge role="img" aria-label={label} title={label}>
      <FleetIcon fleetId={fleetId} size={size} />
    </Badge>
  )
}
