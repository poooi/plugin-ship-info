// Real plugin Chromium scenarios for the manual-sync toolbar. They drive the
// integrated Redux actions through the plugin UI and assert durable workspace
// state, not a fake append callback.

import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fireEvent, screen, userEvent, waitFor, within } from 'storybook/test'

import { host } from '../preview/adapters/logs'
import {
  assignedShipIds,
  navyAccountFile,
  persistedNavyFile,
  plannerScenarioState,
  plannerSlice,
} from '../preview/planner-fixtures'
import { getEnvironment } from '../preview/scenario'
import { reactClass as NavyStaff } from '../packages/navy-staff/src/views'
import { onAddShip } from '../packages/navy-staff/src/views/workspace/creators'
import type {
  NavyWorkspace,
  NavyWorkspaceContent,
} from '../packages/navy-staff/src/views/workspace/types'
import { mkNavyArea, mkNavyData } from '../tests/ui/fixtures'
import { mkShip } from '../tests/fixtures'

const NAVY = 'poi-plugin-navy-staff'

type ScenarioOptions = Parameters<typeof plannerScenarioState>[0]

const params = (options: ScenarioOptions) => ({
  shipInfo: { plugin: 'navy-staff' as const, state: plannerScenarioState(options) },
})

const openPlanner = async () => {
  await expect(await screen.findByRole('button', { name: 'Area View' })).toBeTruthy()
  return document.querySelector('#poi-plugin-navy-staff') as HTMLElement
}

const workspace = (environment: { store: { getState: () => any } }): NavyWorkspace => {
  const navy = plannerSlice(environment)
  return navy.workspaces.find(
    (w) => w.id === navy.selectedWorkspaceId,
  ) as NavyWorkspace
}
const revisions = (environment: { store: { getState: () => any } }) =>
  workspace(environment).revisions
const content = (environment: {
  store: { getState: () => any }
}): NavyWorkspaceContent => {
  const w = workspace(environment)
  return w.revisions[w.cursor].content
}
const areaLabel = (
  environment: { store: { getState: () => any } },
  id: string,
): string | undefined => content(environment).areas.find((a) => a.id === id)?.label

const openSyncFlow = async (button: string) => {
  await userEvent.click(await screen.findByRole('button', { name: 'Update from game' }))
  await userEvent.click(await screen.findByRole('button', { name: button }))
  await userEvent.click(
    await screen.findByRole('checkbox', {
      name: 'I confirm this source is the intended event',
    }),
  )
  await userEvent.click(screen.getByRole('button', { name: 'Preview changes' }))
  await expect(await screen.findByTestId('sync-preview')).toBeTruthy()
}

const accept = async () => {
  await userEvent.click(screen.getByRole('button', { name: 'Accept' }))
}

// A workspace whose captured areas differ from the host source but keep the same
// tag-slot hints, so the default slot mapping maps slot 0/1 to area-1/area-2.
const oldAreasNavy = () =>
  mkNavyData({
    areas: [
      mkNavyArea({ color: '#ff0000', id: 'area-1', label: 'E1', tagSlot: 0 }),
      mkNavyArea({ color: '#ff8800', id: 'area-2', label: 'E2', tagSlot: 1 }),
    ],
    current: [[1], []],
  })

const areaChangeState = (): ScenarioOptions => ({
  color: ['#00ff00', '#0000ff'],
  current: [[1], []],
  mapname: ['E1-new', 'E2-new'],
  extra: {
    [NAVY]: { account: '123', error: null, navy: oldAreasNavy(), ready: true },
  },
})

const meta = {
  title: 'NavyStaff/Sync',
  component: NavyStaff,
} satisfies Meta<typeof NavyStaff>

export default meta
type Story = StoryObj<typeof meta>

export const AreaMetadataSyncAppendsOneRevisionAndUndo: Story = {
  name: 'Area metadata sync appends exactly one revision and Undo reverts it',
  parameters: params(areaChangeState()),
  play: async () => {
    await openPlanner()
    const environment = getEnvironment()
    const before = revisions(environment).length

    await openSyncFlow('Update area information')
    // The reviewable diff shows the old -> new label before acceptance.
    await expect(within(screen.getByTestId('sync-preview')).getByText('E1')).toBeTruthy()
    await accept()

    await waitFor(() => {
      expect(revisions(environment).length).toBe(before + 1)
    })
    expect(areaLabel(environment, 'area-1')).toBe('E1-new')
    expect(areaLabel(environment, 'area-2')).toBe('E2-new')

    // Undo moves the cursor; it does not append a revision.
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }))
    await waitFor(() => {
      expect(areaLabel(environment, 'area-1')).toBe('E1')
    })
    expect(revisions(environment).length).toBe(before + 1)
  },
}

export const TagSyncAddsMovesAndPreservesMissing: Story = {
  name: 'Tag apply adds and moves ships and preserves a missing saved ship',
  parameters: params({
    color: ['#ff0000', '#00ff00'],
    current: [[1, 3], [9]],
    mapname: ['E1', 'E2'],
    ships: {
      1: mkShip({ api_id: 1, api_lv: 50, api_sally_area: 0 }),
      3: mkShip({ api_id: 3, api_lv: 150, api_sally_area: 2 }),
      5: mkShip({ api_id: 5, api_lv: 10, api_sally_area: 1 }),
    },
  }),
  play: async () => {
    await openPlanner()
    const environment = getEnvironment()
    const before = revisions(environment).length

    await openSyncFlow('Apply actual sortie tags')
    await accept()

    await waitFor(() => {
      expect(revisions(environment).length).toBe(before + 1)
    })
    const next = content(environment)
    // Ship 3 (tag slot 1) moves area-1 -> area-2; ship 5 (tag slot 0) is added
    // to area-1; ship 9 is absent from the roster and must be preserved.
    expect(next.assignments['area-1']).toEqual([1, 5])
    expect(next.assignments['area-2']).toEqual([9, 3])
  },
}

export const CancelWritesNothing: Story = {
  name: 'Cancelling a prepared sync changes nothing and writes no file',
  parameters: {
    shipInfo: {
      files: persistedNavyFile(oldAreasNavy(), '123'),
      lifecycle: true,
      plugin: 'navy-staff' as const,
      state: plannerScenarioState(areaChangeState()),
    },
  },
  play: async () => {
    await openPlanner()
    const environment = getEnvironment()
    await waitFor(() => {
      expect(environment.store.getState()[NAVY].ready).toBe(true)
    })
    const file = navyAccountFile('123')
    const fileBefore = JSON.stringify(host.log.files[file])
    const before = revisions(environment).length

    await openSyncFlow('Update area information')
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await expect(screen.queryByTestId('sync-preview')).toBeNull()

    expect(revisions(environment).length).toBe(before)
    expect(JSON.stringify(host.log.files[file])).toBe(fileBefore)
  },
}

export const NoOpAcceptAddsNoRevision: Story = {
  name: 'Accepting an unchanged comparison adds no revision',
  parameters: params({
    color: ['#ff0000', '#00ff00'],
    current: [[1], []],
    mapname: ['E1', 'E2'],
  }),
  play: async () => {
    await openPlanner()
    const environment = getEnvironment()
    const before = revisions(environment).length

    await openSyncFlow('Update area information')
    await accept()
    // No revision is appended; the flow simply closes.
    await waitFor(() => {
      expect(screen.queryByTestId('sync-preview')).toBeNull()
    })
    expect(revisions(environment).length).toBe(before)
  },
}

// A workspace with two revisions so a history preview can be opened.
const historyAreaNavy = () => {
  const navy = oldAreasNavy()
  const ws = navy.workspaces[0]
  const base = ws.revisions[0]
  ws.revisions = [
    base,
    {
      content: { ...base.content, name: 'Renamed' },
      id: 'rev-2',
      op: { kind: 'rename', name: 'Renamed' },
      time: '2026-01-02T00:00:00.000Z',
    },
  ]
  ws.cursor = 1
  return navy
}

export const PreparedSyncCannotAcceptDuringHistoryPreview: Story = {
  name: 'A prepared sync cannot be accepted while a history preview is open',
  parameters: params({
    color: ['#00ff00', '#0000ff'],
    current: [[1], []],
    mapname: ['E1-new', 'E2-new'],
    extra: {
      [NAVY]: { account: '123', error: null, navy: historyAreaNavy(), ready: true },
    },
  }),
  play: async () => {
    await openPlanner()
    await openSyncFlow('Update area information')

    fireEvent.click(await screen.findByRole('button', { name: 'History' }))
    fireEvent.change(screen.getByLabelText('History'), {
      target: { value: 'rev-1' },
    })
    await waitFor(() => {
      expect(screen.getByText(/history preview is open/i)).toBeTruthy()
    })
    // Entering preview discards the pending batch; no Accept remains.
    await expect(screen.queryByTestId('sync-preview')).toBeNull()
    await expect(screen.queryByRole('button', { name: 'Accept' })).toBeNull()
  },
}

const twoWorkspaceNavy = () => {
  const navy = mkNavyData({ current: [[1], []] })
  const second = JSON.parse(JSON.stringify(navy.workspaces[0]))
  second.id = 'ws-2'
  second.revisions[0].id = 'rev-2'
  second.revisions[0].content.name = 'Second'
  return { ...navy, workspaces: [navy.workspaces[0], second] }
}

export const SwitchWorkspaceInvalidatesPreparedSync: Story = {
  name: 'Switching workspace discards a prepared sync',
  parameters: params({
    color: ['#00ff00', '#0000ff'],
    current: [[1], []],
    mapname: ['E1-new', 'E2-new'],
    extra: {
      [NAVY]: { account: '123', error: null, navy: twoWorkspaceNavy(), ready: true },
    },
  }),
  play: async () => {
    await openPlanner()
    const environment = getEnvironment()
    await openSyncFlow('Update area information')

    await userEvent.selectOptions(
      screen.getByLabelText('Workspace') as HTMLSelectElement,
      'ws-2',
    )
    await waitFor(() => {
      expect(plannerSlice(environment).selectedWorkspaceId).toBe('ws-2')
    })
    await expect(screen.queryByTestId('sync-preview')).toBeNull()
  },
}

export const SwitchAccountInvalidatesPreparedSync: Story = {
  name: 'Switching account discards a prepared sync',
  parameters: {
    shipInfo: {
      files: {
        ...persistedNavyFile(oldAreasNavy(), '101'),
        ...persistedNavyFile(mkNavyData({ current: [[2], []] }), '202'),
      },
      lifecycle: true,
      plugin: 'navy-staff' as const,
      state: plannerScenarioState({
        color: ['#00ff00', '#0000ff'],
        current: [[1], []],
        mapname: ['E1-new', 'E2-new'],
        extra: { info: { basic: { api_member_id: '101' } } },
      }),
    },
  },
  play: async () => {
    await openPlanner()
    const environment = getEnvironment()
    await waitFor(() => {
      expect(environment.store.getState()[NAVY].ready).toBe(true)
    })
    await openSyncFlow('Update area information')

    environment.store.dispatch({
      type: 'TEST/REPLACE',
      state: { info: { basic: { api_member_id: '202' } } },
    })
    await waitFor(() => {
      expect(assignedShipIds(environment)).toContain(2)
    })
    await expect(screen.queryByTestId('sync-preview')).toBeNull()
  },
}

export const StaleRosterAfterPrepareRejects: Story = {
  name: 'A roster change after preview makes Accept stale and adds no revision',
  parameters: params({
    color: ['#ff0000', '#00ff00'],
    current: [[1, 3], [9]],
    mapname: ['E1', 'E2'],
    ships: {
      1: mkShip({ api_id: 1, api_lv: 50, api_sally_area: 0 }),
      3: mkShip({ api_id: 3, api_lv: 150, api_sally_area: 2 }),
      5: mkShip({ api_id: 5, api_lv: 10, api_sally_area: 1 }),
    },
  }),
  play: async () => {
    await openPlanner()
    const environment = getEnvironment()
    await openSyncFlow('Apply actual sortie tags')
    const before = revisions(environment).length

    // Change a candidate ship's tag while the preview is open.
    const state = environment.store.getState()
    environment.store.dispatch({
      type: 'TEST/REPLACE',
      state: {
        info: {
          ...state.info,
          ships: {
            ...state.info.ships,
            5: { ...state.info.ships[5], api_sally_area: 2 },
          },
        },
      },
    })

    await accept()
    await waitFor(() => {
      expect(screen.getByTestId('sync-stale')).toBeTruthy()
    })
    expect(revisions(environment).length).toBe(before)
  },
}

export const PreparedSyncSurvivesPlanDetour: Story = {
  name: 'A prepared sync keeps its mapping across a Plan detour and stays freshness-checked',
  parameters: params(areaChangeState()),
  play: async () => {
    await openPlanner()
    const environment = getEnvironment()

    await userEvent.click(await screen.findByRole('button', { name: 'Update from game' }))
    await userEvent.click(
      await screen.findByRole('button', { name: 'Update area information' }),
    )
    // Remap slot 1 to a new area, then slot 0 onto the existing area-2 so the
    // mapping stays a valid one-to-one choice.
    await userEvent.selectOptions(
      screen.getByLabelText('Slot mapping: E2-new'),
      '',
    )
    await userEvent.selectOptions(
      screen.getByLabelText('Slot mapping: E1-new'),
      'area-2',
    )
    await userEvent.click(
      await screen.findByRole('checkbox', {
        name: 'I confirm this source is the intended event',
      }),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Preview changes' }))
    await expect(await screen.findByTestId('sync-preview')).toBeTruthy()

    // Return to the editor and reopen the contextual update task.
    await userEvent.click(screen.getByRole('button', { name: 'Return to current plan' }))
    await userEvent.click(screen.getByRole('button', { name: 'Update from game' }))

    // The chosen mapping and the prepared preview survived.
    await expect(screen.getByTestId('sync-preview')).toBeTruthy()
    await expect(
      (screen.getByLabelText('Slot mapping: E1-new') as HTMLSelectElement).value,
    ).toBe('area-2')

    // Freshness still applies after the detour: a new revision makes Accept stale.
    environment.store.dispatch(
      onAddShip({
        areaId: 'area-2',
        now: new Date().toISOString(),
        record: {
          level: 1,
          masterId: 1,
          name: 'X',
          observedAt: new Date().toISOString(),
          ownedId: 99,
          typeId: 2,
          typeLabel: 'DD',
        },
        shipId: 99,
      }),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Accept' }))
    await waitFor(() => {
      expect(screen.getByTestId('sync-stale')).toBeTruthy()
    })
  },
}
