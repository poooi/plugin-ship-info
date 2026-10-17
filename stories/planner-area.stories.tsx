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

const withNavy = (navy: unknown, account = '123'): PlannerScenarioOptions => ({
  extra: { [NAVY]: { account, error: null, navy, ready: true } },
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
  await expect(await screen.findByRole('tab', { name: 'Plan' })).toBeTruthy()
  return document.querySelector('#poi-plugin-navy-staff') as HTMLElement
}

// History is a contextual task inside the default Plan page.
// `fireEvent` is used so these also work while a modal rename/delete dialog is
// open (the backdrop would intercept pointer input).
const openHistoryTab = async () => {
  fireEvent.click(await screen.findByRole('button', { name: 'History' }))
}

// Opens the History task and selects a revision (opens a read-only preview).
const selectHistoryRevision = async (value: string) => {
  await openHistoryTab()
  fireEvent.change(screen.getByLabelText('History'), { target: { value } })
}

// Switches the selected workspace even when a modal dialog covers the page.
const switchWorkspace = (id: string) => {
  fireEvent.change(screen.getByLabelText('Workspace'), { target: { value: id } })
}

// Workspace rename/duplicate/delete live in a Blueprint actions menu.
const clickWorkspaceAction = async (name: string) => {
  await userEvent.click(
    await screen.findByRole('button', { name: 'Workspace actions' }),
  )
  await userEvent.click(await screen.findByRole('menuitem', { name }))
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
    await expect(within(view).getByRole('tab', { name: 'Grid Palette' })).toBeTruthy()
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

export const DifferentAccountFileShowsSavedData: Story = {
  name: 'A loaded account file that differs from the host shows saved data only',
  parameters: params({
    ...withNavy(
      (() => {
        const navy = mkNavyData({ current: [[1]] })
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
      '202',
    ),
  }),
  play: async () => {
    await openPlanner()
    // The saved record renders; the live picker is unavailable while the loaded
    // account file (202) differs from the host account (123).
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
    await clickWorkspaceAction('Rename')
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

    await clickWorkspaceAction('Duplicate')
    await waitFor(async () => {
      await expect(plannerSlice(environment).workspaces.length).toBe(before + 1)
    })
    // The duplicate starts a fresh initial revision.
    const navy = plannerSlice(environment)
    const duplicate = navy.workspaces.find((w) => w.id === navy.selectedWorkspaceId)
    await expect(duplicate.cursor).toBe(0)

    await clickWorkspaceAction('Delete')
    await userEvent.click(
      await screen.findByRole('button', { name: 'Delete permanently' }),
    )
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
    await clickWorkspaceAction('Delete')
    await expect(
      screen.getByRole('button', { name: 'Delete permanently' }),
    ).toBeTruthy()

    // Switch to workspace B while the confirmation is open.
    switchWorkspace('ws-2')
    await waitFor(async () => {
      await expect(plannerSlice(environment).selectedWorkspaceId).toBe('ws-2')
    })

    // The pending confirmation is gone: B cannot be deleted by the stale action.
    await waitFor(async () => {
      await expect(
        screen.queryByRole('button', { name: 'Delete permanently' }),
      ).toBeNull()
    })
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
    await clickWorkspaceAction('Rename')
    const input = screen.getByLabelText('Workspace name') as HTMLInputElement
    await userEvent.clear(input)
    await userEvent.type(input, 'RenamedA')

    // Switch to B while the editor is open; it must close without renaming A.
    switchWorkspace('ws-2')
    await waitFor(async () => {
      await expect(plannerSlice(environment).selectedWorkspaceId).toBe('ws-2')
    })
    await waitFor(async () => {
      await expect(screen.queryByLabelText('Workspace name')).toBeNull()
    })

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

    await clickWorkspaceAction('Duplicate')
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

// A single workspace with two revisions so history controls are available.
const historyNavy = () => {
  const navy = mkNavyData({ current: [[1], []] })
  const workspace = navy.workspaces[0]
  const base = workspace.revisions[0]
  workspace.revisions = [
    base,
    {
      content: {
        ...base.content,
        assignments: { ...base.content.assignments, 'area-1': [1, 5] },
      },
      id: 'rev-2',
      op: { areaId: 'area-1', kind: 'add-ship', shipId: 5 },
      time: '2026-01-02T00:00:00.000Z',
    },
  ]
  workspace.cursor = 1
  return navy
}

const twoWorkspacesWithHistory = () => {
  const navy = twoWorkspaceNavy()
  const first = navy.workspaces[0]
  const base = first.revisions[0]
  first.revisions = [
    base,
    {
      content: {
        ...base.content,
        assignments: { ...base.content.assignments, 'area-1': [1, 5] },
      },
      id: 'rev-1b',
      op: { areaId: 'area-1', kind: 'add-ship', shipId: 5 },
      time: '2026-01-02T00:00:00.000Z',
    },
  ]
  first.cursor = 1
  return navy
}

export const PreviewClosesWhenSwitchingWorkspace: Story = {
  name: 'A history preview closes when switching away and does not reappear',
  parameters: params(withNavy(twoWorkspacesWithHistory())),
  play: async () => {
    await openPlanner()
    const environment = getEnvironment()
    const select = screen.getByLabelText('Workspace') as HTMLSelectElement

    // Open a preview of the older revision of workspace A.
    await selectHistoryRevision('rev-1')
    await expect(
      screen.getByText('History is read-only. Return to the current plan to edit.'),
    ).toBeTruthy()

    // Switch to B and back to A.
    await userEvent.selectOptions(select, 'ws-2')
    await waitFor(async () => {
      await expect(plannerSlice(environment).selectedWorkspaceId).toBe('ws-2')
    })
    await userEvent.selectOptions(select, 'ws-1')
    await waitFor(async () => {
      await expect(plannerSlice(environment).selectedWorkspaceId).toBe('ws-1')
    })

    // The preview is gone, not resurrected.
    await expect(
      screen.queryByText('History is read-only. Return to the current plan to edit.'),
    ).toBeNull()
  },
}

export const RenameEditorClosedWhenEnteringPreview: Story = {
  name: 'Entering a preview closes a pending rename and blocks confirmation',
  parameters: params(withNavy(historyNavy())),
  play: async () => {
    await openPlanner()

    // Open the rename editor.
    await clickWorkspaceAction('Rename')
    await expect(screen.getByLabelText('Workspace name')).toBeTruthy()

    // Enter a preview by selecting the older revision.
    await selectHistoryRevision('rev-1')
    await waitFor(async () => {
      await expect(
        screen.getByText('History is read-only. Return to the current plan to edit.'),
      ).toBeTruthy()
    })

    // The pending rename editor is closed and cannot be confirmed.
    await waitFor(async () => {
      await expect(screen.queryByLabelText('Workspace name')).toBeNull()
    })
    await expect(screen.queryByRole('button', { name: 'Confirm' })).toBeNull()
  },
}

// A saved record for ship 3 (level 5) while the live roster has Gamma Lv.150,
// plus a second revision so history controls are available.
const savedVsLiveNavy = () => {
  const navy = mkNavyData({ current: [[3], []] })
  const workspace = navy.workspaces[0]
  const base = workspace.revisions[0]
  base.content.ships = {
    '3': {
      level: 5,
      masterId: 3,
      name: 'Gamma',
      observedAt: '2026-01-01T00:00:00.000Z',
      ownedId: 3,
      typeId: 3,
      typeLabel: 'CL',
    },
  }
  workspace.revisions = [
    base,
    {
      content: { ...base.content, name: 'Renamed' },
      id: 'rev-2',
      op: { kind: 'rename', name: 'Renamed' },
      time: '2026-01-02T00:00:00.000Z',
    },
  ]
  workspace.cursor = 1
  return navy
}

export const PreviewShowsSavedLevelNotLive: Story = {
  name: 'A preview shows the captured level, not the current live level',
  parameters: params(withNavy(savedVsLiveNavy())),
  play: async () => {
    await openPlanner()

    // Editing overlays the live level (Gamma Lv.150).
    await expect(within(areaCard('E1')).getByText(/Lv\.150/)).toBeTruthy()

    // Previewing the older revision shows the captured level (Lv.5).
    await selectHistoryRevision('rev-1')
    await waitFor(async () => {
      await expect(
        screen.getByText('History is read-only. Return to the current plan to edit.'),
      ).toBeTruthy()
    })
    await expect(within(areaCard('E1')).getByText(/Lv\.5/)).toBeTruthy()
    await expect(within(areaCard('E1')).queryByText(/Lv\.150/)).toBeNull()
  },
}

export const PreviewIsReadOnlyInBothViews: Story = {
  name: 'A preview is read-only in both the area and grid views',
  parameters: params(withNavy(historyNavy())),
  play: async () => {
    await openPlanner()

    await selectHistoryRevision('rev-1')
    await waitFor(async () => {
      await expect(
        screen.getByText('History is read-only. Return to the current plan to edit.'),
      ).toBeTruthy()
    })

    // Area view: no live picker and no chip removal.
    await expect(
      within(areaCard('E1')).queryByRole('button', { name: 'Add ship' }),
    ).toBeNull()
    await expect(
      screen.queryByRole('button', { name: 'Remove tag' }),
    ).toBeNull()

    // Grid view: no palette control and no interactive cards.
    await userEvent.click(screen.getByRole('tab', { name: 'Grid Palette' }))
    await expect(screen.queryByLabelText('Assign to')).toBeNull()
    await expect(screen.queryByRole('button', { name: /Lv\./ })).toBeNull()

    // Read-only cards are labelled groups (no list parent), not tab stops.
    const cards = screen.getAllByRole('group', { name: /Lv\./ })
    await expect(cards.length).toBeGreaterThan(0)
    cards[0].focus()
    await expect(document.activeElement).not.toBe(cards[0])

    // Clicking or right-clicking a read-only card mutates nothing durable.
    const environment = getEnvironment()
    const before = [...assignedShipIds(environment)].sort()
    await userEvent.click(cards[0])
    fireEvent.contextMenu(cards[0])
    await expect([...assignedShipIds(environment)].sort()).toEqual(before)
  },
}

export const HistoryCurrentRevisionUsesCapturedContent: Story = {
  name: 'History at the current cursor shows captured levels/ships without live-only ships',
  parameters: params(withNavy(savedVsLiveNavy())),
  play: async () => {
    await openPlanner()
    // Plan overlays the live level (Gamma Lv.150).
    await expect(within(areaCard('E1')).getByText(/Lv\.150/)).toBeTruthy()

    // History at the current cursor (no preview): captured snapshot only.
    await openHistoryTab()
    await expect(within(areaCard('E1')).getByText(/Lv\.5/)).toBeTruthy()
    await expect(within(areaCard('E1')).queryByText(/Lv\.150/)).toBeNull()

    // Grid shows captured ships only: ship 3 present, live-only Alpha absent.
    await userEvent.click(screen.getByRole('tab', { name: 'Grid Palette' }))
    await expect(screen.getByRole('group', { name: 'Gamma Lv.5' })).toBeTruthy()
    await expect(screen.queryByRole('group', { name: /Alpha/ })).toBeNull()
  },
}

export const RestoreThenUndo: Story = {
  name: 'Restore appends one revision and Undo immediately works',
  parameters: params(withNavy(historyNavy())),
  play: async () => {
    await openPlanner()
    const environment = getEnvironment()

    await selectHistoryRevision('rev-1')
    await userEvent.click(
      screen.getByRole('button', { name: 'Restore this state' }),
    )

    await waitFor(async () => {
      const workspace = plannerSlice(environment).workspaces[0]
      await expect(workspace.cursor).toBe(2)
      await expect(workspace.revisions).toHaveLength(3)
    })
    // Restoring leaves preview, so Undo operates on the restored revision.
    await expect(
      screen.queryByText('History is read-only. Return to the current plan to edit.'),
    ).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }))
    await waitFor(async () => {
      await expect(plannerSlice(environment).workspaces[0].cursor).toBe(1)
    })
  },
}
