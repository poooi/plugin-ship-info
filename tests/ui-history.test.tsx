// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react'
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
vi.mock('../packages/navy-staff/src/lib/html2canvas', () => ({
  default: async () => ({ toDataURL: () => 'data:image/png;base64,' }),
}))

import { reactClass as NavyStaff } from '../packages/navy-staff/src/views'
import { plannerState } from './ui/fixtures'
import { createHarness } from './ui/harness'

const twoRevisionState = () => {
  const state = plannerState()
  const navy = state['poi-plugin-navy-staff'].navy
  const workspace = navy.workspaces[0]
  const base = workspace.revisions[0]
  workspace.revisions = [
    base,
    {
      content: {
        ...base.content,
        assignments: { ...base.content.assignments, 'area-1': [3, 5] },
      },
      id: 'rev-2',
      op: { areaId: 'area-1', kind: 'add-ship', shipId: 5 },
      time: '2026-01-02T00:00:00.000Z',
    },
  ]
  workspace.cursor = 1
  return state
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('history preview persistence isolation', () => {
  it('opening and closing a preview dispatches nothing and keeps the durable slice', () => {
    const harness = createHarness(twoRevisionState())
    const navyBefore = harness.store.getState()['poi-plugin-navy-staff'].navy
    const dispatchSpy = vi.spyOn(harness.store, 'dispatch')

    harness.render(<NavyStaff />)
    dispatchSpy.mockClear()

    // History is a read-only task inside Plan.
    fireEvent.click(screen.getByRole('button', { name: 'History' }))
    const history = screen.getByLabelText('History') as HTMLSelectElement

    // Open the older revision: a transient preview, no Redux action.
    fireEvent.change(history, { target: { value: 'rev-1' } })
    expect(
      screen.getByTestId('history-task'),
    ).toBeTruthy()

    // The captured current revision remains read-only until returning to Plan.
    fireEvent.change(history, { target: { value: 'rev-2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Return to current plan' }))
    expect(
      screen.queryByTestId('history-task'),
    ).toBeNull()

    expect(dispatchSpy).not.toHaveBeenCalled()
    expect(harness.store.getState()['poi-plugin-navy-staff'].navy).toBe(navyBefore)
  })

  it('a preview shows captured ships only, never the live-only roster', () => {
    const harness = createHarness(twoRevisionState())
    harness.render(<NavyStaff />)

    fireEvent.click(screen.getByRole('button', { name: 'History' }))
    fireEvent.change(screen.getByLabelText('History') as HTMLSelectElement, {
      target: { value: 'rev-1' },
    })
    fireEvent.change(screen.getByLabelText('View'), { target: { value: 'grid' } })

    // Captured ship 3 is present; the live-only Alpha (id 1) is not. A
    // read-only card is a labelled group, not a button.
    expect(screen.getByLabelText('#3 Lv.?')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Alpha/ })).toBeNull()
  })
})
