// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import i18next from 'i18next'
import React from 'react'
import { I18nextProvider } from 'react-i18next'
import { ThemeProvider } from 'styled-components'
import { getTheme } from './ui/environment'
import { afterEach, describe, expect, it } from 'vitest'

import type {
  WorkspaceAreaView,
  WorkspaceShipRow,
} from '../packages/navy-staff/src/views/workspace/selectors'
import { ShipList, sortShipRows } from '../packages/navy-staff/src/views/planner/ship-list'

const i18n = i18next.createInstance()
i18n.init({
  defaultNS: 'poi-plugin-navy-staff',
  fallbackLng: false,
  initAsync: false,
  lng: 'en',
  ns: ['poi-plugin-navy-staff', 'resources'],
  resources: { en: { 'poi-plugin-navy-staff': {}, resources: {} } },
})

const theme = getTheme('dark')

const row = (over: Partial<WorkspaceShipRow>): WorkspaceShipRow => ({
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

const renderList = (ships: WorkspaceShipRow[]) =>
  render(
    <ThemeProvider theme={theme}>
      <I18nextProvider i18n={i18n}>
        <ShipList
          areas={[] as WorkspaceAreaView[]}
          displayFleetName={false}
          readOnly={false}
          ships={ships}
          selected={new Set()}
          onToggle={() => undefined}
        />
      </I18nextProvider>
    </ThemeProvider>,
  )

afterEach(cleanup)

describe('ShipList ordering and assigned tint', () => {
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
})
