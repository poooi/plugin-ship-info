// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import React from 'react'
import { I18nextProvider } from 'react-i18next'
import { afterEach, describe, expect, it } from 'vitest'

import { createNavyOnlyI18n } from '../preview/i18n'
import { FleetBadge } from '../packages/navy-staff/src/views/planner/fleet-badge'

const i18n = createNavyOnlyI18n('en-US')

const renderBadge = (fleetId: number) =>
  render(
    <I18nextProvider i18n={i18n}>
      <FleetBadge fleetId={fleetId} />
    </I18nextProvider>,
  )

afterEach(cleanup)

describe('FleetBadge', () => {
  it('exposes a one-based localized label for a live fleet', () => {
    renderBadge(0)

    expect(screen.getByRole('img', { name: 'Fleet 1' })).toBeTruthy()
  })

  it('renders nothing for captured or history rows', () => {
    const { container } = renderBadge(-1)

    expect(container.querySelector('[role="img"]')).toBeNull()
  })
})
