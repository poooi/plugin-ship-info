import { Classes } from '@blueprintjs/core'
import type { Meta, StoryObj } from '@storybook/react-vite'
import React from 'react'
import {
  expect,
  fireEvent,
  screen,
  userEvent,
  waitFor,
  within,
} from 'storybook/test'

import { getEnvironment } from '../preview/scenario'
import { tableState } from '../preview/table-fixtures'
import { Bookmarks } from '../packages/ship-info/src/views/sidebar/bookmarks'
import { Filter } from '../packages/ship-info/src/views/sidebar/filter'
import { PLUGIN_KEY } from '../packages/ship-info/src/views/redux'
import { TableView } from '../packages/ship-info/src/views/table'
import {
  headerTitles,
  openPopover,
  renderedNames,
} from './table-support'

const FilterBookmarks: React.FC = () => (
  <>
    <TableView />
    <Filter />
    <Bookmarks />
  </>
)

const meta = {
  title: 'Filter/Bookmarks',
  component: FilterBookmarks,
  // Each story supplies its own host state; several need a non-default roster.
} satisfies Meta<typeof FilterBookmarks>

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

const pluginConfig = () =>
  getEnvironment().store.getState().config.plugin.ShipInfo

const bookmarks = () =>
  getEnvironment().store.getState()[PLUGIN_KEY].bookmark as Record<
    string,
    any
  >

const panel = (): HTMLElement => {
  const contents = document.querySelectorAll<HTMLElement>(
    '.bp6-popover-content',
  )
  return contents[contents.length - 1]
}

const filterSection = (heading: string): HTMLElement =>
  within(panel()).getByRole('heading', { name: heading })
    .parentElement as HTMLElement

const activeBackdrop = (): HTMLElement | undefined => {
  const backdrops = Array.from(
    document.querySelectorAll<HTMLElement>(`.${Classes.OVERLAY_BACKDROP}`),
  ).filter((element) => getComputedStyle(element).pointerEvents !== 'none')
  return backdrops[backdrops.length - 1]
}

async function closePopover(
  canvasElement: HTMLElement,
  name: string,
): Promise<void> {
  let backdrop: HTMLElement | undefined
  await waitFor(() => {
    backdrop = activeBackdrop()
    expect(backdrop, `${name} backdrop`).toBeTruthy()
  })
  await userEvent.click(backdrop!)
  await waitFor(() => {
    expect(
      within(canvasElement)
        .getByRole('button', { name })
        .getAttribute('aria-expanded'),
    ).toBe('false')
  })
}

async function openBookmarks(canvasElement: HTMLElement): Promise<void> {
  await userEvent.click(
    within(canvasElement).getByRole('button', { name: 'Bookmarks' }),
  )
  await screen.findByPlaceholderText('Bookmark name')
}

async function waitForRows(
  root: HTMLElement,
  expected: string[],
): Promise<void> {
  await waitFor(async () => {
    await expect(renderedNames(root)).toEqual(expected)
  })
}

export const DefaultBookmarkRestoresDefaults: Story = {
  name: 'A default bookmark restores default filters over non-default state',
  parameters: {
    shipInfo: {
      state: tableState({
        config: {
          plugin: { ShipInfo: { columnVisibility: { type: false } } },
          poi: { appearance: { avatar: false } },
        },
      }),
    },
  },
  play: async ({ canvasElement }) => {
    // Save while the filter config is still entirely implicit.
    await openBookmarks(canvasElement)
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Bookmark name' }),
      'Default',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => {
      expect(Object.keys(bookmarks())).toEqual(['Default'])
    })
    await expect(bookmarks().Default.locked).toEqual([true, true])
    await expect(bookmarks().Default.filters).toEqual({
      maxLevel: 450,
      minLevel: 0,
    })
    await closePopover(canvasElement, 'Bookmarks')

    // Make filters and values non-default through the real controls.
    await openPopover(canvasElement, 'Filter')
    await userEvent.click(
      within(filterSection('Lock'))
        .getByRole('checkbox', { name: 'No' })
        .closest('label') as HTMLElement,
    )
    const minimum = screen.getByRole<HTMLInputElement>('textbox', {
      name: 'Minimum level',
    })
    fireEvent.change(minimum, { target: { value: '80' } })
    // Level writes are immediate, so a fast close/save cannot miss the value.
    await expect(pluginConfig().filters.minLevel).toBe(80)
    await userEvent.click(
      within(filterSection('Sally Area'))
        .getByRole('checkbox', { name: 'E1' })
        .closest('label') as HTMLElement,
    )
    await userEvent.click(
      within(panel()).getByText('Raw Value').closest('label') as HTMLElement,
    )
    await waitFor(() => {
      expect(pluginConfig().rawValue).toBe(1)
    })
    await expect(pluginConfig().locked).toEqual([true, false])
    await closePopover(canvasElement, 'Filter')

    // Applying the default preset replaces all bookmark-owned filter state.
    await openBookmarks(canvasElement)
    await userEvent.click(screen.getByRole('button', { name: 'Default' }))
    await waitFor(() => {
      expect(pluginConfig()).toMatchObject({
        filters: { maxLevel: 450, minLevel: 0 },
        locked: [true, true],
        rawValue: 0,
        sallyAreaChecked: [true, true, true],
        shipTypes: 0,
        sortName: 'lv',
        sortOrder: 0,
      })
    })
    await waitForRows(canvasElement, ALL_ROWS)
    // Column preferences are unrelated to a filter bookmark.
    await expect(pluginConfig().columnVisibility).toEqual({ type: false })
    await expect(headerTitles(canvasElement)).not.toContain('Class')
  },
}

export const SaveApplyOverwriteDelete: Story = {
  name: 'Bookmarks save, overwrite, apply and delete literal names',
  parameters: { shipInfo: { state: tableState() } },
  play: async ({ canvasElement }) => {
    await openPopover(canvasElement, 'Filter')
    const minimum = screen.getByRole<HTMLInputElement>('textbox', {
      name: 'Minimum level',
    })
    fireEvent.change(minimum, { target: { value: '80' } })
    await expect(pluginConfig().filters.minLevel).toBe(80)
    await closePopover(canvasElement, 'Filter')

    // Names are trimmed before comparing with the existing keys.
    await openBookmarks(canvasElement)
    const name = screen.getByRole<HTMLInputElement>('textbox', {
      name: 'Bookmark name',
    })
    await userEvent.type(name, '  Combat  ')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => {
      expect(Object.keys(bookmarks())).toEqual(['Combat'])
    })
    await expect(bookmarks().Combat.filters.minLevel).toBe(80)

    await userEvent.type(name, ' Combat ')
    await expect(screen.getByRole('button', { name: 'Overwrite' })).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Overwrite' }))
    await waitFor(() => {
      expect(Object.keys(bookmarks())).toEqual(['Combat'])
    })

    // Save a second, literally dotted name with different level bounds.
    getEnvironment().setConfig('plugin.ShipInfo.filters', {
      maxLevel: 450,
      minLevel: 0,
    })
    await userEvent.type(name, 'E1.clear')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => {
      expect(Object.keys(bookmarks()).sort()).toEqual(['Combat', 'E1.clear'])
    })
    await closePopover(canvasElement, 'Bookmarks')

    getEnvironment().setConfig('plugin.ShipInfo.filters', {
      maxLevel: 50,
      minLevel: 0,
    })
    await openBookmarks(canvasElement)
    await userEvent.click(screen.getByRole('button', { name: 'Combat' }))
    await waitFor(() => {
      expect(pluginConfig().filters).toEqual({ maxLevel: 450, minLevel: 80 })
    })

    // Reopening the filter restores the saved level range into both controls.
    await closePopover(canvasElement, 'Bookmarks')
    await openPopover(canvasElement, 'Filter')
    await expect(
      screen.getByRole<HTMLInputElement>('textbox', {
        name: 'Minimum level',
      }),
    ).toHaveValue('80')
    const restoredMin = document.querySelector(
      `.${Classes.SLIDER_HANDLE}`,
    ) as HTMLElement
    await expect(restoredMin.getAttribute('aria-valuenow')).toBe('80')
    await closePopover(canvasElement, 'Filter')

    await openBookmarks(canvasElement)
    await userEvent.click(screen.getByRole('button', { name: 'E1.clear' }))
    await waitFor(() => {
      expect(pluginConfig().filters).toEqual({ maxLevel: 450, minLevel: 0 })
    })

    // Deleting a dotted name must not touch the other preset.
    await userEvent.click(
      screen.getByRole('button', { name: 'Delete bookmark E1.clear' }),
    )
    await waitFor(() => {
      expect(Object.keys(bookmarks())).toEqual(['Combat'])
    })
    await expect(
      screen.queryByRole('button', { name: 'E1.clear' }),
    ).toBeNull()
    await expect(
      screen.getByRole('button', { name: 'Combat' }),
    ).toBeTruthy()
  },
}

export const LegacyRadioSnapshot: Story = {
  name: 'Legacy lvRadio and yes/no radios migrate with exact bounds',
  parameters: {
    shipInfo: {
      state: tableState({
        [PLUGIN_KEY]: {
          bookmark: {
            'v7.snapshot': {
              exSlotRadio: 2,
              lockedRadio: 2,
              lvRadio: 3,
              name: 'v7.snapshot',
              sparkleRadio: 2,
              sortName: 'id',
              sortOrder: 1,
            },
          },
          error: null,
          ready: true,
          ui: {},
        },
      }),
    },
  },
  play: async ({ canvasElement }) => {
    await openBookmarks(canvasElement)
    await userEvent.click(screen.getByRole('button', { name: 'v7.snapshot' }))

    await waitFor(() => {
      expect(pluginConfig()).toMatchObject({
        exSlot: [false, true],
        filters: { maxLevel: 450, minLevel: 100 },
        locked: [false, true],
        sortName: 'id',
        sortOrder: 1,
        sparkle: [false, true],
      })
    })
    await expect(pluginConfig()).not.toHaveProperty('lvRadio')
    await waitForRows(canvasElement, ['Gamma', 'Zeta'])
  },
}

export const SavedEventTagMask: Story = {
  name: 'Saved event tag masks reconcile to the current map count',
  parameters: {
    shipInfo: {
      state: tableState({
        config: {
          plugin: { ShipInfo: { columnVisibility: { type: false } } },
          poi: { appearance: { avatar: false } },
        },
        [PLUGIN_KEY]: {
          bookmark: {
            'wide.tags': {
              filters: { maxLevel: 450, minLevel: 0 },
              name: 'wide.tags',
              sallyAreaChecked: [true, false, true, false],
              sortName: 'lv',
              sortOrder: 0,
            },
          },
          error: null,
          ready: true,
          ui: {},
        },
      }),
    },
  },
  play: async ({ canvasElement }) => {
    await openBookmarks(canvasElement)
    await userEvent.click(screen.getByRole('button', { name: 'wide.tags' }))

    await waitFor(() => {
      expect(pluginConfig().sallyAreaChecked).toEqual([true, true, true])
    })
    await expect(pluginConfig().columnVisibility).toEqual({ type: false })
    await waitForRows(canvasElement, ALL_ROWS)
    await closePopover(canvasElement, 'Bookmarks')

    await openPopover(canvasElement, 'Filter')
    const areas = filterSection('Sally Area')
    await expect(
      within(areas).getByRole<HTMLInputElement>('checkbox', { name: 'E1' })
        .checked,
    ).toBe(true)
    await expect(
      within(areas).getByRole<HTMLInputElement>('checkbox', { name: 'E2' })
        .checked,
    ).toBe(true)
  },
}

export const LegacyBookmark: Story = {
  name: 'Legacy records migrate while unrelated current preferences survive',
  parameters: {
    shipInfo: {
      state: tableState({
        config: {
          plugin: { ShipInfo: { columnVisibility: { lv: false } } },
          poi: { appearance: { avatar: false } },
        },
        [PLUGIN_KEY]: {
          bookmark: {
            'old.set': {
              bounds: { height: 1, width: 1 },
              columnVisibility: { type: false },
              filters: { maxLevel: 50 },
              name: 'old.set',
              shipTypeChecked: [
                true,
                true,
                false,
                false,
                false,
                false,
                false,
                false,
              ],
              sortName: 'id',
              sortOrder: 1,
            },
          },
          error: null,
          ready: true,
          ui: {},
        },
      }),
    },
  },
  play: async ({ canvasElement }) => {
    await openBookmarks(canvasElement)
    await userEvent.click(screen.getByRole('button', { name: 'old.set' }))

    await waitFor(() => {
      expect(pluginConfig()).toMatchObject({
        filters: { maxLevel: 50, minLevel: 0 },
        shipTypes: 448,
        sortName: 'id',
        sortOrder: 1,
      })
    })
    await expect(pluginConfig()).not.toHaveProperty('shipTypeChecked')
    await expect(pluginConfig()).not.toHaveProperty('bounds')
    // The legacy snapshot's own column visibility is ignored.
    await expect(pluginConfig().columnVisibility).toEqual({ lv: false })
    await expect(headerTitles(canvasElement)).not.toContain('Level')
    await expect(headerTitles(canvasElement)).toContain('Class')
    await waitForRows(canvasElement, ['Alpha', 'Beta', 'Theta'])
  },
}
