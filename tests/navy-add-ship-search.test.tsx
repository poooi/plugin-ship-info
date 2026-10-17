// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react'
import i18next from 'i18next'
import React from 'react'
import { I18nextProvider } from 'react-i18next'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('views/env-parts/i18next', async () => ({
  default: await (await import('./ui/boundaries')).createI18n(),
}))
vi.mock('views/utils/selectors', async () => (await import('./ui/boundaries')).poiSelectors)
vi.mock('views/components/etc/window-env', async () => (await import('./ui/boundaries')).windowEnvModule)
vi.mock('views/components/etc/overlay', async () => (await import('./ui/boundaries')).overlay)
vi.mock('views/utils/tools', async () => (await import('./ui/boundaries')).toolsModule)
vi.mock('views/utils/ship-img', async () => (await import('./ui/boundaries')).shipImgModule)
vi.mock('react-fontawesome', async () => (await import('./ui/boundaries')).fontawesomeModule)
vi.mock('redux-observers', async () => (await import('./ui/boundaries')).reduxObserversModule)
vi.mock('electron', async () => (await import('./ui/boundaries')).createElectronModule())

import { AddShip } from '../packages/navy-staff/src/views/planner/add-ship'
import { plannerState } from './ui/fixtures'
import { createHarness } from './ui/harness'

// The picker displays `t(rawName, { ns: 'resources' })`; the search index must
// include that same visible alias, not only the raw master name.
const i18n = i18next.createInstance()
i18n.init({
  defaultNS: 'poi-plugin-navy-staff',
  fallbackLng: false,
  initAsync: false,
  lng: 'en',
  ns: ['poi-plugin-navy-staff', 'resources'],
  resources: {
    en: {
      'poi-plugin-navy-staff': {},
      resources: { Alpha: 'アルファ表示' },
    },
  },
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('Add ship picker search', () => {
  it('matches the displayed translated resource name as well as the raw name', () => {
    const harness = createHarness(plannerState())
    harness.render(
      <I18nextProvider i18n={i18n}>
        <AddShip onSelect={() => undefined} />
      </I18nextProvider>,
    )

    const input = screen.getByPlaceholderText('Search')

    // Displayed alias (resources translation) matches.
    fireEvent.change(input, { target: { value: 'アルファ表示' } })
    expect(screen.getByText('アルファ表示')).toBeTruthy()

    // A non-matching query removes it again.
    fireEvent.change(input, { target: { value: 'ノーマッチ' } })
    expect(screen.queryByText('アルファ表示')).toBeNull()
  })
})
