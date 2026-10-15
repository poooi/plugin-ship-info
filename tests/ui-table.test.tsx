// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { clipboard } from 'electron'
import React from 'react'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

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

import { Export } from '../views/sidebar/export'
import { filteredShipIdsAtom, TableView } from '../views/table'
import { createHarness } from './ui/harness'
import { installViewport, restoreViewport, tableState } from './ui/mocks'

const SHIP_NAMES = ['Alpha', 'Beta', 'Gamma', 'Delta']

const renderedNames = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('[role="gridcell"]'))
    .map((el) => el.textContent ?? '')
    .filter((text) => SHIP_NAMES.includes(text))

const renderedHeaderTitles = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('[role="button"]')).map(
    (el) => el.textContent ?? '',
  )

// Exact CSSStyleRule matching: only rules whose selector really targets the
// element are considered, never whole-stylesheet text.
const matchingRules = (el: Element) => {
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

beforeAll(() => installViewport())
afterAll(() => restoreViewport())
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('TableView integration', () => {
  it('renders every row in selector order and syncs filteredShipIdsAtom', async () => {
    const h = createHarness(tableState())
    const { container } = h.render(<TableView />)

    await screen.findByText('Alpha')

    expect(renderedNames(container)).toEqual(['Gamma', 'Delta', 'Alpha', 'Beta'])
    await waitFor(() =>
      expect(h.jotaiStore.get(filteredShipIdsAtom)).toEqual([3, 4, 1, 2]),
    )
  })

  it('writes sort config on header click and re-sorts from the store', async () => {
    const h = createHarness(tableState())
    const { container } = h.render(<TableView />)
    await screen.findByText('Alpha')

    fireEvent.click(screen.getByText('Level'))
    expect(h.configCalls).toContainEqual(['plugin.ShipInfo.sortOrder', 1])
    expect(h.store.getState().config.plugin.ShipInfo.sortOrder).toBe(1)
    await waitFor(() =>
      expect(renderedNames(container)).toEqual(['Beta', 'Alpha', 'Delta', 'Gamma']),
    )

    fireEvent.click(screen.getByText('ID'))
    expect(h.configCalls).toContainEqual(['plugin.ShipInfo.sortName', 'id'])
    expect(h.store.getState().config.plugin.ShipInfo.sortName).toBe('id')
    await waitFor(() =>
      expect(renderedNames(container)).toEqual(['Alpha', 'Beta', 'Gamma', 'Delta']),
    )
  })

  it('applies inclusive level bounds after a store change', async () => {
    const h = createHarness(tableState())
    const { container } = h.render(<TableView />)
    await screen.findByText('Alpha')

    act(() =>
      h.setConfig('plugin.ShipInfo.filters', { maxLevel: 100, minLevel: 50 }),
    )

    await waitFor(() =>
      expect(renderedNames(container)).toEqual(['Delta', 'Alpha']),
    )
    expect(h.jotaiStore.get(filteredShipIdsAtom)).toEqual([4, 1])
  })

  it('applies ship type selection after a store change', async () => {
    const h = createHarness(tableState())
    const { container } = h.render(<TableView />)
    await screen.findByText('Alpha')

    act(() => h.setConfig('plugin.ShipInfo.shipTypes', 10))

    await waitFor(() => expect(renderedNames(container)).toEqual(['Alpha', 'Beta']))
    expect(h.jotaiStore.get(filteredShipIdsAtom)).toEqual([1, 2])
  })

  it('applies sally area tag selection after a store change', async () => {
    const h = createHarness(tableState())
    const { container } = h.render(<TableView />)
    await screen.findByText('Alpha')

    act(() =>
      h.setConfig('plugin.ShipInfo.sallyAreaChecked', [true, false, true]),
    )

    await waitFor(() =>
      expect(renderedNames(container)).toEqual(['Gamma', 'Delta', 'Alpha']),
    )
    expect(h.jotaiStore.get(filteredShipIdsAtom)).toEqual([3, 4, 1])
  })

  it('renders no rows when the filter matches nothing', async () => {
    const h = createHarness(tableState())
    const { container } = h.render(<TableView />)
    await screen.findByText('Alpha')

    act(() =>
      h.setConfig('plugin.ShipInfo.filters', { maxLevel: 450, minLevel: 200 }),
    )

    await waitFor(() => expect(h.jotaiStore.get(filteredShipIdsAtom)).toEqual([]))
    expect(renderedNames(container)).toEqual([])
  })

  it('renders the default column order and visibility', async () => {
    const h = createHarness(tableState())
    const { container } = h.render(<TableView />)
    await screen.findByText('Alpha')

    expect(renderedHeaderTitles(container)).toEqual([
      'ID',
      'Name',
      'Class',
      'Speed',
      'Level',
      'Cond',
      'HP',
      'Firepower',
      'Torpedo',
      'AA',
      'Armor',
      'Luck',
      'Evasion',
      'ASW',
      'LOS',
      'Repair',
      'Equipment',
      'Lock',
    ])
  })

  it('applies column order, visibility and pinning changes from the store', async () => {
    const h = createHarness(tableState())
    const { container } = h.render(<TableView />)
    await screen.findByText('Alpha')

    act(() =>
      h.setConfig('plugin.ShipInfo.columnOrder', [
        'rowIndex',
        'name',
        'id',
        'type',
        'soku',
        'lv',
        'cond',
        'hp',
        'karyoku',
        'raisou',
        'taiku',
        'soukou',
        'lucky',
        'kaihi',
        'taisen',
        'sakuteki',
        'repairtime',
        'equipment',
        'lock',
      ]),
    )
    await waitFor(() =>
      expect(renderedHeaderTitles(container).slice(0, 2)).toEqual([
        'Name',
        'ID',
      ]),
    )

    act(() => h.setConfig('plugin.ShipInfo.columnVisibility', { id: false }))
    await waitFor(() =>
      expect(renderedHeaderTitles(container)).not.toContain('ID'),
    )
    expect(renderedHeaderTitles(container)[0]).toBe('Name')

    act(() =>
      h.setConfig('plugin.ShipInfo.columnPinning', {
        left: ['rowIndex', 'name'],
        right: [],
      }),
    )
    await waitFor(() => {
      const headerCell = screen.getByText('Name').parentElement!
      const sticky = matchingRules(headerCell).find(
        (rule) => rule.style.position === 'sticky',
      )
      expect(sticky).toBeTruthy()
      expect(sticky!.style.left).toBe('40px')
    })
  })

  it('exports the current (filtered) list through the real Export clipboard host', async () => {
    const h = createHarness(tableState())
    h.render(
      <>
        <TableView />
        <Export />
      </>,
    )
    await screen.findByText('Alpha')

    act(() =>
      h.setConfig('plugin.ShipInfo.filters', { maxLevel: 100, minLevel: 50 }),
    )
    await waitFor(() =>
      expect(h.jotaiStore.get(filteredShipIdsAtom)).toEqual([4, 1]),
    )

    fireEvent.click(screen.getByText('Copy to clipboard'))

    expect(clipboard.writeText).toHaveBeenCalledTimes(1)
    const csv = (clipboard.writeText as any).mock.calls[0][0] as string
    const [header, ...rows] = csv.split('\n')
    const nameIndex = header.split(',').indexOf('name')
    expect(rows.map((row) => row.split(',')[nameIndex])).toEqual([
      'Delta',
      'Alpha',
    ])
  })
})
