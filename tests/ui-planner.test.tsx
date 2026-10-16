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
vi.mock('wanakana', async () => (await import('./ui/boundaries')).wanakanaModule)
vi.mock('react-fontawesome', async () => (await import('./ui/boundaries')).fontawesomeModule)
vi.mock('redux-observers', async () => (await import('./ui/boundaries')).reduxObserversModule)
vi.mock('electron', async () => (await import('./ui/boundaries')).createElectronModule())

import { AddShip } from '../packages/navy-staff/src/views/planner/add-ship'
import { plannerState } from './ui/fixtures'
import { createHarness } from './ui/harness'

const renderMenu = () => {
  const h = createHarness(plannerState())
  const onSelect = vi.fn()
  h.render(<AddShip onSelect={onSelect} />)
  return { h, onSelect }
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('AddShip planner menu search', () => {
  it('lists only owned ships that are neither selected nor tagged', () => {
    renderMenu()

    expect(screen.getByText('Alpha')).toBeTruthy()
    expect(screen.getByText('Beta')).toBeTruthy()
    expect(screen.getByText('Epsilon')).toBeTruthy()
    // Gamma is already in the planner, Delta is tagged with a sally area
    expect(screen.queryByText('Gamma')).toBeNull()
    expect(screen.queryByText('Delta')).toBeNull()
  })

  it('matches by ship name', () => {
    renderMenu()
    fireEvent.change(screen.getByPlaceholderText('Search'), {
      target: { value: 'epsilon' },
    })

    expect(screen.getByText('Epsilon')).toBeTruthy()
    expect(screen.queryByText('Alpha')).toBeNull()
  })

  it('matches by yomi', () => {
    renderMenu()
    fireEvent.change(screen.getByPlaceholderText('Search'), {
      target: { value: 'イプシロン' },
    })

    expect(screen.getByText('Epsilon')).toBeTruthy()
    expect(screen.queryByText('Beta')).toBeNull()
  })

  it('matches by romaji', () => {
    renderMenu()
    fireEvent.change(screen.getByPlaceholderText('Search'), {
      target: { value: 'ipushiron' },
    })

    expect(screen.getByText('Epsilon')).toBeTruthy()
  })

  it('never surfaces already selected or tagged ships through search', () => {
    renderMenu()
    const input = screen.getByPlaceholderText('Search')

    fireEvent.change(input, { target: { value: 'gamma' } })
    expect(screen.queryByText('Gamma')).toBeNull()

    fireEvent.change(input, { target: { value: 'delta' } })
    expect(screen.queryByText('Delta')).toBeNull()
  })

  it('invokes the selection callback with the ship id', () => {
    const { onSelect } = renderMenu()

    fireEvent.click(screen.getByText('Alpha'))

    expect(onSelect).toHaveBeenCalledWith(1)
  })
})
