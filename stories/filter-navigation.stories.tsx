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

const modifiedChip = (label: string): HTMLElement | null =>
  navButton(label).querySelector('.filter-nav-modified')

const expectModifiedChip = async (label: string): Promise<void> => {
  await waitFor(() => {
    const chip = modifiedChip(label)
    expect(chip).toBeTruthy()
    expect(chip?.textContent).toContain('Modified')
    expect(chip?.getBoundingClientRect().width).toBeGreaterThan(0)
    const style = getComputedStyle(chip as HTMLElement)
    expect(getContrast(style.backgroundColor, style.color)).toBeGreaterThanOrEqual(
      4.5,
    )
  })
}

const expectNoModifiedChip = (label: string): void => {
  expect(modifiedChip(label)).toBeNull()
}

const expectActiveStyle = async (label: string): Promise<void> => {
  await waitFor(() => {
    const button = navButton(label)
    const style = getComputedStyle(button)
    expect(button.className).toContain('bp6-intent-primary')
    expect(style.backgroundColor).not.toBe('rgba(0, 0, 0, 0)')
    expect(getContrast(style.backgroundColor, style.color)).toBeGreaterThanOrEqual(
      4.5,
    )
  })
}

const expectNavLabelCentered = async (label: string): Promise<void> => {
  await waitFor(() => {
    const button = navButton(label)
    const name = button.querySelector('.filter-nav-name') as HTMLElement
    const chip = button.querySelector('.filter-nav-modified') as HTMLElement
    expect(name).toBeTruthy()
    expect(chip).toBeTruthy()
    const center = (element: HTMLElement) => {
      const rect = element.getBoundingClientRect()
      return rect.top + rect.height / 2
    }
    expect(Math.abs(center(name) - center(chip))).toBeLessThanOrEqual(1)
  })
}

const columnCount = (element: HTMLElement): number =>
  getComputedStyle(element).gridTemplateColumns.split(' ').filter(Boolean).length

const rgbColor = (hex: string): string => {
  const h = hex.replace('#', '')
  return `rgb(${parseInt(h.slice(0, 2), 16)}, ${parseInt(
    h.slice(2, 4),
    16,
  )}, ${parseInt(h.slice(4, 6), 16)})`
}

async function expectToolbarFits(): Promise<HTMLElement> {
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
  return navigation
}

const tagNames = upstreamShiptag.mapname
const tagSection = (): HTMLElement => filterSection('Sally Area')

const tagCards = (): HTMLElement[] =>
  tagNames.map(
    (name) =>
      within(tagSection())
        .getByRole('checkbox', { name })
        .closest('label') as HTMLElement,
  )

const tagInput = (name: string): HTMLInputElement =>
  within(tagSection()).getByRole<HTMLInputElement>('checkbox', { name })

const tagIndicator = (name: string): HTMLElement =>
  tagCards()[tagNames.indexOf(name)].querySelector(
    '.bp6-control-indicator',
  ) as HTMLElement

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
  name: 'Section jumps, filled active state and sticky headings on a short page',
  parameters: {
    shipInfo: {
      dimensions: { height: 640, width: 980 },
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
    const heading = (label: string) =>
      within(popoverContent()).getByRole('heading', { name: label })

    await expect(nav().querySelectorAll('[aria-current="location"]')).toHaveLength(
      1,
    )
    await activeSection('Ship types')
    await expectActiveStyle('Ship types')
    expectNoModifiedChip('Ship types')
    await expect(getComputedStyle(heading('Ship types')).position).toBe(
      'sticky',
    )
    for (const label of ['Level', 'Sally Area', 'Status', 'Value Type']) {
      await expect(getComputedStyle(heading(label)).position).toBe('static')
    }
    const activeBackground = getComputedStyle(
      navButton('Ship types'),
    ).backgroundColor
    await expect(
      getComputedStyle(navButton('Level')).backgroundColor,
    ).not.toBe(activeBackground)

    // Inactive hover stays visually distinct from the filled active state.
    await userEvent.hover(navButton('Level'))
    await waitFor(() => {
      expect(
        getComputedStyle(navButton('Level')).backgroundColor,
      ).not.toBe(activeBackground)
    })
    await userEvent.unhover(navButton('Level'))

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
      await expectActiveStyle(label)
      await expect(getComputedStyle(heading(label)).position).toBe('sticky')
      if (label === 'Sally Area') {
        // The previous heading scrolls naturally instead of pinning over the
        // still-visible Level fields when this jump clamps.
        await expect(getComputedStyle(heading('Level')).position).toBe(
          'static',
        )
      }
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
    const heading = (label: string) =>
      within(popoverContent()).getByRole('heading', { name: label })
    await expect(getComputedStyle(heading('Value Type')).position).toBe(
      'sticky',
    )
    await expect(getComputedStyle(heading('Status')).position).toBe('static')

    // A deliberate jump that clamps at the bottom keeps its clicked section.
    await userEvent.click(navButton('Status'))
    await activeSection('Status')
  },
}

export const ModifiedMarkersAndReset: Story = {
  name: 'Modified chips mark each changed section and reset restores defaults',
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
      await expectModifiedChip(label)
    }
    for (const label of ['Ship types', 'Sally Area']) {
      await expect(navButton(label).getAttribute('data-dirty')).toBeNull()
      expectNoModifiedChip(label)
    }

    // Restricted status rows use native visible checkboxes and accent
    // the row label; the default neutral state returns after reset.
    const lockHeading = within(filterSection('Status')).getByRole('heading', {
      name: 'Lock',
    })
    const lockRow = lockHeading.parentElement as HTMLElement
    const lockYes = within(lockRow).getByRole<HTMLInputElement>('checkbox', {
      name: 'Yes',
    })
    const lockNo = within(lockRow).getByRole<HTMLInputElement>('checkbox', {
      name: 'No',
    })
    await expect(lockYes.checked).toBe(false)
    await expect(lockNo.checked).toBe(true)
    const lockYesIndicator = (lockYes.closest('label') as HTMLElement).querySelector(
      '.bp6-control-indicator',
    ) as HTMLElement
    await expect(lockYesIndicator).toBeTruthy()
    await expect(lockYesIndicator.getBoundingClientRect().width).toBeGreaterThan(
      0,
    )
    await expect(
      getComputedStyle(lockYesIndicator).marginInlineEnd,
    ).toBe('4px')
    await expect(getComputedStyle(lockHeading).fontWeight).toBe('600')
    const darkSurface = getComputedStyle(nav().parentElement as HTMLElement)
      .backgroundColor
    await expect(
      getContrast(darkSurface, getComputedStyle(lockHeading).color),
    ).toBeGreaterThanOrEqual(4.5)
    const lockHoverTarget = lockNo.closest('label') as HTMLElement
    await userEvent.hover(lockHoverTarget)
    await waitFor(() => {
      expect(
        getContrast(darkSurface, getComputedStyle(lockHeading).color),
      ).toBeGreaterThanOrEqual(4.5)
      expect(
        getContrast(
          darkSurface,
          getComputedStyle(lockHoverTarget).color,
        ),
      ).toBeGreaterThanOrEqual(4.5)
    })
    await userEvent.unhover(lockHoverTarget)

    // The active dirty section shows both the filled active state and its chip.
    await userEvent.click(navButton('Level'))
    await activeSection('Level')
    await expectActiveStyle('Level')
    await expectModifiedChip('Level')
    await expectNavLabelCentered('Level')
    await expect(
      getComputedStyle(modifiedChip('Level') as HTMLElement).backgroundColor,
    ).not.toBe(getComputedStyle(navButton('Level')).backgroundColor)

    const reset = within(nav()).getByRole('button', {
      name: 'Reset filters and sorting',
    })
    await expect(reset.textContent).toContain('Reset filters and sorting')
    reset.focus()
    await userEvent.keyboard('{Enter}')

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
    await expect(document.activeElement).toBe(reset)
    const resetLockRow = within(filterSection('Status')).getByRole('heading', {
      name: 'Lock',
    }).parentElement as HTMLElement
    await expect(
      within(resetLockRow).getByRole<HTMLInputElement>('checkbox', {
        name: 'Yes',
      }).checked,
    ).toBe(true)
    await expect(
      within(resetLockRow).getByRole<HTMLInputElement>('checkbox', {
        name: 'No',
      }).checked,
    ).toBe(true)
    await expect(
      getComputedStyle(
        within(resetLockRow).getByRole('heading', { name: 'Lock' }),
      ).fontWeight,
    ).toBe('400')
    await expect(
      getContrast(
        getComputedStyle(nav().parentElement as HTMLElement).backgroundColor,
        getComputedStyle(
          within(resetLockRow).getByRole('heading', { name: 'Lock' }),
        ).color,
      ),
    ).toBeGreaterThanOrEqual(4.5)
    await expect(
      screen.getByRole<HTMLInputElement>('textbox', { name: 'Minimum level' }),
    ).toHaveValue('0')
    await waitForRows(canvasElement, ALL_ROWS)
    await expect(headerTitles(canvasElement).slice(0, 2)).toEqual(['Name', 'ID'])
    await expect(headerTitles(canvasElement)).not.toContain('Class')
  },
}

export const NarrowLightDirtyStates: Story = {
  name: 'Narrow light toolbar keeps active and modified hierarchy visible',
  parameters: {
    shipInfo: {
      dimensions: { height: 640, width: 420 },
      state: filterTagState(seededResetState()),
      theme: 'light',
    },
  },
  play: async ({ canvasElement }) => {
    await openPopover(canvasElement, 'Filter')
    const panel = nav().parentElement as HTMLElement
    panel.style.width = '357px'
    await waitFor(() => {
      expect(panel.getBoundingClientRect().width).toBeGreaterThan(356)
    })
    const navigation = await expectToolbarFits()

    await activeSection('Ship types')
    await expectActiveStyle('Ship types')
    expectNoModifiedChip('Ship types')
    for (const label of ['Level', 'Status', 'Value Type']) {
      await expectModifiedChip(label)
    }
    await expectNavLabelCentered('Value Type')
    await expectNavLabelCentered('Value Type')
    const lightLock = within(filterSection('Status')).getByRole('heading', {
      name: 'Lock',
    })
    const lightSurface = getComputedStyle(panel).backgroundColor
    await expect(getComputedStyle(lightLock).fontWeight).toBe('600')
    await expect(
      getContrast(lightSurface, getComputedStyle(lightLock).color),
    ).toBeGreaterThanOrEqual(4.5)
    const lightLockRow = lightLock.parentElement as HTMLElement
    const lightLockNo = within(lightLockRow).getByRole<HTMLInputElement>(
      'checkbox',
      { name: 'No' },
    )
    const lightLockHoverTarget = lightLockNo.closest('label') as HTMLElement
    await userEvent.hover(lightLockHoverTarget)
    await waitFor(() => {
      expect(
        getContrast(lightSurface, getComputedStyle(lightLock).color),
      ).toBeGreaterThanOrEqual(4.5)
      expect(
        getContrast(
          lightSurface,
          getComputedStyle(lightLockHoverTarget).color,
        ),
      ).toBeGreaterThanOrEqual(4.5)
    })
    await userEvent.unhover(lightLockHoverTarget)

    await userEvent.click(navButton('Level'))
    await activeSection('Level')
    await expectActiveStyle('Level')
    await expectModifiedChip('Level')
    await expectNavLabelCentered('Level')
    await expect(
      getComputedStyle(modifiedChip('Level') as HTMLElement).backgroundColor,
    ).not.toBe(getComputedStyle(navButton('Level')).backgroundColor)

    const reset = within(navigation).getByRole('button', {
      name: 'Reset filters and sorting',
    })
    await expect(reset.textContent).toContain('Reset filters and sorting')
    reset.focus()
    await userEvent.keyboard('{Enter}')
    await waitFor(() => {
      expect(
        getEnvironment().store.getState().config.plugin.ShipInfo,
      ).toMatchObject({
        filters: { maxLevel: 450, minLevel: 0 },
        locked: [true, true],
        rawValue: 0,
        sortName: 'lv',
        sortOrder: 0,
      })
    })
    await expect(document.activeElement).toBe(reset)
    await expect(
      nav().querySelectorAll('[data-dirty="true"]'),
    ).toHaveLength(0)
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
      for (const name of tagNames) {
        const index = tagNames.indexOf(name)
        const card = tagCards()[index]
        const style = getComputedStyle(card)
        const indicator = tagIndicator(name)
        expect(tagInput(name).checked).toBe(true)
        expect(style.backgroundColor).toBe(rgbColor(upstreamShiptag.color[index]))
        expect(style.borderColor).toBe(rgbColor(upstreamShiptag.color[index]))
        expect(getContrast(style.backgroundColor, style.color)).toBeGreaterThanOrEqual(
          4.5,
        )
        expect(indicator).toBeTruthy()
        expect(indicator.offsetWidth).toBeGreaterThan(0)
      }
    })

    // The All control becomes unchecked when any tag is filtered out; it must
    // remain readable on the light surface.
    const all = within(tagSection()).getByRole<HTMLInputElement>('checkbox', {
      name: 'All',
    })
    await userEvent.click(all.closest('label') as HTMLElement)
    await waitFor(() => {
      expect(all.checked).toBe(false)
      const label = all.closest('label') as HTMLElement
      const style = getComputedStyle(label)
      const surface = getComputedStyle(nav().parentElement as HTMLElement)
        .backgroundColor
      expect(getComputedStyle(label).cursor).toBe('pointer')
      expect(getContrast(surface, style.color)).toBeGreaterThanOrEqual(4.5)
      expect(getContrast(surface, style.borderColor)).toBeGreaterThanOrEqual(3)
    })
  },
}

export const TagContrastDark: Story = {
  name: 'Pale and saturated tag foregrounds meet 4.5:1 in dark theme',
  parameters: {
    shipInfo: {
      theme: 'dark',
      state: filterTagState(),
    },
  },
  play: async ({ canvasElement }) => {
    await openPopover(canvasElement, 'Filter')
    await expectAllRealTags()
    await waitFor(() => {
      for (const name of tagNames) {
        const index = tagNames.indexOf(name)
        const style = getComputedStyle(tagCards()[index])
        expect(style.backgroundColor).toBe(rgbColor(upstreamShiptag.color[index]))
        expect(style.borderColor).toBe(rgbColor(upstreamShiptag.color[index]))
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
      expect(panel.getBoundingClientRect().width).toBeGreaterThan(356)
    })
    await expectAllRealTags()

    // Selecting the last real tag via its native checkbox keyboard path also
    // marks the Sally Area section dirty.
    const lastTag = upstreamShiptag.mapname[upstreamShiptag.mapname.length - 1]
    const lastInput = within(tagSection()).getByRole<HTMLInputElement>(
      'checkbox',
      { name: lastTag },
    )
    const lastCard = lastInput.closest('label') as HTMLElement
    const lastIndicator = tagIndicator(lastTag)
    const lastWidth = lastCard.offsetWidth
    const indicatorWidth = lastIndicator.offsetWidth
    await expect(lastInput.checked).toBe(true)
    await expect(lastIndicator.offsetWidth).toBeGreaterThan(0)
    lastInput.focus()
    await userEvent.keyboard(' ')
    await waitFor(() => {
      const checked =
        getEnvironment().store.getState().config.plugin.ShipInfo
          .sallyAreaChecked
      expect(checked[upstreamShiptag.mapname.length]).toBe(false)
    })
    await expect(lastInput.checked).toBe(false)
    await expect(lastCard.offsetWidth).toBe(lastWidth)
    await expect(lastIndicator.offsetWidth).toBe(indicatorWidth)
    await expect(
      navButton('Sally Area').getAttribute('data-dirty'),
    ).toBe('true')
    await expect(
      navButton('Sally Area').getAttribute('aria-label'),
    ).toContain('Modified')
    await expectModifiedChip('Sally Area')

    // Navigation wraps instead of clipping: every label and the reset control
    // stay fully inside the panel.
    const navigation = await expectToolbarFits()
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
