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
import { Planner } from '../views/planner'

const params = (options?: PlannerScenarioOptions) => ({
  shipInfo: { state: plannerScenarioState(options) },
})

const openGrid = async () => {
  await userEvent.click(screen.getByRole('button', { name: 'Deck Planner' }))
  const dialog = await screen.findByRole('dialog')
  await userEvent.click(within(dialog).getByRole('tab', { name: 'Ship Grid' }))
  await within(dialog).findByRole('heading', { level: 2, name: 'DD' })
  return dialog
}

const palette = (name: string) =>
  screen.getByRole('button', { name }) as HTMLElement

const cell = (label: string) =>
  screen.getByRole('button', { name: label }) as HTMLElement

// Hand-written expectation of how the fixture roster (plannerMstShips) maps to
// the grid's super types, in rendered -lv/-id order. Deliberately independent
// of the production shipSuperTypeMap so mis-grouping can't agree with itself.
// Groups with no matching ship are listed empty.
const expectedGroups: Array<[string, string[]]> = [
  ['BB', ['Zeta Lv.80']],
  ['CV', ['Eta Lv.90']],
  ['CA', []],
  ['CL', ['Gamma Lv.150', 'Delta Lv.100', 'Epsilon Lv.10']],
  ['DD', ['Alpha Lv.50', 'Beta Lv.20']],
  ['SS', ['Theta Lv.30']],
  ['DE', []],
  ['Auxiliary', []],
]

// Ship cells rendered under one super-type heading, scoped to that heading's
// parent group so a ship in the wrong group can never satisfy the assertion.
const groupCellLabels = (dialog: HTMLElement, name: string) => {
  const heading = within(dialog).getByRole('heading', { level: 2, name })
  return within(heading.parentElement as HTMLElement)
    .queryAllByRole('button')
    .map((button) => button.getAttribute('aria-label'))
}

const meta = {
  title: 'Sidebar/Planner/ShipGrid',
  component: Planner,
} satisfies Meta<typeof Planner>

export default meta
type Story = StoryObj<typeof meta>

export const GroupsShipsBySuperType: Story = {
  name: 'Ship grid groups cells by super type',
  parameters: params(),
  play: async () => {
    const dialog = await openGrid()

    // Each heading's parent group owns exactly its ships, in rendered order.
    const rendered: Array<string | null> = []
    for (const [name, labels] of expectedGroups) {
      const actual = groupCellLabels(dialog, name)
      await expect(actual, `${name} group cells`).toEqual([...labels])
      rendered.push(...actual)
    }

    // Every expected ship appears exactly once across the whole grid.
    const roster = expectedGroups.flatMap(([, labels]) => labels)
    const counts = new Map<string | null, number>()
    for (const label of rendered) {
      counts.set(label, (counts.get(label) ?? 0) + 1)
    }
    await expect(rendered).toHaveLength(roster.length)
    for (const label of roster) {
      await expect(counts.get(label), `${label} appears exactly once`).toBe(1)
    }
  },
}

export const PaletteAssignMoveAndErase: Story = {
  name: 'Palette assigns, moves and erases a ship',
  parameters: params({ current: [[], []], mapname: ['E1', 'E2'] }),
  play: async () => {
    const environment = getEnvironment()
    await openGrid()

    // Assign Alpha to E1.
    await userEvent.click(palette('E1'))
    await userEvent.click(cell('Alpha Lv.50'))
    await waitFor(async () => {
      await expect(plannerSlice(environment).current[0]).toContain(1)
    })

    // Move it to E2 by changing the palette then clicking again.
    await userEvent.click(palette('E2'))
    await userEvent.click(cell('Alpha Lv.50'))
    await waitFor(async () => {
      const { current } = plannerSlice(environment)
      await expect(current[0]).not.toContain(1)
      await expect(current[1]).toContain(1)
    })

    // Erase with the None palette option.
    await userEvent.click(palette('None'))
    await userEvent.click(cell('Alpha Lv.50'))
    await waitFor(async () => {
      const { current } = plannerSlice(environment)
      await expect(current[0]).not.toContain(1)
      await expect(current[1]).not.toContain(1)
    })
  },
}

export const ContextMenuRemovesCell: Story = {
  name: 'Right-click removes a ship from the grid plan',
  parameters: params({ current: [[1], []], mapname: ['E1', 'E2'] }),
  play: async () => {
    const environment = getEnvironment()
    await openGrid()

    fireEvent.contextMenu(cell('Alpha Lv.50'))
    await waitFor(async () => {
      await expect(plannerSlice(environment).current[0]).toEqual([])
    })
  },
}

export const TaggedShipIsProtected: Story = {
  name: 'Tagged ships cannot be assigned or erased from the grid',
  parameters: params({
    current: [[], []],
    mapname: ['E1', 'E2'],
    ships: plannerTaggedShips,
  }),
  play: async () => {
    const environment = getEnvironment()
    await openGrid()

    // Delta is host-tagged to E1 and Eta to E2; the planner reflects that.
    await waitFor(async () => {
      const { current } = plannerSlice(environment)
      await expect(current[0]).toContain(4)
      await expect(current[1]).toContain(7)
    })

    // Pointer, context menu and keyboard must all leave tagged ships alone.
    await userEvent.click(palette('E2'))
    await userEvent.click(cell('Delta Lv.100'))
    fireEvent.contextMenu(cell('Eta Lv.90'))

    const delta = cell('Delta Lv.100')
    delta.focus()
    await userEvent.keyboard('{Enter}')
    const eta = cell('Eta Lv.90')
    eta.focus()
    await userEvent.keyboard(' ')

    await expect(plannerSlice(environment).current[0]).toContain(4)
    await expect(plannerSlice(environment).current[1]).toContain(7)
  },
}

export const KeyboardAssignsCell: Story = {
  name: 'Keyboard activates a grid cell',
  parameters: params({ current: [[], []], mapname: ['E1', 'E2'] }),
  play: async () => {
    const environment = getEnvironment()
    await openGrid()

    await userEvent.click(palette('E1'))
    cell('Alpha Lv.50').focus()
    await userEvent.keyboard('{Enter}')

    await waitFor(async () => {
      await expect(plannerSlice(environment).current[0]).toContain(1)
    })
  },
}
