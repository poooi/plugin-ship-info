import { Classes } from '@blueprintjs/core'
import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  expect,
  fireEvent,
  screen,
  userEvent,
  waitFor,
  within,
} from 'storybook/test'

import type { PlannerScenarioOptions } from '../preview/planner-fixtures'
import {
  plannerScenarioState,
  plannerSlice,
  plannerTaggedShips,
} from '../preview/planner-fixtures'
import { getEnvironment } from '../preview/scenario'
import { reactClass as NavyStaff } from '../packages/navy-staff/src/views'

const CARD = `.${Classes.CARD}`
const TAG = `.${Classes.TAG}`

// Storybook deep-merges story parameters over meta parameters, so a single
// meta-level state would leak its nested ship maps into every override. Each
// story therefore supplies its complete scenario state through this helper.
const params = (options?: PlannerScenarioOptions) => ({
  shipInfo: { plugin: 'navy-staff' as const, state: plannerScenarioState(options) },
})

// Wait until Blueprint's overlay entrance has moved focus inside the most
// recently opened overlay. Until then autoFocus may steal focus mid-keystroke
// (which silently drops characters from a `userEvent.type`). This observes the
// real focus/transition state instead of sleeping.
const waitForOverlayFocus = () =>
  waitFor(() => {
    const overlays = Array.from(
      document.querySelectorAll<HTMLElement>(
        `.${Classes.OVERLAY}.${Classes.OVERLAY_OPEN}`,
      ),
    )
    const overlay = overlays[overlays.length - 1]
    expect(overlay, 'an open overlay').toBeTruthy()
    expect(
      overlay.contains(document.activeElement),
      'focus is inside the topmost overlay',
    ).toBe(true)
  })

// Navy Staff's tabs are the main view; there is no sidebar button or dialog.
const openPlanner = async () => {
  await expect(await screen.findByRole('tab', { name: 'Area View' })).toBeTruthy()
  return document.querySelector('#poi-plugin-navy-staff') as HTMLElement
}

const areaCard = (name: string) =>
  screen
    .getByRole('heading', { level: 5, name: new RegExp(name) })
    .closest(CARD) as HTMLElement

const chipFor = (area: string, name: string) =>
  within(areaCard(area))
    .getByText(new RegExp(name))
    .closest(TAG) as HTMLElement

const openAddShip = async (area: string) => {
  await userEvent.click(
    within(areaCard(area)).getByRole('button', { name: 'Add ship' }),
  )
  const input = await screen.findByPlaceholderText('Search')
  await waitForOverlayFocus()
  return input
}

// Type a query and assert the full value landed, so a focus race can never
// masquerade as a correct empty/partial search result.
const typeQuery = async (input: HTMLElement, text: string) => {
  await userEvent.type(input, text)
  await expect(
    (input as HTMLInputElement).value,
    `query "${text}" fully typed`,
  ).toBe(text)
}

// The add-ship menu renders in a Blueprint portal. Scoping to its popover keeps
// planner chips (also buttons whose names contain the level) out of queries.
const addShipPopover = () =>
  document.querySelector(`.${Classes.POPOVER_CONTENT}`) as HTMLElement

// Result rows are keyboard-selectable buttons, so they are queried by role
// rather than as list items.
const resultButtons = () =>
  within(addShipPopover()).queryAllByRole('button', { name: /Lv\./ })

const meta = {
  title: 'NavyStaff/Area',
  component: NavyStaff,
} satisfies Meta<typeof NavyStaff>

export default meta
type Story = StoryObj<typeof meta>

export const ShowsTabsWithoutDialog: Story = {
  name: 'The main view shows Area and Ship Grid tabs directly (no dialog/button)',
  parameters: params(),
  play: async () => {
    const view = await openPlanner()
    await expect(screen.queryByRole('dialog')).toBeNull()
    await expect(
      within(view).getByRole('tab', { name: 'Area View' }),
    ).toBeTruthy()
    await expect(
      within(view).getByRole('tab', { name: 'Ship Grid' }),
    ).toBeTruthy()
  },
}

export const TabsSwitchBetweenAreaAndGrid: Story = {
  name: 'Area and Ship Grid tabs switch the visible planner surface',
  parameters: params(),
  play: async () => {
    const dialog = await openPlanner()

    await expect(
      within(dialog).getByRole('heading', { level: 5, name: /E1/ }),
    ).toBeTruthy()
    await expect(
      within(dialog).getByRole('heading', { level: 5, name: /E2/ }),
    ).toBeTruthy()

    await userEvent.click(within(dialog).getByRole('tab', { name: 'Ship Grid' }))
    await expect(
      await within(dialog).findByRole('heading', { level: 2, name: 'DD' }),
    ).toBeTruthy()
    await expect(
      within(dialog).queryByRole('heading', { level: 5, name: /E1/ }),
    ).toBeNull()

    await userEvent.click(
      within(dialog).getByRole('tab', { name: 'Area View' }),
    )
    await expect(
      await within(dialog).findByRole('heading', { level: 5, name: /E1/ }),
    ).toBeTruthy()
  },
}

export const EmptyEventAndFleetData: Story = {
  name: 'Empty event and empty fleet data render without areas or ships',
  parameters: params({
    color: [],
    mapname: [],
    mstShips: {},
    ships: {},
  }),
  play: async () => {
    const dialog = await openPlanner()

    await expect(within(dialog).getByText(/Right click on a ship/)).toBeTruthy()
    await expect(
      within(dialog).queryByRole('heading', { level: 5, name: /E1/ }),
    ).toBeNull()

    await userEvent.click(within(dialog).getByRole('tab', { name: 'Ship Grid' }))
    await expect(
      await within(dialog).findByRole('button', { name: 'None' }),
    ).toBeTruthy()
    await expect(
      within(dialog).queryByRole('button', { name: /Lv\./ }),
    ).toBeNull()
  },
}

export const AreaInitialization: Story = {
  name: 'Areas initialize to the host map count',
  parameters: params({ current: [], mapname: ['E1', 'E2'] }),
  play: async () => {
    await openPlanner()
    await waitFor(async () => {
      await expect(plannerSlice(getEnvironment()).current).toEqual([[], []])
    })
    await expect(areaCard('E1')).toBeTruthy()
    await expect(areaCard('E2')).toBeTruthy()
  },
}

export const AreaKeepsRetainedExtraAreas: Story = {
  name: 'Plans beyond the host map count are retained, not truncated',
  parameters: params({
    current: [[1], [2], [3]],
    mapname: ['E1', 'E2'],
  }),
  play: async () => {
    await openPlanner()
    // The extra assignment beyond the current map count is preserved in state
    // even though only E1/E2 are rendered for the current event.
    await waitFor(async () => {
      await expect(plannerSlice(getEnvironment()).current).toEqual([
        [1],
        [2],
        [3],
      ])
    })
    await expect(
      screen.queryByRole('heading', { level: 5, name: /E3/ }),
    ).toBeNull()
  },
}

export const AreaResizeLiveOnHostMapChange: Story = {
  name: 'Areas expand and contract after the host map count changes',
  parameters: params({ current: [[], []], mapname: ['E1', 'E2'] }),
  play: async () => {
    const dialog = await openPlanner()
    const environment = getEnvironment()

    // Host adds a third event while the planner is open.
    const before = environment.store.getState()
    environment.store.dispatch({
      type: 'TEST/REPLACE',
      state: {
        fcd: {
          ...before.fcd,
          shiptag: {
            ...before.fcd.shiptag,
            color: [...before.fcd.shiptag.color, '#111111'],
            mapname: [...before.fcd.shiptag.mapname, 'E3'],
          },
        },
      },
    })
    await expect(
      await within(dialog).findByRole('heading', { level: 5, name: /E3/ }),
    ).toBeTruthy()
    await waitFor(async () => {
      await expect(plannerSlice(environment).current.length).toBe(3)
    })

    // Host contracts back to a single event.
    const expanded = environment.store.getState()
    environment.store.dispatch({
      type: 'TEST/REPLACE',
      state: {
        fcd: {
          ...expanded.fcd,
          shiptag: { ...expanded.fcd.shiptag, mapname: ['E1'] },
        },
      },
    })
    // Contracting the host map keeps the retained third area (no truncation);
    // only the rendered areas follow the map count.
    await waitFor(async () => {
      await expect(plannerSlice(environment).current.length).toBe(3)
    })
    await expect(
      screen.queryByRole('heading', { level: 5, name: /E2/ }),
    ).toBeNull()
  },
}

export const AddShipBySearchAndSelect: Story = {
  name: 'Add a ship by searching and selecting it',
  parameters: params(),
  play: async () => {
    await openPlanner()
    const input = await openAddShip('E1')

    await typeQuery(input, 'epsilon')
    await userEvent.click(await screen.findByText('Epsilon'))

    await waitFor(async () => {
      await expect(plannerSlice(getEnvironment()).current[0]).toContain(5)
    })
    await expect(within(areaCard('E1')).getByText(/Epsilon/)).toBeTruthy()
  },
}

export const SearchByNameYomiAndRomaji: Story = {
  name: 'Search matches ship name, yomi and romaji',
  parameters: params(),
  play: async () => {
    await openPlanner()
    const input = await openAddShip('E1')

    await typeQuery(input, 'epsilon')
    await expect(screen.getByText('Epsilon')).toBeTruthy()
    await expect(screen.queryByText('Alpha')).toBeNull()

    await userEvent.clear(input)
    await typeQuery(input, 'イプシロン')
    await expect(await screen.findByText('Epsilon')).toBeTruthy()
    await expect(screen.queryByText('Beta')).toBeNull()

    await userEvent.clear(input)
    await typeQuery(input, 'ipushiron')
    await expect(await screen.findByText('Epsilon')).toBeTruthy()
  },
}

export const SearchClearAndTypeTabs: Story = {
  name: 'Clear resets the query and type tabs filter the list',
  parameters: params(),
  play: async () => {
    await openPlanner()
    const input = await openAddShip('E1')

    await typeQuery(input, 'zeta')
    await expect(await screen.findByText('Zeta')).toBeTruthy()
    await expect(screen.queryByText('Alpha')).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: 'Clear' }))
    await expect(await screen.findByText('Alpha')).toBeTruthy()

    await userEvent.click(screen.getByRole('tab', { name: 'DD' }))
    await expect(await screen.findByText('Alpha')).toBeTruthy()
    await expect(screen.getByText('Beta')).toBeTruthy()
    await expect(screen.queryByText('Epsilon')).toBeNull()
    await expect(screen.queryByText('Zeta')).toBeNull()
  },
}

export const SearchWithNoResults: Story = {
  name: 'Search with no match shows an empty list',
  parameters: params(),
  play: async () => {
    await openPlanner()
    const input = await openAddShip('E1')

    // Positive control: the unfiltered list has selectable result rows.
    await waitFor(async () => {
      await expect(resultButtons().length).toBeGreaterThan(0)
    })

    await typeQuery(input, 'zzzz')
    await waitFor(async () => {
      await expect(resultButtons().length).toBe(0)
    })

    // Restoring the query brings the original selectable rows back.
    await userEvent.clear(input)
    await waitFor(async () => {
      await expect(resultButtons().length).toBeGreaterThan(0)
    })
  },
}

export const SearchExcludesSelectedAndTagged: Story = {
  name: 'Search never surfaces selected or tagged ships',
  parameters: params({ current: [[3]], ships: plannerTaggedShips }),
  play: async () => {
    await openPlanner()
    const input = await openAddShip('E1')

    // Positive control: untagged, unplanned ships are selectable; Gamma is
    // already planned and Delta is host-tagged to E1, so neither appears.
    await waitFor(async () => {
      await expect(resultButtons().length).toBeGreaterThan(0)
    })
    await expect(
      within(addShipPopover()).getByRole('button', { name: /Epsilon/ }),
    ).toBeTruthy()
    await expect(
      within(addShipPopover()).queryByRole('button', { name: /Gamma/ }),
    ).toBeNull()
    await expect(
      within(addShipPopover()).queryByRole('button', { name: /Delta/ }),
    ).toBeNull()

    // Even when searched explicitly, the excluded ships never appear.
    await typeQuery(input, 'gamma')
    await waitFor(async () => {
      await expect(
        within(addShipPopover()).queryByRole('button', { name: /Gamma/ }),
      ).toBeNull()
    })

    await userEvent.clear(input)
    await typeQuery(input, 'delta')
    await waitFor(async () => {
      await expect(
        within(addShipPopover()).queryByRole('button', { name: /Delta/ }),
      ).toBeNull()
    })
  },
}

export const SearchRefreshesOnSameCountHostDataChange: Story = {
  name: 'Same-count host rename refreshes active search results',
  parameters: params(),
  play: async () => {
    await openPlanner()
    const input = await openAddShip('E1')

    // Positive control: the list already has selectable result rows.
    await waitFor(async () => {
      await expect(resultButtons().length).toBeGreaterThan(0)
    })

    // No ship carries this distinctive name yet, so the active query has no
    // matching result row.
    await typeQuery(input, 'qwerty')
    await waitFor(async () => {
      await expect(resultButtons().length).toBe(0)
    })

    // Rename an unselected, untagged ship in place (same ship count) while the
    // query stays active. A stale Fuse index would keep showing nothing here.
    const environment = getEnvironment()
    const state = environment.store.getState()
    const alpha = state.const.$ships[1]
    environment.store.dispatch({
      type: 'TEST/REPLACE',
      state: {
        const: {
          ...state.const,
          $ships: {
            ...state.const.$ships,
            1: { ...alpha, api_name: 'Qwerty', api_yomi: 'クワーティ' },
          },
        },
      },
    })

    await waitFor(async () => {
      await expect(
        within(addShipPopover()).queryByRole('button', { name: /Qwerty/ }),
      ).toBeTruthy()
    })
    await expect(screen.queryByText('Alpha')).toBeNull()

    // The old name no longer matches after the rename.
    await userEvent.clear(input)
    await typeQuery(input, 'alpha')
    await waitFor(async () => {
      await expect(
        within(addShipPopover()).queryByRole('button', { name: /Alpha/ }),
      ).toBeNull()
    })
  },
}

export const SearchSelectWithKeyboard: Story = {
  name: 'Keyboard selects a searched ship',
  parameters: params(),
  play: async () => {
    await openPlanner()
    const input = await openAddShip('E1')

    await typeQuery(input, 'epsilon')
    const item = (await screen.findByText('Epsilon')).closest(
      'li',
    ) as HTMLElement
    item.focus()
    await userEvent.keyboard('{Enter}')

    await waitFor(async () => {
      await expect(plannerSlice(getEnvironment()).current[0]).toContain(5)
    })
    // Selecting by keyboard also dismisses the add-ship popover.
    await waitFor(async () => {
      await expect(screen.queryByPlaceholderText('Search')).toBeNull()
    })
  },
}

export const AddMoveAndRemoveChips: Story = {
  name: 'Add, move between areas, and remove a ship chip',
  parameters: params(),
  play: async () => {
    await openPlanner()

    const input = await openAddShip('E1')
    await typeQuery(input, 'alpha')
    await userEvent.click(await screen.findByText('Alpha'))
    await waitFor(async () => {
      await expect(plannerSlice(getEnvironment()).current[0]).toContain(1)
    })

    // Move the chip to E2 through its popover.
    await userEvent.click(within(areaCard('E1')).getByText(/Alpha/))
    await userEvent.click(await screen.findByRole('menuitem', { name: /E2/ }))
    await waitFor(async () => {
      const { current } = plannerSlice(getEnvironment())
      await expect(current[0]).not.toContain(1)
      await expect(current[1]).toContain(1)
    })

    // Remove it through the Blueprint tag remove button.
    const chip = chipFor('E2', 'Alpha')
    await userEvent.click(
      within(chip).getByRole('button', { name: 'Remove tag' }),
    )
    await waitFor(async () => {
      await expect(plannerSlice(getEnvironment()).current[1]).not.toContain(1)
    })
    await expect(
      within(areaCard('E2')).queryByText(/Alpha/),
    ).toBeNull()
  },
}

export const UntaggedChipContextRemove: Story = {
  name: 'Right-click removes an untagged chip',
  parameters: params({ current: [[1, 2]], mapname: ['E1', 'E2'] }),
  play: async () => {
    await openPlanner()
    fireEvent.contextMenu(chipFor('E1', 'Beta'))

    await waitFor(async () => {
      const { current } = plannerSlice(getEnvironment())
      await expect(current[0]).toEqual([1])
    })
    await expect(within(areaCard('E1')).getByText(/Alpha/)).toBeTruthy()
  },
}

export const TaggedChipStaysAuthoritative: Story = {
  name: 'Tagged chips ignore context-remove and are restored after removal',
  parameters: params({
    current: [[4], [7]],
    mapname: ['E1', 'E2'],
    ships: plannerTaggedShips,
  }),
  play: async () => {
    await openPlanner()

    // Right-click on a tagged chip must not remove it.
    fireEvent.contextMenu(chipFor('E1', 'Delta'))
    await expect(plannerSlice(getEnvironment()).current[0]).toContain(4)

    // Even an explicit remove is reverted because the host tag is authoritative.
    await userEvent.click(
      within(chipFor('E1', 'Delta')).getByRole('button', {
        name: 'Remove tag',
      }),
    )
    await waitFor(async () => {
      await expect(plannerSlice(getEnvironment()).current[0]).toContain(4)
    })
    await expect(within(areaCard('E1')).getByText(/Delta/)).toBeTruthy()
  },
}

export const RefreshReconcilesTagsAndRemovedShips: Story = {
  name: 'Refresh reconciles host tags and removed ships',
  parameters: params({ current: [[1], [2]], mapname: ['E1', 'E2'] }),
  play: async () => {
    const dialog = await openPlanner()
    await waitFor(async () => {
      await expect(plannerSlice(getEnvironment()).current).toEqual([[1], [2]])
    })

    // Simulate an incoming host update: ship 1 is gone, ship 2 gains an E1 tag.
    const environment = getEnvironment()
    const state = environment.store.getState()
    const ships = { ...state.info.ships }
    delete ships[1]
    ships[2] = { ...ships[2], api_sally_area: 1 }
    environment.store.dispatch({
      type: 'TEST/REPLACE',
      state: { info: { ...state.info, ships } },
    })

    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Refresh' }),
    )
    await waitFor(async () => {
      await expect(plannerSlice(getEnvironment()).current).toEqual([[2], []])
    })
    await expect(within(areaCard('E2')).queryByText(/Beta/)).toBeNull()
  },
}
