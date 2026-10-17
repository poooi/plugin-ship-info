// Compact, icon-only view switch shared by the Plan surface and the read-only
// Reference view. Each button carries a localized accessible name and tooltip;
// the active button is pressed. Consumers supply the labels because the grid is
// named differently in Plan (Grid Palette) and Reference (Ship Grid).

import { Button, ButtonGroup } from '@blueprintjs/core'
import React from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

export type ViewToggleView = 'area' | 'list' | 'grid'

const VIEWS: ReadonlyArray<{
  view: ViewToggleView
  icon: React.ComponentProps<typeof Button>['icon']
}> = [
  { view: 'area', icon: 'map' },
  { view: 'list', icon: 'list' },
  { view: 'grid', icon: 'grid-view' },
]

const Group = styled(ButtonGroup)`
  flex: none;
`

export interface ViewToggleProps {
  value: ViewToggleView
  onChange: (view: ViewToggleView) => void
  /** Localized accessible name and tooltip for each view. */
  labels: Record<ViewToggleView, string>
  disabled?: boolean
  className?: string
}

export const ViewToggle = ({
  value,
  onChange,
  labels,
  disabled = false,
  className,
}: ViewToggleProps) => {
  const { t } = useTranslation('poi-plugin-navy-staff')
  return (
    <Group
      aria-label={t('View')}
      className={className}
      role="group"
    >
      {VIEWS.map(({ view, icon }) => (
        <Button
          key={view}
          active={value === view}
          aria-label={labels[view]}
          aria-pressed={value === view}
          disabled={disabled}
          icon={icon}
          title={labels[view]}
          onClick={() => onChange(view)}
        />
      ))}
    </Group>
  )
}
