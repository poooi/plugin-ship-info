// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('views/env-parts/i18next', async () => ({
  default: await (await import('./ui/boundaries')).createI18n(),
}))
vi.mock('views/utils/selectors', async () => (await import('./ui/boundaries')).poiSelectors)
vi.mock('views/components/etc/window-env', async () => (await import('./ui/boundaries')).windowEnvModule)
vi.mock('views/components/etc/overlay', async () => (await import('./ui/boundaries')).overlay)
vi.mock('views/utils/tools', async () => (await import('./ui/boundaries')).toolsModule)
vi.mock('views/utils/ship-img', async () => (await import('./ui/boundaries')).shipImgModule)
vi.mock('wanakana', async () => (await import('./ui/boundaries')).wanakanaModule)
vi.mock('react-fontawesome', async () => (await import('./ui/boundaries')).fontawesomeModule)
vi.mock('redux-observers', async () => (await import('./ui/boundaries')).reduxObserversModule)
vi.mock('electron', async () => (await import('./ui/boundaries')).createElectronModule())
vi.mock('modern-screenshot', () => ({
  domToPng: async () => 'data:image/png;base64,',
}))

import { reactClass as NavyStaff } from '../packages/navy-staff/src/views'
import { plannerState } from './ui/fixtures'
import { createHarness } from './ui/harness'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('Navy Staff navigation and controls', () => {
  it('uses a compact button group with aria-pressed page state, not tabs', () => {
    const harness = createHarness(plannerState())
    harness.render(<NavyStaff />)

    const nav = screen.getByRole('navigation', { name: 'Navy Staff sections' })
    const plan = within(nav).getByRole('button', { name: 'Plan' })
    const reference = within(nav).getByRole('button', { name: 'Reference' })
    const share = within(nav).getByRole('button', { name: 'Share' })

    expect(plan.getAttribute('aria-pressed')).toBe('true')
    expect(reference.getAttribute('aria-pressed')).toBe('false')

    fireEvent.click(reference)
    expect(reference.getAttribute('aria-pressed')).toBe('true')
    expect(plan.getAttribute('aria-pressed')).toBe('false')

    fireEvent.click(share)
    expect(share.getAttribute('aria-pressed')).toBe('true')

    // No underlined page tabs remain.
    expect(screen.queryByRole('tab', { name: 'Plan' })).toBeNull()
  })

  it('exposes the Plan view and area-label selects', () => {
    const harness = createHarness(plannerState())
    harness.render(<NavyStaff />)

    const view = screen.getByLabelText('View') as HTMLSelectElement
    expect(view.value).toBe('area')
    expect(within(view).getByRole('option', { name: 'Grid Palette' })).toBeTruthy()

    const labels = screen.getByLabelText('Area labels') as HTMLSelectElement
    expect(labels.value).toBe('map')
    expect(within(labels).getByRole('option', { name: 'Sortie tag names' })).toBeTruthy()

    // The old area/grid tabs are gone.
    expect(screen.queryByRole('tab', { name: 'Area View' })).toBeNull()
  })
})
