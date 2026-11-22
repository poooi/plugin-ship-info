import { Classes } from '@blueprintjs/core'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { getContrast } from 'polished'
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
import {
  filterTagState,
  upstreamShipTypes,
  upstreamShiptag,
} from './filter-tag-fixtures'

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

const tagNames = upstreamShiptag.mapname
const tagSection = (): HTMLElement => filterSection('Sally Area')

const tagCards = (): HTMLElement[] =>
  tagNames.map(
    (name) =>
      within(tagSection())
        .getByRole('checkbox', { name })
        .closest('label') as HTMLElement,
  )

async function expectAllRealTags(): Promise<void> {
  await waitFor(() => {
    const section = tagSection()
    const sectionRect = section.getBoundingClientRect()
    const cards = tagCards()
    expect(cards).toHaveLength(13)
    for (const card of cards) {
      const rect = card.getBoundingClientRect()
      expect(rect.left).toBeGreaterThanOrEqual(sectionRect.left - 1)
      expect(rect.right).toBeLessThanOrEqual(sectionRect.right + 1)
      expect(rect.width).toBeGreaterThan(0)
    }
    expect(section.scrollWidth).toBeLessThanOrEqual(section.clientWidth + 1)
    expect(
      new Set(cards.map((card) => Math.round(card.getBoundingClientRect().top)))
        .size,
    ).toBeGreaterThan(1)

    // The real master list also makes the top group representative: all 22
    // individual types are present, not only the eight fixture abbreviations.
    expect(Object.keys(upstreamShipTypes)).toHaveLength(22)
    const individual = filterSection('Ship types').children[2] as HTMLElement
    expect(within(individual).getAllByRole('checkbox')).toHaveLength(22)
  })
}

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

export const ManualScrollAtBottom: Story = {
  name: 'Manual bottom scroll activates Value Type without breaking clamped jumps',
  parameters: {
    shipInfo: {
      dimensions: { height: 420, width: 900 },
      state: tableState(),
    },
  },
  play: async ({ canvasElement }) => {
    await openPopover(canvasElement, 'Filter')
    const panel = nav().parentElement as HTMLElement
    const page = sections()

    // No overflow: a scroll event must not jump the active section to the end.
    panel.style.maxHeight = 'none'
    page.style.flex = '0 0 auto'
    page.style.height = 'auto'
    await waitFor(() => {
      expect(page.scrollHeight).toBeLessThanOrEqual(page.clientHeight + 1)
    })
    fireEvent.scroll(page)
    await activeSection('Ship types')

    // With overflow, a manual bottom scroll activates the final short section.
    page.style.flex = '0 0 150px'
    page.style.height = '150px'
    await waitFor(() => {
      expect(page.scrollHeight).toBeGreaterThan(page.clientHeight + 1)
    })
    page.scrollTop = 0
    fireEvent.scroll(page)
    await activeSection('Ship types')
    page.scrollTop = page.scrollHeight - page.clientHeight
    fireEvent.scroll(page)
    await activeSection('Value Type')

    // A deliberate jump that clamps at the bottom keeps its clicked section.
    await userEvent.click(navButton('Status'))
    await activeSection('Status')
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

export const TagContrastLight: Story = {
  name: 'Pale and saturated tag foregrounds meet 4.5:1 in light theme',
  parameters: {
    shipInfo: {
      theme: 'light',
      state: filterTagState(),
    },
  },
  play: async ({ canvasElement }) => {
    await openPopover(canvasElement, 'Filter')
    await expectAllRealTags()
    await waitFor(() => {
      for (const card of tagCards()) {
        const style = getComputedStyle(card)
        expect(style.backgroundColor).not.toBe('rgba(0, 0, 0, 0)')
        expect(getContrast(style.backgroundColor, style.color)).toBeGreaterThanOrEqual(
          4.5,
        )
      }
    })
  },
}

export const WideLayout: Story = {
  name: 'Wide panel uses two status columns and aligned level controls',
  parameters: {
    shipInfo: {
      dimensions: { height: 640, width: 900 },
      state: filterTagState(),
    },
  },
  play: async ({ canvasElement }) => {
    await openPopover(canvasElement, 'Filter')
    await expectAllRealTags()
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
      state: filterTagState(),
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
    await expectAllRealTags()

    // Selecting the last real tag also marks the Sally Area section dirty.
    const lastTag = upstreamShiptag.mapname[upstreamShiptag.mapname.length - 1]
    await userEvent.click(
      within(tagSection())
        .getByRole('checkbox', { name: lastTag })
        .closest('label') as HTMLElement,
    )
    await waitFor(() => {
      const checked =
        getEnvironment().store.getState().config.plugin.ShipInfo
          .sallyAreaChecked
      expect(checked[upstreamShiptag.mapname.length]).toBe(false)
    })
    await expect(
      navButton('Sally Area').getAttribute('data-dirty'),
    ).toBe('true')
    await expect(
      navButton('Sally Area').getAttribute('aria-label'),
    ).toContain('Modified')
    await expect(navButton('Sally Area').textContent).toContain('•')

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
