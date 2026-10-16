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
import { Planner } from '../views/sidebar/planner'

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

    for (const heading of ['BB', 'CV', 'CL', 'DD', 'SS']) {
      await expect(
        within(dialog).getByRole('heading', { level: 2, name: heading }),
      ).toBeTruthy()
    }

    // Every owned ship is represented once.
    await expect(cell('Alpha Lv.50')).toBeTruthy()
    await expect(cell('Epsilon Lv.10')).toBeTruthy()
    await expect(cell('Zeta Lv.80')).toBeTruthy()
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
