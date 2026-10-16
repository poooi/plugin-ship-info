// @vitest-environment jsdom
import { Classes } from '@blueprintjs/core'
import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('views/env-parts/i18next', async () => ({
  default: await (await import('./ui/boundaries')).createI18n(),
}))
vi.mock('views/utils/selectors', async () => (await import('./ui/boundaries')).poiSelectors)
vi.mock('views/components/etc/window-env', async () => (await import('./ui/boundaries')).windowEnvModule)
vi.mock('views/components/etc/overlay', async () => (await import('./ui/boundaries')).overlay)
vi.mock('views/components/etc/avatar', async () => (await import('./ui/boundaries')).avatarModule)
vi.mock('views/components/etc/icon', async () => (await import('./ui/boundaries')).iconModule)
vi.mock('views/utils/tools', async () => (await import('./ui/boundaries')).toolsModule)
vi.mock('views/utils/ship-img', async () => (await import('./ui/boundaries')).shipImgModule)
vi.mock('wanakana', async () => (await import('./ui/boundaries')).wanakanaModule)
vi.mock('react-fontawesome', async () => (await import('./ui/boundaries')).fontawesomeModule)
vi.mock('redux-observers', async () => (await import('./ui/boundaries')).reduxObserversModule)
vi.mock('electron', async () => (await import('./ui/boundaries')).createElectronModule())
vi.mock('../lib/html2canvas', () => ({ default: () => undefined }))

import { ColumnConfig } from '../views/sidebar/columns/column-config'
import { createHarness } from './ui/harness'
import { tableState } from './ui/mocks'

// Query the classes the loaded Blueprint actually renders instead of a
// hardcoded `bpN-` namespace, so this test follows the host's major too.
const CONTROL = `.${Classes.CONTROL}`
const CONTROL_INDICATOR = `.${Classes.CONTROL_INDICATOR}`
const CARD = `.${Classes.CARD}`

const cardCheckbox = (card: HTMLElement, label: string): HTMLInputElement =>
  within(card)
    .getByText(label)
    .closest('label')!
    .querySelector('input')!

// Exact CSSStyleRule matching: only rules whose selector really targets the
// element are considered, never whole-stylesheet text.
const matchingRules = (el: Element): CSSStyleRule[] => {
  const matched: CSSStyleRule[] = []
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList
    try {
      rules = sheet.cssRules
    } catch {
      continue
    }
    for (const rule of Array.from(rules)) {
      if (
        rule instanceof CSSStyleRule &&
        rule.selectorText &&
        !rule.selectorText.includes('::')
      ) {
        try {
          if (el.matches(rule.selectorText)) matched.push(rule)
        } catch {
          /* unsupported selector */
        }
      }
    }
  }
  return matched
}

const declaresZeroMargins = (rule: CSSStyleRule): boolean => {
  const { marginBottom, marginTop } = rule.style
  return (
    marginTop !== '' &&
    marginBottom !== '' &&
    parseFloat(marginTop) === 0 &&
    parseFloat(marginBottom) === 0
  )
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('ColumnConfig integration', () => {
  it('styles every real Blueprint checkbox control and indicator it renders', () => {
    const h = createHarness(tableState())
    const { container } = h.render(<ColumnConfig />)

    const controls = Array.from(
      container.querySelectorAll<HTMLElement>(CONTROL),
    )
    const indicators = Array.from(
      container.querySelectorAll<HTMLElement>(CONTROL_INDICATOR),
    )

    // One "Visible" and one "Pin" checkbox per configurable column card.
    const cards = Array.from(container.querySelectorAll<HTMLElement>(CARD))
    expect(cards.length).toBeGreaterThan(1)
    expect(controls.length).toBe(cards.length * 2)
    expect(indicators.length).toBe(controls.length)

    for (const control of controls) {
      const style = getComputedStyle(control)
      expect(style.display).toBe('flex')
      expect(style.alignItems).toBe('center')
      expect(style.marginBottom).toBe('0px')
    }

    for (const indicator of indicators) {
      // Guard the indicator selector specifically: a rule must actually match
      // this indicator and zero both margins, so dropping only the
      // CONTROL_INDICATOR interpolation is caught even though the default
      // indicator margins already compute to zero.
      const rule = matchingRules(indicator).find(declaresZeroMargins)
      expect(rule, 'no matching rule zeroes the indicator margins').toBeTruthy()

      const style = getComputedStyle(indicator)
      expect(style.marginTop).toBe('0px')
      expect(style.marginBottom).toBe('0px')
    }
  })

  it('toggles visibility and pinning through the real controls and store', () => {
    const h = createHarness(
      tableState({
        config: { plugin: { ShipInfo: { columnVisibility: { id: true } } } },
      }),
    )
    h.render(<ColumnConfig />)

    const card = screen.getByText('ID').closest(CARD) as HTMLElement
    const visible = cardCheckbox(card, 'Visible')
    const pin = cardCheckbox(card, 'Pin')

    expect(visible.checked).toBe(true)
    expect(pin.checked).toBe(false)
    expect(getComputedStyle(card).opacity).toBe('1')

    fireEvent.click(visible)
    expect(h.configCalls).toContainEqual([
      'plugin.ShipInfo.columnVisibility',
      { id: false },
    ])
    expect(visible.checked).toBe(false)
    expect(getComputedStyle(card).opacity).toBe('0.5')

    fireEvent.click(pin)
    expect(h.configCalls).toContainEqual([
      'plugin.ShipInfo.columnPinning',
      { left: ['rowIndex', 'id'], right: [] },
    ])
    expect(pin.checked).toBe(true)
  })
})
