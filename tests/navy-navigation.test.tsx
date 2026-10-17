// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import React from 'react'
import { thunk } from 'redux-thunk'
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
import { PLUGIN_KEY } from '../packages/navy-staff/src/views/plugin-identity'
import { reducer as navyReducer } from '../packages/navy-staff/src/views/redux'
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

  it('uses icon view buttons and the area-label select', () => {
    const harness = createHarness(plannerState())
    harness.render(<NavyStaff />)

    const area = screen.getByRole('button', { name: 'Area View' })
    const list = screen.getByRole('button', { name: 'Ship List' })
    const grid = screen.getByRole('button', { name: 'Grid Palette' })
    expect(area.getAttribute('aria-pressed')).toBe('true')
    expect(grid.getAttribute('aria-pressed')).toBe('false')

    fireEvent.click(list)
    expect(list.getAttribute('aria-pressed')).toBe('true')
    expect(area.getAttribute('aria-pressed')).toBe('false')

    const labels = screen.getByLabelText('Area labels') as HTMLSelectElement
    expect(labels.value).toBe('map')
    expect(within(labels).getByRole('option', { name: 'Show original' })).toBeTruthy()
    expect(within(labels).getByRole('option', { name: 'Show translation' })).toBeTruthy()

    const viewGroup = screen.getByRole('group', { name: 'View' })
    expect(within(viewGroup).getByRole('button', { name: 'Area View' })).toBeTruthy()
    expect(within(viewGroup).getByRole('button', { name: 'Ship List' })).toBeTruthy()
    expect(within(viewGroup).getByRole('button', { name: 'Grid Palette' })).toBeTruthy()

    // The old View dropdown and area/grid tabs are gone.
    expect(screen.queryByRole('combobox', { name: 'View' })).toBeNull()
    expect(screen.queryByRole('tab', { name: 'Area View' })).toBeNull()
  })

  it('applies the selected ships in one batch and clears the selection', async () => {
    const harness = createHarness(plannerState(), {
      middleware: [thunk],
      pluginReducers: { [PLUGIN_KEY]: navyReducer },
    })
    harness.render(<NavyStaff />)

    fireEvent.click(screen.getByRole('button', { name: 'Ship List' }))
    const alpha = screen.getByRole('checkbox', { name: /Alpha/ }) as HTMLInputElement
    fireEvent.click(alpha)
    expect(alpha.checked).toBe(true)

    fireEvent.change(screen.getByLabelText('Assign to'), {
      target: { value: 'area-2' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Apply to selected' }))

    await waitFor(() => {
      const navy = harness.store.getState()['poi-plugin-navy-staff'].navy
      const workspace = navy.workspaces.find(
        (item: { id: string }) => item.id === navy.selectedWorkspaceId,
      )
      const content = workspace.revisions[workspace.cursor].content
      expect(content.assignments['area-2']).toContain(1)
    })

    // handleBatch clears the selection after the single revision is committed.
    for (const box of screen.getAllByRole('checkbox') as HTMLInputElement[]) {
      expect(box.checked).toBe(false)
    }
  })
})
