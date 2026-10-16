import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fireEvent, screen, userEvent, waitFor, within } from 'storybook/test'

import { mkNavyData } from '../tests/ui/fixtures'
import type { PlannerScenarioOptions } from '../preview/planner-fixtures'
import {
  assignedShipIds,
  plannerScenarioState,
  plannerTaggedShips,
} from '../preview/planner-fixtures'
import { getEnvironment } from '../preview/scenario'
import { reactClass as NavyStaff } from '../packages/navy-staff/src/views'

const params = (options?: PlannerScenarioOptions) => ({
  shipInfo: { plugin: 'navy-staff' as const, state: plannerScenarioState(options) },
})

const withNavy = (navy: unknown, account = '123'): PlannerScenarioOptions => ({
  extra: { 'poi-plugin-navy-staff': { account, error: null, navy, ready: true } },
})

// Reads the gradient a grid cell paints, which carries the assignment color.
const gradientOf = (element: HTMLElement): string => {
  for (const node of Array.from(element.querySelectorAll('div'))) {
    const image = getComputedStyle(node).backgroundImage
    if (image && image.includes('linear-gradient')) return image
  }
  return ''
}

const openGrid = async () => {
  const view = await screen.findByRole('tab', { name: 'Ship Grid' })
  const container = view.closest('#poi-plugin-navy-staff') as HTMLElement
  await userEvent.click(within(container).getByRole('tab', { name: 'Ship Grid' }))
  await within(container).findByRole('heading', { level: 2, name: 'DD' })
  return container
}

const palette = (name: string) =>
  screen.getByRole('button', { name }) as HTMLElement

const cell = (label: string) =>
  screen.getByRole('button', { name: label }) as HTMLElement

// Hand-written expectation of how the fixture roster maps to the grid's super
// types, in rendered -lv/-id order, independent of the production map.
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

const groupCellLabels = (dialog: HTMLElement, name: string) => {
  const heading = within(dialog).getByRole('heading', { level: 2, name })
  return within(heading.parentElement as HTMLElement)
    .queryAllByRole('button')
    .map((button) => button.getAttribute('aria-label'))
}

const meta = {
  title: 'NavyStaff/ShipGrid',
  component: NavyStaff,
} satisfies Meta<typeof NavyStaff>

export default meta
type Story = StoryObj<typeof meta>

export const GroupsShipsBySuperType: Story = {
  name: 'Ship grid groups cells by super type',
  parameters: params(),
  play: async () => {
    const dialog = await openGrid()
    const rendered: Array<string | null> = []
    for (const [name, labels] of expectedGroups) {
      const actual = groupCellLabels(dialog, name)
      await expect(actual, `${name} group cells`).toEqual([...labels])
      rendered.push(...actual)
    }
    const roster = expectedGroups.flatMap(([, labels]) => labels)
    await expect(rendered).toHaveLength(roster.length)
  },
}

export const PaletteAssignMoveAndErase: Story = {
  name: 'Palette assigns, moves and erases a ship',
  parameters: params({ current: [[], []], mapname: ['E1', 'E2'] }),
  play: async () => {
    const environment = getEnvironment()
    await openGrid()

    await userEvent.click(palette('E1'))
    await userEvent.click(cell('Alpha Lv.50'))
    await waitFor(async () => {
      await expect(assignedShipIds(environment)).toContain(1)
    })

    await userEvent.click(palette('E2'))
    await userEvent.click(cell('Alpha Lv.50'))
    await waitFor(async () => {
      await expect(assignedShipIds(environment)).toContain(1)
      const navy = getEnvironment().store.getState()['poi-plugin-navy-staff'].navy
      const workspace = navy.workspaces.find((w: any) => w.id === navy.selectedWorkspaceId)
      const content = workspace.revisions[workspace.cursor].content
      await expect(content.assignments['area-1']).not.toContain(1)
      await expect(content.assignments['area-2']).toContain(1)
    })

    await userEvent.click(palette('None'))
    await userEvent.click(cell('Alpha Lv.50'))
    await waitFor(async () => {
      await expect(assignedShipIds(environment)).not.toContain(1)
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
      await expect(assignedShipIds(environment)).not.toContain(1)
    })
  },
}

export const LiveTagsDoNotBlockGrid: Story = {
  name: 'Live sortie tags do not auto-assign or block grid cells',
  parameters: params({
    current: [[], []],
    mapname: ['E1', 'E2'],
    ships: plannerTaggedShips,
  }),
  play: async () => {
    const environment = getEnvironment()
    await openGrid()

    // Tagged ships are not auto-assigned by rendering.
    await expect(assignedShipIds(environment)).toEqual([])

    // And they remain assignable manually.
    await userEvent.click(palette('E1'))
    await userEvent.click(cell('Delta Lv.100'))
    await waitFor(async () => {
      await expect(assignedShipIds(environment)).toContain(4)
    })
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
      await expect(assignedShipIds(environment)).toContain(1)
    })
  },
}

export const PaletteSelectionDoesNotRecolorUneditedShips: Story = {
  name: 'Changing the palette target never recolors unedited ships',
  parameters: params({ current: [[], []], mapname: ['E1', 'E2'] }),
  play: async () => {
    const environment = getEnvironment()
    await openGrid()

    // Assign Alpha to E1 (red).
    await userEvent.click(palette('E1'))
    await userEvent.click(cell('Alpha Lv.50'))
    await waitFor(async () => {
      await expect(assignedShipIds(environment)).toContain(1)
    })

    // Move the palette target to E2 (green) without clicking any cell.
    await userEvent.click(palette('E2'))

    // Alpha keeps its real E1 (red) assignment; Beta is unassigned (black), not
    // E2 (green).
    await expect(gradientOf(cell('Alpha Lv.50'))).toContain('255, 0, 0')
    await expect(gradientOf(cell('Beta Lv.20'))).not.toContain('0, 255, 0')
  },
}

export const UnknownMasterRowHasNoArtwork: Story = {
  name: 'A saved ship with an unknown master never borrows owned-ID artwork',
  parameters: params({
    ...withNavy(
      (() => {
        const navy = mkNavyData({ current: [[99], []] })
        navy.workspaces[0].revisions[0].content.ships = {
          '99': {
            level: null,
            masterId: null,
            name: null,
            observedAt: '2026-01-01T00:00:00.000Z',
            ownedId: 99,
            typeId: null,
            typeLabel: null,
          },
        }
        return navy
      })(),
    ),
    config: { plugin: { ShipInfo: {} }, poi: { appearance: { avatar: true } } },
  }),
  play: async () => {
    await openGrid()

    // Unknown master: no artwork element at all (not owned-ID artwork).
    await expect(cell('#99 Lv.?').querySelector('img')).toBeNull()
    // Positive control: a live row with a known master does render artwork.
    await expect(cell('Alpha Lv.50').querySelector('img')).toBeTruthy()
  },
}
