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

// Reads the 4px assignment edge a grid card paints, which carries the colour.
const edgeColorOf = (element: HTMLElement): string =>
  getComputedStyle(element).borderLeftColor

const openGrid = async () => {
  const view = await screen.findByRole('button', { name: 'Area View' })
  const container = view.closest('#poi-plugin-navy-staff') as HTMLElement
  await userEvent.click(within(container).getByRole('button', { name: 'Grid Palette' }))
  await within(container).findByRole('heading', { level: 2, name: 'DD' })
  return container
}

// The palette uses a separate explicit removal option; the empty choice is inert.
const assignTo = () => screen.getByLabelText('Assign to') as HTMLSelectElement

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

    await userEvent.selectOptions(assignTo(), 'area-1')
    await userEvent.click(cell('Alpha Lv.50'))
    await waitFor(async () => {
      await expect(assignedShipIds(environment)).toContain(1)
    })

    await userEvent.selectOptions(assignTo(), 'area-2')
    await userEvent.click(cell('Alpha Lv.50'))
    await waitFor(async () => {
      await expect(assignedShipIds(environment)).toContain(1)
      const navy = getEnvironment().store.getState()['poi-plugin-navy-staff'].navy
      const workspace = navy.workspaces.find((w: any) => w.id === navy.selectedWorkspaceId)
      const content = workspace.revisions[workspace.cursor].content
      await expect(content.assignments['area-1']).not.toContain(1)
      await expect(content.assignments['area-2']).toContain(1)
    })

    await userEvent.selectOptions(assignTo(), screen.getByRole('option', { name: 'Remove assignment' }))
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
    await userEvent.selectOptions(assignTo(), 'area-1')
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

    await userEvent.selectOptions(assignTo(), 'area-1')
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
    await userEvent.selectOptions(assignTo(), 'area-1')
    await userEvent.click(cell('Alpha Lv.50'))
    await waitFor(async () => {
      await expect(assignedShipIds(environment)).toContain(1)
    })

    // Move the palette target to E2 (green) without clicking any cell.
    await userEvent.selectOptions(assignTo(), 'area-2')

    // Alpha keeps its real E1 (red) assignment; Beta is unassigned (black), not
    // E2 (green).
    await expect(edgeColorOf(cell('Alpha Lv.50'))).toContain('255, 0, 0')
    await expect(edgeColorOf(cell('Beta Lv.20'))).not.toContain('0, 255, 0')
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

// Two workspaces so the destination-clearing behavior can be checked.
const twoWorkspaceState = () => {
  const state = plannerScenarioState({ current: [[1], []], mapname: ['E1', 'E2'] })
  const navy = state['poi-plugin-navy-staff'].navy
  const second = JSON.parse(JSON.stringify(navy.workspaces[0]))
  second.id = 'ws-2'
  second.revisions[0].id = 'rev-2'
  second.revisions[0].content.name = 'Second'
  second.revisions[0].content.assignments = { 'area-1': [], 'area-2': [] }
  navy.workspaces = [navy.workspaces[0], second]
  return state
}

export const DestinationAndViewSurviveShareDetour: Story = {
  name: 'Grid view and destination survive a Share detour; a workspace switch clears the destination',
  parameters: {
    shipInfo: { plugin: 'navy-staff' as const, state: twoWorkspaceState() },
  },
  play: async () => {
    const environment = getEnvironment()
    await openGrid()
    await userEvent.selectOptions(assignTo(), 'area-1')

    // Detour to Share & reference and back.
    await userEvent.click(screen.getByRole('button', { name: 'Share' }))
    await userEvent.click(screen.getByRole('button', { name: 'Plan' }))

    // Grid view and destination are preserved across the detour.
    await expect(
      screen.getByRole('button', { name: 'Grid Palette' }),
    ).toHaveAttribute('aria-pressed', 'true')
    await expect(assignTo().value).toBe('area-1')

    // Switching workspace clears the now-invalid destination.
    await userEvent.selectOptions(
      screen.getByLabelText('Workspace'),
      'ws-2',
    )
    await waitFor(async () => {
      await expect(assignTo().value).toBe('')
    })

    // The next click targets a valid area in the new workspace.
    await userEvent.selectOptions(assignTo(), 'area-2')
    await userEvent.click(cell('Beta Lv.20'))
    await waitFor(async () => {
      const navy = environment.store.getState()['poi-plugin-navy-staff'].navy
      const ws2 = navy.workspaces.find((w: any) => w.id === 'ws-2')
      const content = ws2.revisions[ws2.cursor].content
      await expect(content.assignments['area-2']).toContain(2)
      const ws1 = navy.workspaces.find((w: any) => w.id === 'ws-1')
      await expect(
        Object.values(ws1.revisions[ws1.cursor].content.assignments).flat(),
      ).not.toContain(2)
    })
  },
}


export const ListBatchAssignmentAndUndo: Story = {
  name: 'List selection edits nothing; applying multiple ships is one undoable revision',
  parameters: params({ current: [[], []], mapname: ['E1', 'E2'] }),
  play: async () => {
    await userEvent.click(await screen.findByRole('button', { name: 'Ship List' }))
    const list = within(screen.getAllByTestId('ship-list').find(element => element.checkVisibility())!)
    const workspace = () => {
      const navy = getEnvironment().store.getState()['poi-plugin-navy-staff'].navy
      return navy.workspaces.find((item: any) => item.id === navy.selectedWorkspaceId)!
    }
    const initialCount = workspace().revisions.length
    await userEvent.click(list.getByRole('checkbox', { name: /^Alpha / }))
    await userEvent.click(list.getByRole('checkbox', { name: /^Beta / }))
    expect(assignedShipIds(getEnvironment())).toEqual([])
    expect(workspace().revisions.length).toBe(initialCount)
    expect(list.getByRole('button', { name: 'Apply to selected' })).toBeDisabled()

    await userEvent.selectOptions(list.getByLabelText('Assign to'), 'area-1')
    await userEvent.click(list.getByRole('button', { name: 'Apply to selected' }))
    await waitFor(() => expect(assignedShipIds(getEnvironment())).toEqual([1, 2]))
    expect(workspace().revisions.length).toBe(initialCount + 1)
    expect(list.getAllByRole('checkbox').every(input => !(input as HTMLInputElement).checked)).toBe(true)

    await userEvent.click(screen.getByRole('button', { name: 'Undo' }))
    await waitFor(() => expect(assignedShipIds(getEnvironment())).toEqual([]))
    await userEvent.click(screen.getByRole('button', { name: 'Redo' }))
    await waitFor(() => expect(assignedShipIds(getEnvironment())).toEqual([1, 2]))

    // Reapplying the current group produces no history entry.
    await userEvent.click(list.getByRole('checkbox', { name: /^Alpha / }))
    await userEvent.click(list.getByRole('button', { name: 'Apply to selected' }))
    expect(workspace().revisions.length).toBe(initialCount + 1)

    await userEvent.click(list.getByRole('checkbox', { name: /^Alpha / }))
    await userEvent.click(list.getByRole('checkbox', { name: /^Beta / }))
    await userEvent.selectOptions(list.getByLabelText('Assign to'), list.getByRole('option', { name: 'Remove assignment' }))
    await userEvent.click(list.getByRole('button', { name: 'Apply to selected' }))
    await waitFor(() => expect(assignedShipIds(getEnvironment())).toEqual([]))
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }))
    await waitFor(() => expect(assignedShipIds(getEnvironment())).toEqual([1, 2]))
  },
}

const stableListStory = (theme: 'light' | 'dark'): Story => ({
  name: `Level order, assignment tint, cleared selection and list-specific help (${theme})`,
  parameters: {
    shipInfo: { ...params({ current: [[1], []], mapname: ['E1', 'E2'] }).shipInfo, theme },
  },
  play: async () => {
    await userEvent.click(await screen.findByRole('button', { name: 'Ship List' }))
    const list = within(screen.getByTestId('ship-list'))
    const expected = ['Gamma', 'Delta', 'Eta', 'Zeta', 'Alpha', 'Theta', 'Beta', 'Epsilon']
    const names = () => list.getAllByRole('checkbox').map(input =>
      input.closest('label')!.textContent!.split('Lv.')[0])
    const beta = () => list.getByRole('checkbox', { name: /^Beta / })
    const background = () => getComputedStyle(beta().closest('label')!).backgroundColor
    expect(names()).toEqual(expected)
    const unassignedBackground = background()
    await userEvent.click(beta())
    await userEvent.selectOptions(list.getByLabelText('Assign to'), 'area-2')
    await userEvent.click(list.getByRole('button', { name: 'Apply to selected' }))
    await waitFor(() => expect(assignedShipIds(getEnvironment())).toEqual([1, 2]))
    expect(names()).toEqual(expected)
    expect(beta()).not.toBeChecked()
    expect(list.getByRole('button', { name: 'Apply to selected' })).toBeDisabled()
    await waitFor(() => expect(background()).not.toBe(unassignedBackground))

    await userEvent.click(screen.getByRole('button', { name: 'Undo' }))
    await waitFor(() => expect(background()).toBe(unassignedBackground))
    expect(names()).toEqual(expected)
    await userEvent.click(screen.getByRole('button', { name: 'Redo' }))
    expect(names()).toEqual(expected)
    await waitFor(() => expect(background()).not.toBe(unassignedBackground))

    // A no-op batch must clear selection too.
    await userEvent.click(beta())
    await userEvent.click(list.getByRole('button', { name: 'Apply to selected' }))
    expect(beta()).not.toBeChecked()
    await userEvent.click(screen.getByRole('button', { name: 'Help' }))
    const help = await screen.findByTestId('plan-help')
    expect(help.textContent).toContain('Remove assignment')
    expect(help.textContent).toContain('Apply')
    expect(help.textContent).not.toMatch(/right.click/i)
  },
})

export const StableListLight = stableListStory('light')
export const StableListDark = stableListStory('dark')

export const PaletteDefaultDoesNotRemove: Story = {
  name: 'The default palette choice is inert for assigned ships',
  parameters: params({ current: [[1], []], mapname: ['E1', 'E2'] }),
  play: async () => {
    await openGrid()
    const before = getEnvironment().store.getState()['poi-plugin-navy-staff'].navy
    expect(assignTo().value).toBe('')
    await userEvent.click(cell('Alpha Lv.50'))
    expect(getEnvironment().store.getState()['poi-plugin-navy-staff'].navy).toBe(before)
    expect(assignedShipIds(getEnvironment())).toEqual([1])
  },
}


export const FilteredListSelectionStaysExplicit: Story = {
  name: 'List select-all respects filters; hidden selections clear when filters or page change',
  parameters: params({ current: [[1], []], mapname: ['E1', 'E2'] }),
  play: async () => {
    await userEvent.click(await screen.findByRole('button', { name: 'Ship List' }))
    const list = within(screen.getAllByTestId('ship-list').find(element => element.checkVisibility())!)
    const apply = () => list.getByRole('button', { name: 'Apply to selected' })
    await userEvent.selectOptions(screen.getByLabelText('Assignment'), 'unassigned')
    const search = screen.getByPlaceholderText('Search')
    // Use an exact identifier: fuzzy name search also matches Eta/Zeta/Theta.
    fireEvent.change(search, { target: { value: '#2' } })
    expect(list.getAllByRole('checkbox')).toHaveLength(1)
    await userEvent.click(list.getByRole('button', { name: 'Select all matching' }))
    await userEvent.selectOptions(list.getByLabelText('Assign to'), 'area-2')
    expect(apply()).not.toBeDisabled()
    await userEvent.click(apply())
    await waitFor(() => expect(assignedShipIds(getEnvironment())).toEqual([1, 2]))
    expect(list.queryAllByRole('checkbox')).toHaveLength(0)
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(apply()).toBeDisabled()

    await userEvent.click(list.getByRole('checkbox', { name: /^Beta / }))
    fireEvent.change(search, { target: { value: '' } })
    expect(apply()).toBeDisabled()
    await userEvent.click(list.getByRole('button', { name: 'Select all matching' }))
    expect(list.getAllByRole('checkbox').every(input => (input as HTMLInputElement).checked)).toBe(true)
    await userEvent.click(screen.getByRole('button', { name: 'Reference' }))
    await userEvent.click(screen.getByRole('button', { name: 'Plan' }))
    expect(apply()).toBeDisabled()
    expect((screen.getByLabelText('Assignment') as HTMLSelectElement).value).toBe('unassigned')

    // The list and palette show the same filtered roster but different actions.
    await userEvent.click(screen.getByRole('button', { name: 'Grid Palette' }))
    expect(screen.queryByRole('button', { name: 'Alpha Lv.50' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Beta Lv.20' })).toBeTruthy()
  },
}


export const RemovedDestinationBecomesUnselected: Story = {
  name: 'Undoing an added area clears its effective destination in both assignment views',
  parameters: params(withNavy((() => {
    const navy = mkNavyData({ current: [[1], []] })
    const workspace = navy.workspaces[0]
    const original = workspace.revisions[0]
    workspace.revisions = [
      { ...original, content: { ...original.content, areas: original.content.areas.slice(0, 1), assignments: { 'area-1': [1] } } },
      { ...original, id: 'rev-added-area', op: { kind: 'update-areas', addedAreaIds: ['area-2'], updatedAreaIds: [] } },
    ]
    workspace.cursor = 1
    return navy
  })())),
  play: async () => {
    await openGrid()
    await userEvent.selectOptions(assignTo(), 'area-2')
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }))
    await waitFor(() => expect(assignTo().value).toBe(''))
    const before = getEnvironment().store.getState()['poi-plugin-navy-staff'].navy
    await userEvent.click(cell('Alpha Lv.50'))
    expect(getEnvironment().store.getState()['poi-plugin-navy-staff'].navy).toBe(before)
    await userEvent.click(screen.getByRole('button', { name: 'Ship List' }))
    const list = within(screen.getAllByTestId('ship-list').find(element => element.checkVisibility())!)
    await userEvent.click(list.getByRole('checkbox', { name: /^Alpha / }))
    expect(list.getByRole('button', { name: 'Apply to selected' })).toBeDisabled()
  },
}
