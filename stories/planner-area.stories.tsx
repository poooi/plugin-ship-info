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

import { mkNavyData } from '../tests/ui/fixtures'
import type { PlannerScenarioOptions } from '../preview/planner-fixtures'
import {
  assignedShipIds,
  plannerScenarioState,
  plannerSlice,
} from '../preview/planner-fixtures'
import { getEnvironment } from '../preview/scenario'
import { reactClass as NavyStaff } from '../packages/navy-staff/src/views'

const CARD = `.${Classes.CARD}`
const TAG = `.${Classes.TAG}`
const NAVY = 'poi-plugin-navy-staff'

const params = (options?: PlannerScenarioOptions) => ({
  shipInfo: { plugin: 'navy-staff' as const, state: plannerScenarioState(options) },
})

const withNavy = (navy: unknown): PlannerScenarioOptions => ({
  extra: { [NAVY]: { error: null, navy, ready: true } },
})

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

const openPlanner = async () => {
  await expect(await screen.findByRole('tab', { name: 'Area View' })).toBeTruthy()
  return document.querySelector('#poi-plugin-navy-staff') as HTMLElement
}

const areaCard = (name: string) =>
  screen
    .getByRole('heading', { level: 5, name: new RegExp(name) })
    .closest(CARD) as HTMLElement

const chipFor = (area: string, name: string) =>
  within(areaCard(area)).getByText(new RegExp(name)).closest(TAG) as HTMLElement

const openAddShip = async (area: string) => {
  await userEvent.click(
    within(areaCard(area)).getByRole('button', { name: 'Add ship' }),
  )
  const input = await screen.findByPlaceholderText('Search')
  await waitForOverlayFocus()
  return input
}

const addShipPopover = () =>
  document.querySelector(`.${Classes.POPOVER_CONTENT}`) as HTMLElement

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
    await expect(within(view).getByRole('tab', { name: 'Area View' })).toBeTruthy()
    await expect(within(view).getByRole('tab', { name: 'Ship Grid' })).toBeTruthy()
  },
}

export const CapturedAreasSurviveMissingHostData: Story = {
  name: 'Captured areas render even when the host map data is gone',
  parameters: params({
    ...withNavy(mkNavyData({ current: [[], []] })),
    color: [],
    mapname: [],
  }),
  play: async () => {
    await openPlanner()
    // The workspace snapshot still renders E1/E2 from capture, not the host.
    await expect(areaCard('E1')).toBeTruthy()
    await expect(areaCard('E2')).toBeTruthy()
  },
}

export const EmptyWorkspaceShowsNoAreas: Story = {
  name: 'A workspace with no captured areas shows an empty state',
  parameters: params(withNavy(mkNavyData({ areas: [], current: [] }))),
  play: async () => {
    await openPlanner()
    await expect(screen.getByText('No areas captured')).toBeTruthy()
  },
}

export const SavedShipWithoutRosterStaysVisible: Story = {
  name: 'Saved ships missing from the roster stay visible with a placeholder',
  parameters: params({
    ...withNavy(
      (() => {
        const navy = mkNavyData({ current: [[1], [2]] })
        const content = navy.workspaces[0].revisions[0].content
        content.ships = {
          '1': {
            level: null,
            masterId: null,
            name: null,
            observedAt: '2026-01-01T00:00:00.000Z',
            ownedId: 1,
            typeId: null,
            typeLabel: null,
          },
          '2': {
            level: null,
            masterId: null,
            name: null,
            observedAt: '2026-01-01T00:00:00.000Z',
            ownedId: 2,
            typeId: null,
            typeLabel: null,
          },
        }
        return navy
      })(),
    ),
    mstShips: {},
    ships: {},
  }),
  play: async () => {
    await openPlanner()
    await expect(within(areaCard('E1')).getByText('#1')).toBeTruthy()
    await expect(within(areaCard('E2')).getByText('#2')).toBeTruthy()
    // Unknown-type group is present because the saved records have no type.
    await expect(screen.getAllByText('Unknown type').length).toBeGreaterThan(0)
  },
}

export const CrossAccountOwnerDisablesLivePicker: Story = {
  name: 'A workspace owned by another account shows saved data and no live picker',
  parameters: params({
    ...withNavy(
      (() => {
        const navy = mkNavyData({ current: [[1]], ownerMemberId: 'other-account' })
        const content = navy.workspaces[0].revisions[0].content
        content.ships = {
          '1': {
            level: 42,
            masterId: 1,
            name: 'Alpha',
            observedAt: '2026-01-01T00:00:00.000Z',
            ownedId: 1,
            typeId: 2,
            typeLabel: 'DD',
          },
        }
        return navy
      })(),
    ),
  }),
  play: async () => {
    await openPlanner()
    await expect(screen.getByText('Saved data (different account)')).toBeTruthy()
    // The saved record renders; the live picker is unavailable.
    await expect(within(areaCard('E1')).getByText(/Alpha/)).toBeTruthy()
    await expect(
      within(areaCard('E1')).queryByRole('button', { name: 'Add ship' }),
    ).toBeNull()
  },
}

export const AddShipBySearchAndSelect: Story = {
  name: 'Add a live ship by searching and selecting it',
  parameters: params(),
  play: async () => {
    await openPlanner()
    const input = await openAddShip('E1')
    await userEvent.type(input, 'epsilon')
    await userEvent.click(await screen.findByText('Epsilon'))

    await waitFor(async () => {
      await expect(assignedShipIds(getEnvironment())).toContain(5)
    })
    await expect(within(areaCard('E1')).getByText(/Epsilon/)).toBeTruthy()
  },
}

export const AddMoveAndRemoveChips: Story = {
  name: 'Add, move between areas, and remove a ship chip',
  parameters: params(),
  play: async () => {
    await openPlanner()

    const input = await openAddShip('E1')
    await userEvent.type(input, 'alpha')
    await userEvent.click(await screen.findByText('Alpha'))
    await waitFor(async () => {
      await expect(assignedShipIds(getEnvironment())).toContain(1)
    })

    await userEvent.click(within(areaCard('E1')).getByText(/Alpha/))
    await userEvent.click(await screen.findByRole('menuitem', { name: /E2/ }))
    await waitFor(async () => {
      await expect(within(areaCard('E2')).getByText(/Alpha/)).toBeTruthy()
      await expect(within(areaCard('E1')).queryByText(/Alpha/)).toBeNull()
    })

    const chip = chipFor('E2', 'Alpha')
    await userEvent.click(within(chip).getByRole('button', { name: 'Remove tag' }))
    await waitFor(async () => {
      await expect(assignedShipIds(getEnvironment())).not.toContain(1)
    })
  },
}

export const NoAutomaticTagEdits: Story = {
  name: 'Live sortie tags never move, add or block manual planning',
  parameters: params({
    current: [[], []],
    mapname: ['E1', 'E2'],
    // Delta carries api_sally_area 1 and Eta 2 in the tagged roster.
    ships: {
      ...plannerScenarioState().info.ships,
      4: { ...plannerScenarioState().info.ships[4], api_sally_area: 1 },
      7: { ...plannerScenarioState().info.ships[7], api_sally_area: 2 },
    },
  }),
  play: async () => {
    await openPlanner()
    // Rendering must not assign tagged ships to the workspace.
    await expect(assignedShipIds(getEnvironment())).toEqual([])

    // A tagged ship is still manually addable.
    const input = await openAddShip('E1')
    await userEvent.type(input, 'delta')
    await userEvent.click(await screen.findByText('Delta'))
    await waitFor(async () => {
      await expect(assignedShipIds(getEnvironment())).toContain(4)
    })
  },
}

export const RenameWorkspace: Story = {
  name: 'Rename updates the selected workspace name',
  parameters: params(),
  play: async () => {
    await openPlanner()
    await userEvent.click(screen.getByRole('button', { name: 'Rename' }))
    const input = screen.getByLabelText('Workspace name') as HTMLInputElement
    await userEvent.clear(input)
    await userEvent.type(input, 'Renamed')
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    await waitFor(async () => {
      const navy = plannerSlice(getEnvironment())
      const workspace = navy.workspaces.find((w) => w.id === navy.selectedWorkspaceId)
      await expect(workspace.revisions[workspace.cursor].content.name).toBe('Renamed')
    })
  },
}

export const DuplicateAndDeleteWorkspace: Story = {
  name: 'Duplicate creates an independent workspace and delete removes it',
  parameters: params({ current: [[1], []] }),
  play: async () => {
    await openPlanner()
    const environment = getEnvironment()
    const before = plannerSlice(environment).workspaces.length

    await userEvent.click(screen.getByRole('button', { name: 'Duplicate' }))
    await waitFor(async () => {
      await expect(plannerSlice(environment).workspaces.length).toBe(before + 1)
    })
    // The duplicate starts a fresh initial revision.
    const navy = plannerSlice(environment)
    const duplicate = navy.workspaces.find((w) => w.id === navy.selectedWorkspaceId)
    await expect(duplicate.cursor).toBe(0)

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await userEvent.click(screen.getByRole('button', { name: 'Delete permanently' }))
    await waitFor(async () => {
      await expect(plannerSlice(environment).workspaces.length).toBe(before)
    })
  },
}

export const WorkspaceIsolation: Story = {
  name: 'Edits in one workspace never affect another',
  parameters: params({ current: [[1], []] }),
  play: async () => {
    await openPlanner()
    const environment = getEnvironment()

    // Create a second workspace and add a ship to it.
    await userEvent.click(screen.getByRole('button', { name: 'New workspace' }))
    await waitFor(async () => {
      await expect(plannerSlice(environment).workspaces.length).toBe(2)
    })
    const secondId = plannerSlice(environment).selectedWorkspaceId

    const input = await openAddShip('E1')
    await userEvent.type(input, 'alpha')
    await userEvent.click(await screen.findByText('Alpha'))
    await waitFor(async () => {
      await expect(assignedShipIds(environment)).toContain(1)
    })

    const navy = plannerSlice(environment)
    const first = navy.workspaces.find((w) => w.id !== secondId)
    const firstContent = first.revisions[first.cursor].content
    const firstIds = Object.values(firstContent.assignments).flat()
    // The first workspace (seeded with [1]) still holds only its original ship.
    await expect(firstIds).toEqual([1])
  },
}

export const RetainedArchiveSurvives: Story = {
  name: 'Opaque legacy archive round-trips without interpretation',
  parameters: params({
    extra: {
      [NAVY]: {
        error: null,
        navy: { ...mkNavyData(), legacyArchive: { old: [[9]] } },
        ready: true,
      },
    },
  }),
  play: async () => {
    await openPlanner()
    await expect(plannerSlice(getEnvironment()).legacyArchive).toEqual({ old: [[9]] })
  },
}

export const RemoveViaContextMenu: Story = {
  name: 'Right-click removes a chip without a live tag',
  parameters: params({ current: [[1, 2]], mapname: ['E1', 'E2'] }),
  play: async () => {
    await openPlanner()
    fireEvent.contextMenu(chipFor('E1', 'Beta'))
    await waitFor(async () => {
      await expect(assignedShipIds(getEnvironment())).toEqual([1])
    })
  },
}

// Two workspaces for CRUD/switch regressions. mkNavyData produces one; clone it
// with distinct workspace and revision ids.
const twoWorkspaceNavy = () => {
  const navy = mkNavyData({ current: [[1], []] })
  const second = JSON.parse(JSON.stringify(navy.workspaces[0]))
  second.id = 'ws-2'
  second.revisions[0].id = 'rev-2'
  second.revisions[0].content.name = 'Second'
  second.revisions[0].content.assignments = { 'area-1': [], 'area-2': [] }
  return { ...navy, workspaces: [navy.workspaces[0], second] }
}

export const SwitchBetweenWorkspaces: Story = {
  name: 'Switching workspaces selects the chosen plan without touching the other',
  parameters: params(withNavy(twoWorkspaceNavy())),
  play: async () => {
    await openPlanner()
    const environment = getEnvironment()
    await userEvent.selectOptions(
      screen.getByLabelText('Workspace') as HTMLSelectElement,
      'ws-2',
    )
    await waitFor(async () => {
      await expect(plannerSlice(environment).selectedWorkspaceId).toBe('ws-2')
    })
    const navy = plannerSlice(environment)
    const first = navy.workspaces.find((w) => w.id === 'ws-1')
    const firstIds = Object.values(first.revisions[first.cursor].content.assignments).flat()
    await expect(firstIds).toEqual([1])
  },
}

export const DeleteConfirmationInvalidatedOnSwitch: Story = {
  name: 'Delete confirmation is invalidated when the selection changes',
  parameters: params(withNavy(twoWorkspaceNavy())),
  play: async () => {
    await openPlanner()
    const environment = getEnvironment()

    // Open the delete confirmation for the selected workspace A.
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await expect(
      screen.getByRole('button', { name: 'Delete permanently' }),
    ).toBeTruthy()

    // Switch to workspace B while the confirmation is open.
    await userEvent.selectOptions(
      screen.getByLabelText('Workspace') as HTMLSelectElement,
      'ws-2',
    )
    await waitFor(async () => {
      await expect(plannerSlice(environment).selectedWorkspaceId).toBe('ws-2')
    })

    // The pending confirmation is gone: B cannot be deleted by the stale action.
    await expect(
      screen.queryByRole('button', { name: 'Delete permanently' }),
    ).toBeNull()
    await expect(plannerSlice(environment).workspaces.map((w) => w.id)).toEqual([
      'ws-1',
      'ws-2',
    ])
  },
}

export const RenameConfirmationInvalidatedOnSwitch: Story = {
  name: 'Rename confirmation is invalidated when the selection changes',
  parameters: params(withNavy(twoWorkspaceNavy())),
  play: async () => {
    await openPlanner()
    const environment = getEnvironment()

    // Open the rename editor for workspace A and type a new name.
    await userEvent.click(screen.getByRole('button', { name: 'Rename' }))
    const input = screen.getByLabelText('Workspace name') as HTMLInputElement
    await userEvent.clear(input)
    await userEvent.type(input, 'RenamedA')

    // Switch to B while the editor is open; it must close without renaming A.
    await userEvent.selectOptions(
      screen.getByLabelText('Workspace') as HTMLSelectElement,
      'ws-2',
    )
    await waitFor(async () => {
      await expect(plannerSlice(environment).selectedWorkspaceId).toBe('ws-2')
    })
    await expect(screen.queryByLabelText('Workspace name')).toBeNull()

    const navy = plannerSlice(environment)
    const nameOf = (id: string) => {
      const workspace = navy.workspaces.find((w) => w.id === id)
      return workspace.revisions[workspace.cursor].content.name
    }
    await expect(nameOf('ws-1')).toBe('Plan')
    await expect(nameOf('ws-2')).toBe('Second')
  },
}

export const DuplicateIsIndependentOfSource: Story = {
  name: 'Editing a duplicate never changes the original workspace',
  parameters: params({ current: [[1], []], mapname: ['E1', 'E2'] }),
  play: async () => {
    await openPlanner()
    const environment = getEnvironment()

    await userEvent.click(screen.getByRole('button', { name: 'Duplicate' }))
    await waitFor(async () => {
      await expect(plannerSlice(environment).workspaces.length).toBe(2)
    })
    const duplicateId = plannerSlice(environment).selectedWorkspaceId
    await expect(duplicateId).not.toBe('ws-1')

    // Add a ship to the duplicate only.
    const input = await openAddShip('E1')
    await userEvent.type(input, 'epsilon')
    await userEvent.click(await screen.findByText('Epsilon'))
    await waitFor(async () => {
      await expect(assignedShipIds(environment)).toContain(5)
    })

    const navy = plannerSlice(environment)
    const idsOf = (id: string) => {
      const workspace = navy.workspaces.find((w) => w.id === id)
      return Object.values(
        workspace.revisions[workspace.cursor].content.assignments,
      ).flat()
    }
    await expect(idsOf('ws-1')).toEqual([1])
    await expect((idsOf(duplicateId) as number[]).sort()).toEqual([1, 5])
  },
}
