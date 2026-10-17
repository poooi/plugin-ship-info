// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import React from 'react'
import { I18nextProvider } from 'react-i18next'
import { Provider } from 'react-redux'
import { legacy_createStore } from 'redux'
import { ThemeProvider } from 'styled-components'
import { getTheme } from './ui/environment'
import { afterEach, describe, expect, it } from 'vitest'

import { createNavyOnlyI18n } from '../preview/i18n'
import type {
  WorkspaceAreaView,
  WorkspaceShipRow,
} from '../packages/navy-staff/src/views/workspace/selectors'
import { ShipList, sortShipRows } from '../packages/navy-staff/src/views/planner/ship-list'

const i18n = createNavyOnlyI18n('en-US')

const theme = getTheme('dark')

const row = (over: Partial<WorkspaceShipRow>): WorkspaceShipRow => ({
  actualTag: null,
  assignedColor: null,
  avatarOffset: 0.555,
  fleetId: -1,
  level: null,
  live: false,
  masterId: null,
  name: null,
  ownedId: 0,
  record: null,
  superTypeIndex: 2,
  typeId: 2,
  ...over,
})

const rows = [
  row({ level: 10, name: 'A', ownedId: 1 }),
  row({ level: null, name: 'B', ownedId: 2 }),
  row({ level: 50, name: 'C', ownedId: 3 }),
  row({ level: 10, name: 'D', ownedId: 4 }),
]

const renderList = (
  ships: WorkspaceShipRow[],
  shiptag?: unknown,
  displayFleetName = false,
  translation = i18n,
) =>
  render(
    <Provider store={legacy_createStore(() => ({ fcd: { shiptag } }))}>
      <ThemeProvider theme={theme}>
        <I18nextProvider i18n={translation}>
          <ShipList
            areas={[] as WorkspaceAreaView[]}
            displayFleetName={displayFleetName}
            readOnly={false}
            ships={ships}
            selected={new Set()}
            onToggle={() => undefined}
          />
        </I18nextProvider>
      </ThemeProvider>
    </Provider>,
  )

afterEach(cleanup)

describe('ShipList ordering and assigned tint', () => {
  it.each([
    ['en-US', 'Actual: E1', 'Actual sortie tag: E1'],
    ['ja-JP', '札：E1', '現在の出撃札：E1'],
    ['ko-KR', '실제: E1', '현재 출격 태그: E1'],
    ['zh-CN', '实际：E1', '当前出击标签：E1'],
    ['zh-TW', '實際：E1', '目前出擊標籤：E1'],
  ] as const)('renders the actual tag in %s after host key normalization', (language, text, label) => {
    const translation = createNavyOnlyI18n(language)
    expect(translation.exists('actualTag')).toBe(true)
    expect(translation.exists('actualTagLabel')).toBe(true)
    renderList([row({ actualTag: 1, name: 'A', ownedId: 1 })], { mapname: ['E1'] }, false, translation)
    const badge = screen.getByRole('img', { name: label })
    expect(badge.textContent).toBe(text)
    expect(badge.title).toBe(label)
  })

  it('sorts level descending, null last, then owned id descending', () => {
    expect(sortShipRows(rows).map((entry) => entry.ownedId)).toEqual([3, 4, 1, 2])
  })

  it('never lets assignment color change the order', () => {
    const assigned = rows.map((entry, index) =>
      index === 1 ? { ...entry, assignedColor: '#ff0000' } : entry,
    )
    expect(sortShipRows(assigned).map((entry) => entry.ownedId)).toEqual([3, 4, 1, 2])
  })

  it('renders in sorted order and flags assigned rows for the tint', () => {
    renderList(
      rows.map((entry, index) =>
        index === 1 ? { ...entry, assignedColor: '#ff0000' } : entry,
      ),
    )

    const boxes = screen.getAllByRole('checkbox') as HTMLInputElement[]
    // B (owned 2, null level) sorts last; the assigned flag follows the row.
    expect(boxes.map((box) => box.getAttribute('data-assigned'))).toEqual([
      'false',
      'false',
      'false',
      'true',
    ])
    const labels = boxes.map((box) => box.closest('label')?.textContent ?? '')
    expect(labels[0]).toContain('C')
    expect(labels[1]).toContain('D')
    expect(labels[2]).toContain('A')
    expect(labels[3]).toContain('B')
  })

  it('paints assigned rows with a different theme-aware background', () => {
    renderList(
      rows.map((entry, index) =>
        index === 1 ? { ...entry, assignedColor: '#ff0000' } : entry,
      ),
    )

    const boxes = screen.getAllByRole('checkbox') as HTMLInputElement[]
    const assigned = boxes[3].closest('label') as HTMLElement
    const plain = boxes[0].closest('label') as HTMLElement
    expect(getComputedStyle(assigned).backgroundColor).not.toBe(
      getComputedStyle(plain).backgroundColor,
    )
  })

  it('shows a color swatch beside the area label only on assigned rows', () => {
    renderList(
      rows.map((entry, index) =>
        index === 1 ? { ...entry, assignedColor: '#ff0000' } : entry,
      ),
    )

    const swatches = screen.getAllByTestId('ship-list-area-color')
    expect(swatches).toHaveLength(1)
    expect(swatches[0].getAttribute('aria-hidden')).toBe('true')
    expect(getComputedStyle(swatches[0]).backgroundColor).toBe('rgb(255, 0, 0)')
  })

  it('shows the live sortie tag from current host metadata', () => {
    renderList(
      [row({ actualTag: 1, name: 'A', ownedId: 1 })],
      { color: ['#ff0000'], mapname: ['E1'] },
    )

    const badge = screen.getByTestId('actual-sortie-tag')
    expect(badge.getAttribute('aria-label')).toBe('Actual sortie tag: E1')
    expect(badge.textContent).toBe('Actual: E1')
    expect(badge.getAttribute('title')).toBe('Actual sortie tag: E1')
  })

  it('prefers the translated fleet label when requested', () => {
    renderList(
      [row({ actualTag: 1, name: 'A', ownedId: 1 })],
      { color: ['#ff0000'], fleetname: { 'en-US': ['Fleet One'] }, mapname: ['E1'] },
      true,
    )

    expect(screen.getByTestId('actual-sortie-tag').textContent).toBe('Actual: Fleet One')
  })

  it('falls back to the original map label when the translation is absent', () => {
    renderList(
      [row({ actualTag: 1, name: 'A', ownedId: 1 })],
      { color: ['#ff0000'], fleetname: { 'ja-JP': ['第1艦隊'] }, mapname: ['E1'] },
      true,
    )

    expect(screen.getByTestId('actual-sortie-tag').textContent).toBe('Actual: E1')
  })

  it('falls back to the original map label when the translation is empty', () => {
    renderList(
      [row({ actualTag: 1, name: 'A', ownedId: 1 })],
      { color: ['#ff0000'], fleetname: { 'en-US': [''] }, mapname: ['E1'] },
      true,
    )

    expect(screen.getByTestId('actual-sortie-tag').textContent).toBe('Actual: E1')
  })

  it('falls back to the numeric tag when host metadata is absent', () => {
    renderList([row({ actualTag: 99, name: 'A', ownedId: 1 })])

    const badge = screen.getByTestId('actual-sortie-tag')
    expect(badge.getAttribute('aria-label')).toBe('Actual sortie tag: Tag 99')
    expect(badge.textContent).toBe('Actual: Tag 99')
  })

  it('shows no sortie tag for an untagged row', () => {
    renderList([row({ name: 'A', ownedId: 1 })])

    expect(screen.queryByTestId('actual-sortie-tag')).toBeNull()
  })
})
