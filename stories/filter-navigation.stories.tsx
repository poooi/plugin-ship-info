import { Classes } from '@blueprintjs/core'
import type { Meta, StoryObj } from '@storybook/react-vite'
import React from 'react'
import { expect, fireEvent, screen, userEvent, waitFor, within } from 'storybook/test'

import { getEnvironment } from '../preview/scenario'
import { tableState } from '../preview/table-fixtures'
import { Filter } from '../packages/ship-info/src/views/sidebar/filter'
import { TableView } from '../packages/ship-info/src/views/table'
import {
  headerTitles,
  openPopover,
  popoverContent,
  renderedNames,
} from './table-support'

const FilterTable: React.FC = () => (
  <>
    <TableView />
    <Filter />
  </>
)

const meta = {
  title: 'Filter/Navigation',
  component: FilterTable,
} satisfies Meta<typeof FilterTable>

export default meta
type Story = StoryObj<typeof meta>

const ALL_ROWS = [
  'Zeta',
  'Gamma',
  'Delta',
  'Eta',
  'Alpha',
  'Beta',
  'Theta',
  'Epsilon',
]

const filterSection = (heading: string): HTMLElement =>
  within(popoverContent()).getByRole('heading', { name: heading })
    .parentElement as HTMLElement

const nav = (): HTMLElement =>
  within(popoverContent()).getByRole('navigation', { name: 'Filter sections' })

const navButton = (label: string): HTMLElement =>
  within(nav()).getByRole('button', { name: new RegExp(`^${label}`) })

const sections = (): HTMLElement =>
  document.querySelector('[data-filter-sections]') as HTMLElement

const statusGrid = (): HTMLElement =>
  document.querySelector('[data-filter-status-grid]') as HTMLElement

const activeSection = async (label: string): Promise<void> => {
  await waitFor(() => {
    expect(navButton(label).getAttribute('aria-current')).toBe('location')
  })
}

const columnCount = (element: HTMLElement): number =>
  getComputedStyle(element).gridTemplateColumns.split(' ').filter(Boolean).length

async function waitForRows(
  root: HTMLElement,
  expected: string[],
): Promise<void> {
  await waitFor(async () => {
    await expect(renderedNames(root)).toEqual(expected)
  })
}

const seededResetState = () =>
  tableState({
    config: {
      plugin: {
        ShipInfo: {
          columnOrder: ['rowIndex', 'name', 'id'],
          columnVisibility: { type: false },
          filters: { maxLevel: 150, minLevel: 50 },
          locked: [false, true],
          rawValue: 1,
          sortName: 'id',
          sortOrder: 1,
        },
      },
      poi: { appearance: { avatar: false } },
    },
  })

export const JumpsAndStickyHeadings: Story = {
  name: 'Section jumps, active underline and sticky headings on a short page',
  parameters: {
    shipInfo: {
      dimensions: { height: 420, width: 900 },
      state: tableState(),
    },
  },
  play: async ({ canvasElement }) => {
    await openPopover(canvasElement, 'Filter')
    const page = sections()
    page.style.flex = '0 0 150px'
    page.style.height = '150px'
    await waitFor(() => {
      expect(page.getBoundingClientRect().height).toBeGreaterThan(140)
      expect(page.scrollHeight).toBeGreaterThan(page.clientHeight)
    })

    await expect(nav().querySelectorAll('[aria-current="location"]')).toHaveLength(
      1,
    )
    await activeSection('Ship types')
    await expect(
      getComputedStyle(navButton('Ship types')).boxShadow,
    ).not.toBe('none')

    for (const heading of [
      'Ship types',
      'Level',
      'Sally Area',
      'Status',
      'Value Type',
    ]) {
      await expect(
        getComputedStyle(
          within(popoverContent()).getByRole('heading', { name: heading }),
        ).position,
      ).toBe('sticky')
    }

    // Native buttons jump with Enter, move focus to the target section and keep
    // the clicked final section active when scrolling is clamped.
    for (const [index, label] of [
      'Ship types',
      'Level',
      'Sally Area',
      'Status',
      'Value Type',
    ].entries()) {
      navButton(label).focus()
      await userEvent.keyboard('{Enter}')
      await activeSection(label)
      await expect(document.activeElement?.id).toBe(`filter-section-${index}`)
      await expect(
        getComputedStyle(navButton(label)).boxShadow,
      ).not.toBe('none')
      await expect(
        nav().querySelectorAll('[aria-current="location"]'),
      ).toHaveLength(1)
    }
  },
}

export const ModifiedMarkersAndReset: Story = {
  name: 'Dirty dots mark each changed section and reset restores defaults',
  parameters: { shipInfo: { state: seededResetState() } },
  play: async ({ canvasElement }) => {
    const environment = getEnvironment()
    const config = () => environment.store.getState().config.plugin.ShipInfo
    await waitForRows(canvasElement, ['Alpha', 'Gamma'])
    await expect(headerTitles(canvasElement).slice(0, 2)).toEqual(['Name', 'ID'])
    await expect(headerTitles(canvasElement)).not.toContain('Class')

    await openPopover(canvasElement, 'Filter')
    for (const label of ['Level', 'Status', 'Value Type']) {
      await expect(navButton(label).getAttribute('data-dirty')).toBe('true')
      await expect(navButton(label).getAttribute('aria-label')).toContain(
        'Modified',
      )
      await expect(navButton(label).textContent).toContain('•')
    }
    for (const label of ['Ship types', 'Sally Area']) {
      await expect(navButton(label).getAttribute('data-dirty')).toBeNull()
    }

    await userEvent.click(
      within(nav()).getByRole('button', {
        name: 'Reset filters and sorting',
      }),
    )

    await waitFor(() => {
      expect(config()).toMatchObject({
        filters: { maxLevel: 450, minLevel: 0 },
        locked: [true, true],
        rawValue: 0,
        sortName: 'lv',
        sortOrder: 0,
      })
    })
    await expect(config().columnOrder).toEqual(['rowIndex', 'name', 'id'])
    await expect(config().columnVisibility).toEqual({ type: false })
    await expect(
      nav().querySelectorAll('[data-dirty="true"]'),
    ).toHaveLength(0)
    await expect(
      screen.getByRole<HTMLInputElement>('textbox', { name: 'Minimum level' }),
    ).toHaveValue('0')
    await waitForRows(canvasElement, ALL_ROWS)
    await expect(headerTitles(canvasElement).slice(0, 2)).toEqual(['Name', 'ID'])
    await expect(headerTitles(canvasElement)).not.toContain('Class')
  },
}

export const WideLayout: Story = {
  name: 'Wide panel uses two status columns and aligned level controls',
  parameters: {
    shipInfo: {
      dimensions: { height: 640, width: 900 },
      state: tableState(),
    },
  },
  play: async ({ canvasElement }) => {
    await openPopover(canvasElement, 'Filter')
    await expect(columnCount(statusGrid())).toBe(2)
    await expect(
      getComputedStyle(
        within(filterSection('Status')).getByRole('heading', { name: 'Lock' })
          .parentElement as HTMLElement,
      ).display,
    ).toBe('grid')

    const min = screen.getByRole<HTMLInputElement>('textbox', {
      name: 'Minimum level',
    })
    const max = screen.getByRole<HTMLInputElement>('textbox', {
      name: 'Maximum level',
    })
    const rail = popoverContent()
      .querySelector(`.${Classes.SLIDER_TRACK}`)!
      .getBoundingClientRect()
    const left = min.getBoundingClientRect()
    const right = max.getBoundingClientRect()
    await expect(left.right).toBeLessThan(rail.left)
    await expect(rail.right).toBeLessThan(right.left)
    for (const field of [left, right]) {
      const offset = field.top + field.height / 2 - (rail.top + rail.height / 2)
      await expect(Math.abs(offset)).toBeLessThanOrEqual(1)
    }
  },
}

export const NarrowLayout: Story = {
  name: 'Narrow panel uses one status column and keeps level alignment',
  parameters: {
    shipInfo: {
      dimensions: { height: 640, width: 420 },
      state: tableState(),
    },
  },
  play: async ({ canvasElement }) => {
    await openPopover(canvasElement, 'Filter')
    // The portal follows the browser viewport, not the story surface; pin the
    // panel to the same width as this narrow scenario.
    const panel = nav().parentElement as HTMLElement
    panel.style.width = '357px'
    await waitFor(() => {
      expect(panel.getBoundingClientRect().width).toBeLessThan(400)
    })

    // Navigation wraps instead of clipping: every label and the reset control
    // stay fully inside the panel.
    const navigation = nav()
    await waitFor(() => {
      const navRect = navigation.getBoundingClientRect()
      expect(navigation.scrollWidth).toBeLessThanOrEqual(
        navigation.clientWidth + 1,
      )
      for (const button of within(navigation).getAllByRole('button')) {
        const rect = button.getBoundingClientRect()
        expect(rect.left).toBeGreaterThanOrEqual(navRect.left - 1)
        expect(rect.right).toBeLessThanOrEqual(navRect.right + 1)
        expect(rect.width).toBeGreaterThan(0)
      }
    })
    await expect(
      within(navigation).getByRole('button', { name: 'Value Type' }),
    ).toBeTruthy()
    await expect(
      within(navigation).getByRole('button', {
        name: 'Reset filters and sorting',
      }),
    ).toBeTruthy()
    await expect(getComputedStyle(sections()).overflowY).toBe('auto')
    await expect(columnCount(statusGrid())).toBe(1)

    const statusHeading = within(popoverContent()).getByRole('heading', {
      name: 'Status',
    })
    const levelHeading = within(popoverContent()).getByRole('heading', {
      name: 'Level',
    })
    for (const property of [
      'fontFamily',
      'fontSize',
      'fontWeight',
      'lineHeight',
    ] as const) {
      await expect(getComputedStyle(statusHeading)[property]).toBe(
        getComputedStyle(levelHeading)[property],
      )
    }

    const min = screen.getByRole<HTMLInputElement>('textbox', {
      name: 'Minimum level',
    })
    const max = screen.getByRole<HTMLInputElement>('textbox', {
      name: 'Maximum level',
    })
    const rail = popoverContent()
      .querySelector(`.${Classes.SLIDER_TRACK}`)!
      .getBoundingClientRect()
    const left = min.getBoundingClientRect()
    const right = max.getBoundingClientRect()
    await expect(left.right).toBeLessThan(rail.left)
    await expect(rail.right).toBeLessThan(right.left)
    for (const field of [left, right]) {
      const offset = field.top + field.height / 2 - (rail.top + rail.height / 2)
      await expect(Math.abs(offset)).toBeLessThanOrEqual(1)
    }

    // The status page is a single column but each label stays inline with its
    // yes/no controls.
    await expect(
      getComputedStyle(
        within(filterSection('Status')).getByRole('heading', { name: 'Lock' })
          .parentElement as HTMLElement,
      ).gridTemplateColumns.split(' ').filter(Boolean),
    ).toHaveLength(2)
  },
}
