import { Classes } from '@blueprintjs/core'
import type { Meta, StoryObj } from '@storybook/react-vite'
import React from 'react'
import { expect, screen, userEvent, waitFor, within } from 'storybook/test'
import { I18nextProvider } from 'react-i18next'
import { WindowEnv } from 'views/components/etc/window-env'

import { createNavyOnlyI18n } from '../preview/i18n'
import { host } from '../preview/adapters/logs'
import { mkNavyData } from '../tests/ui/fixtures'
import {
  assignedShipIds,
  denseLongNameMasters,
  densePlannerState,
  navyAccountFile,
  persistedNavyFile,
  persistedPluginFile,
  plannerScenarioState,
  plannerSlice,
} from '../preview/planner-fixtures'
import { disposeScenario, getEnvironment } from '../preview/scenario'
import { reactClass as NavyStaff } from '../packages/navy-staff/src/views'
import { reactClass as ShipInfo } from '../packages/ship-info/src/views'

// Responsive shell: fills the scenario surface the decorator sizes, instead of
// pinning a fixed 1200px panel, so narrow/medium/wide stories are meaningful.
const Shell: React.FC = () => (
  <div style={{ display: 'flex', height: '100%', width: '100%' }}>
    <NavyStaff />
  </div>
)

const meta = {
  title: 'NavyStaff/Integrated',
  component: Shell,
  // No meta-level state: Storybook deep-merges parameters, so a populated meta
  // state would leak its roster into stories that override `ships`/`mapname`.
  // Every story supplies its own complete `shipInfo.state`.
  parameters: {
    shipInfo: {
      dimensions: { width: 1400, height: 760 },
      lifecycle: true,
      plugin: 'navy-staff' as const,
    },
  },
} satisfies Meta<typeof Shell>

export default meta
type Story = StoryObj<typeof meta>

const playOnMainView = async () => {
  await expect(await screen.findByRole('button', { name: 'Plan' })).toBeTruthy()
  return document.querySelector('#poi-plugin-navy-staff') as HTMLElement
}

export const NavyAlone: Story = {
  name: 'Navy Staff alone: main view with no Ship Info table or sidebar',
  parameters: {
    shipInfo: {
      dimensions: { width: 1400, height: 760 },
      lifecycle: true,
      plugin: 'navy-staff',
      state: plannerScenarioState({ mapname: ['E1', 'E2'] }),
    },
  },
  play: async () => {
    const view = await playOnMainView()
    await expect(document.querySelector('#poi-plugin-ship-info')).toBeNull()
    await expect(
      within(view).queryByRole('button', { name: 'Columns' }),
    ).toBeNull()
    await waitFor(async () => {
      await expect(
        getEnvironment().store.getState()['poi-plugin-navy-staff'].ready,
      ).toBe(true)
    })
  },
}

export const BothPluginsIndependent: Story = {
  name: 'Both plugins share one host store with isolated slices',
  parameters: {
    shipInfo: {
      dimensions: { width: 1400, height: 760 },
      lifecycle: false,
      plugin: 'both',
      state: plannerScenarioState({ current: [[1]], mapname: ['E1'] }),
    },
  },
  render: () => (
    <div style={{ display: 'flex', height: 680, width: 1200 }}>
      <NavyStaff />
      <ShipInfo />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByRole('combobox', { name: 'View' })).toBeTruthy()
    // 'Alpha' appears in both roots; scope to the Ship Info table.
    const shipInfoRoot = document.querySelector(
      '#poi-plugin-ship-info',
    ) as HTMLElement
    await expect(await within(shipInfoRoot).findByText('Alpha')).toBeTruthy()

    const shipInfoBefore = getEnvironment().store.getState()['poi-plugin-ship-info']

    // Make a real Navy edit through the UI. The add-ship menu renders in a
    // Blueprint portal; scope to it so the table's Epsilon row is not matched.
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Add ship' }),
    )
    const popover = document.querySelector(
      `.${Classes.POPOVER_CONTENT}`,
    ) as HTMLElement
    await userEvent.click(within(popover).getByText('Epsilon'))

    await waitFor(() => {
      expect(assignedShipIds(getEnvironment())).toContain(5)
    })
    // The Ship Info slice is untouched by the Navy edit.
    expect(getEnvironment().store.getState()['poi-plugin-ship-info']).toBe(
      shipInfoBefore,
    )
  },
}

export const LocalizedNavyLabelsNoFallback: Story = {
  name: 'Navy labels resolve from the Navy bundle only (no Ship Info fallback)',
  parameters: {
    shipInfo: {
      dimensions: { width: 1400, height: 760 },
      lifecycle: false,
      plugin: 'navy-staff',
      state: plannerScenarioState({ mapname: ['E1'] }),
    },
  },
  render: () => (
    <I18nextProvider i18n={createNavyOnlyI18n('ja-JP')}>
      <div style={{ display: 'flex', height: 680, width: 1200 }}>
        <NavyStaff />
      </div>
    </I18nextProvider>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // Navy's own ja-JP bundle: 'Add ship' -> 艦娘を追加 (fallbackLng disabled).
    await expect(
      await canvas.findByRole('button', { name: '艦娘を追加' }),
    ).toBeTruthy()
    await userEvent.click(canvas.getByRole('button', { name: '艦娘を追加' }))
    // 'All' type tab is also localized from the Navy namespace.
    await expect(await screen.findByRole('tab', { name: 'すべて' })).toBeTruthy()
  },
}

export const MigratedPlanSmallerMap: Story = {
  name: 'A migrated plan survives a smaller host map (no truncation)',
  parameters: {
    shipInfo: {
      dimensions: { width: 1400, height: 760 },
      lifecycle: true,
      plugin: 'navy-staff',
      files: persistedPluginFile({ current: [[1], [2], [3]] }),
      state: plannerScenarioState({ mapname: ['E1'] }),
    },
  },
  play: async () => {
    const view = await playOnMainView()
    await waitFor(async () => {
      await expect(assignedShipIds(getEnvironment())).toEqual([1, 2, 3])
    })
    await expect(
      within(view).queryByRole('heading', { level: 5, name: /E2/ }),
    ).toBeNull()
  },
}

export const MigratedPlanUnloadedRoster: Story = {
  name: 'A migrated plan is kept while host roster/map data has not loaded',
  parameters: {
    shipInfo: {
      dimensions: { width: 1400, height: 760 },
      lifecycle: true,
      plugin: 'navy-staff',
      files: persistedPluginFile({ current: [[1], [2]] }),
      state: plannerScenarioState({ mapname: [], ships: {} }),
    },
  },
  play: async () => {
    await playOnMainView()
    // The roster really is empty (no meta-state leak).
    expect(
      Object.keys(getEnvironment().store.getState().info.ships).length,
    ).toBe(0)
    await waitFor(async () => {
      await expect(assignedShipIds(getEnvironment())).toEqual([1, 2])
    })
  },
}

export const DetachedDisplayOptionUsesGlobalConfig: Story = {
  name: 'The display toggle works in a detached window without its own config',
  parameters: {
    shipInfo: {
      dimensions: { width: 1400, height: 760 },
      isMain: false,
      lifecycle: false,
      plugin: 'navy-staff',
      state: plannerScenarioState(),
    },
  },
  render: () => {
    // A detached external window has no `config`; the toggle must fall back to
    // the renderer's global config.
    const detachedWindow = { isMain: false } as unknown as Window
    return (
      <WindowEnv.Provider value={{ window: detachedWindow } as never}>
        <div style={{ display: 'flex', height: 680, width: 1200 }}>
          <NavyStaff />
        </div>
      </WindowEnv.Provider>
    )
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.selectOptions(
      await canvas.findByRole('combobox', { name: 'Area labels' }),
      'fleet',
    )
    await waitFor(async () => {
      const calls = getEnvironment().configCalls
      await expect(
        calls.some(
          ([path, value]) =>
            path === 'plugin.NavyStaff.displayFleetName' && value === true,
        ),
      ).toBe(true)
    })
  },
}

export const AccountFileIsAuthoritative: Story = {
  name: 'An existing account file is used and never falls back to Ship Info',
  parameters: {
    shipInfo: {
      dimensions: { width: 1400, height: 760 },
      files: {
        // Ship Info legacy carries a different plan (ship 7).
        ...persistedPluginFile({ current: [[7]] }),
        // The account file (ship 1) is authoritative when present.
        ...persistedNavyFile(mkNavyData({ current: [[1], []] }), '123'),
      },
      lifecycle: true,
      plugin: 'navy-staff',
      state: plannerScenarioState({ mapname: ['E1'] }),
    },
  },
  play: async () => {
    const view = await playOnMainView()
    const environment = getEnvironment()
    await waitFor(() => {
      expect(environment.store.getState()['poi-plugin-navy-staff'].ready).toBe(true)
    })

    const file = navyAccountFile('123')
    // The account plan is loaded, not the legacy Ship Info plan.
    expect(assignedShipIds(environment)).toContain(1)
    expect(assignedShipIds(environment)).not.toContain(7)

    // Two captured areas each expose an Add ship button; use the first area's.
    const addShipButtons = await within(view).findAllByRole('button', {
      name: 'Add ship',
    })
    await userEvent.click(addShipButtons[0])
    const popover = document.querySelector(
      `.${Classes.POPOVER_CONTENT}`,
    ) as HTMLElement
    await userEvent.click(await within(popover).findByText('Epsilon'))

    await waitFor(() => {
      const saved = host.log.files[file] as any
      const ids = saved.workspaces.flatMap((workspace: any) =>
        Object.values(
          workspace.revisions[workspace.cursor].content.assignments,
        ).flat(),
      )
      expect(ids).toContain(5)
    })
    await expect((host.log.files[file] as any)?.version).toBe(2)
  },
}

const previewFileNavy = () => {
  const navy = mkNavyData({ current: [[1], []] })
  const workspace = navy.workspaces[0]
  const base = workspace.revisions[0]
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
  return { ...navy, version: 2 }
}

export const HistoryPreviewWritesNothing: Story = {
  name: 'Opening and closing a history preview writes no file',
  parameters: {
    shipInfo: {
      dimensions: { width: 1400, height: 760 },
      files: persistedNavyFile(previewFileNavy(), '123'),
      lifecycle: true,
      plugin: 'navy-staff',
      state: plannerScenarioState(),
    },
  },
  play: async () => {
    await playOnMainView()
    const environment = getEnvironment()
    await waitFor(() => {
      expect(environment.store.getState()['poi-plugin-navy-staff'].ready).toBe(true)
    })

    const file = navyAccountFile('123')
    const fileText = () => JSON.stringify(host.log.files[file])
    const before = fileText()

    // History selection lives on the History page.
    await userEvent.click(await screen.findByRole('button', { name: 'History' }))

    await userEvent.selectOptions(
      screen.getByLabelText('History') as HTMLSelectElement,
      'rev-1',
    )
    await expect(
      screen.getByText('History is read-only. Return to the current plan to edit.'),
    ).toBeTruthy()

    await userEvent.selectOptions(
      screen.getByLabelText('History') as HTMLSelectElement,
      'rev-2',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Return to current plan' }))
    await expect(
      screen.queryByText('History is read-only. Return to the current plan to edit.'),
    ).toBeNull()

    expect(fileText()).toBe(before)
  },
}

const accountNavy = (ids: number[]) => ({
  ...mkNavyData({ current: [ids, []] }),
  version: 2,
})

export const AccountSwitchLoadsPerAccountFile: Story = {
  name: 'Switching account loads that account file and shows no binding control',
  parameters: {
    shipInfo: {
      dimensions: { width: 1400, height: 760 },
      files: {
        ...persistedNavyFile(accountNavy([1]), '101'),
        ...persistedNavyFile(accountNavy([2]), '202'),
      },
      lifecycle: true,
      plugin: 'navy-staff',
      state: plannerScenarioState({
        extra: { info: { basic: { api_member_id: '101' } } },
        mapname: ['E1'],
      }),
    },
  },
  play: async () => {
    await playOnMainView()
    const environment = getEnvironment()
    const navyState = () => environment.store.getState()['poi-plugin-navy-staff']
    await waitFor(() => {
      expect(navyState().ready).toBe(true)
    })

    // Account 101's plan is loaded.
    expect(assignedShipIds(environment)).toContain(1)

    // Switch the host account to 202; the supervisor switches account files.
    environment.store.dispatch({
      type: 'TEST/REPLACE',
      state: { info: { basic: { api_member_id: '202' } } },
    })
    await waitFor(() => {
      expect(assignedShipIds(environment)).toContain(2)
    })
    expect(assignedShipIds(environment)).not.toContain(1)

    // No per-workspace account binding control exists.
    expect(screen.queryByText('Live roster linked')).toBeNull()
    expect(screen.queryByText(/Saved data \(/)).toBeNull()
  },
}

export const DisposeStopsAccountSupervisor: Story = {
  name: 'Disposing the scenario stops account switching from writing new files',
  parameters: {
    shipInfo: {
      dimensions: { width: 1400, height: 760 },
      files: persistedNavyFile(mkNavyData({ current: [[1], []] }), '101'),
      lifecycle: true,
      plugin: 'navy-staff',
      state: plannerScenarioState({
        extra: { info: { basic: { api_member_id: '101' } } },
        mapname: ['E1'],
      }),
    },
  },
  play: async () => {
    await playOnMainView()
    const environment = getEnvironment()
    const navyState = () => environment.store.getState()['poi-plugin-navy-staff']
    await waitFor(() => {
      expect(navyState().ready).toBe(true)
    })

    // Stop the scenario's supervisor while retaining the old store.
    disposeScenario(environment)
    const writesBefore = host.log.writtenFiles.length

    // An account change on the retained store must not create a new account file.
    environment.store.dispatch({
      type: 'TEST/REPLACE',
      state: { info: { basic: { api_member_id: '202' } } },
    })
    await new Promise((resolve) => setTimeout(resolve, 30))

    expect(host.log.files[navyAccountFile('202')]).toBeUndefined()
    expect(host.log.writtenFiles.length).toBe(writesBefore)
  },
}

// ---------------------------------------------------------------------------
// Dense visual scenarios: 300 owned ships across ten unevenly assigned areas.
// These inspect real card density, wrapping and overflow at narrow/medium/wide
// widths and in both themes. `lifecycle:false` because the fixture already
// carries real saved assignments and captured ship records.
// ---------------------------------------------------------------------------

const openDenseGrid = async () => {
  const container = document.querySelector('#poi-plugin-navy-staff') as HTMLElement
  await userEvent.selectOptions(await within(container).findByRole('combobox', { name: 'View' }), 'grid')
  await within(container).findByRole('heading', { level: 2, name: 'DD' })
  return container
}

// Every card is rendered (no virtualization) and the last group is reachable;
// the scroll container never overflows horizontally.
const assertDenseGrid = async (container: HTMLElement) => {
  const cells = await within(container).findAllByRole('button', { name: /Lv\./ })
  await expect(cells.length).toBe(300)
  await expect(
    within(container).getByRole('heading', { level: 2, name: 'Auxiliary' }),
  ).toBeTruthy()
  // Cards must stay readable at every width: no-overflow alone would also pass
  // for the former ~84px cards.
  const firstRect = cells[0].getBoundingClientRect()
  await expect(firstRect.width).toBeGreaterThanOrEqual(155)
  await expect(firstRect.height).toBeGreaterThanOrEqual(52)
  const scroll = container.querySelector('.navy-staff-scrollable') as HTMLElement
  await expect(scroll.scrollWidth).toBeLessThanOrEqual(scroll.clientWidth + 1)
  const lastCard = cells[cells.length - 1]
  lastCard.scrollIntoView({ block: 'end' })
  const lastRect = lastCard.getBoundingClientRect()
  const scrollRect = scroll.getBoundingClientRect()
  await expect(lastRect.top).toBeGreaterThanOrEqual(scrollRect.top)
  await expect(lastRect.bottom).toBeLessThanOrEqual(scrollRect.bottom + 1)
  scroll.scrollTop = 0
}

const denseParams = (
  dimensions: { width: number; height: number },
  overrides: Record<string, any> = {},
) => ({
  shipInfo: {
    dimensions,
    lifecycle: false,
    plugin: 'navy-staff' as const,
    state: densePlannerState(),
    ...overrides,
  },
})

export const DensePlanWide: Story = {
  name: '300 ships at 1200px: full grid, last group present, no horizontal overflow',
  parameters: denseParams({ width: 1200, height: 900 }),
  play: async () => {
    await assertDenseGrid(await openDenseGrid())
  },
}

export const DensePlanMedium: Story = {
  name: '300 ships at 720px: cards reflow without horizontal overflow',
  parameters: denseParams({ width: 720, height: 900 }),
  play: async () => {
    await assertDenseGrid(await openDenseGrid())
  },
}

export const DensePlanNarrow: Story = {
  name: '300 ships at 480px: single/narrow columns, no horizontal overflow',
  parameters: denseParams({ width: 480, height: 900 }),
  play: async () => {
    await assertDenseGrid(await openDenseGrid())
  },
}

export const DensePlanLight: Story = {
  name: '300 ships in the light theme render readable text without portraits',
  parameters: denseParams({ width: 1200, height: 900 }, { theme: 'light' }),
  play: async () => {
    await assertDenseGrid(await openDenseGrid())
  },
}

export const DensePlanPortraits: Story = {
  name: '300 ships with portraits keep the artwork and the assignment edge',
  parameters: denseParams(
    { width: 1200, height: 900 },
    {
      state: densePlannerState({
        config: {
          plugin: { ShipInfo: {} },
          poi: { appearance: { avatar: true } },
        },
      }),
    },
  ),
  play: async () => {
    const container = await openDenseGrid()
    await assertDenseGrid(container)
    const firstCard = within(container).getAllByRole('button', { name: /Lv\./ })[0]
    await expect(firstCard.querySelector('img')).toBeTruthy()
  },
}

const denseLongAreaNames = [
  'Prologue: Deep-Sea Engagement Zone Alpha',
  'Chapter 1: Night Battle at the Narrow Strait',
  'Chapter 2: Combined Fleet Air Defense',
  'Chapter 3: Southern Transport Escort',
  'Chapter 4: Submarine Patrol Line',
  'Extra Operation: Ironbottom Sound Revisited',
  'E7', 'E8', 'E9', 'E10',
]

export const DensePlanLongNames: Story = {
  name: 'Long workspace and area names wrap without overflowing the cards',
  parameters: denseParams(
    { width: 1200, height: 900 },
    {
      state: densePlannerState(
        { mapname: denseLongAreaNames, mstShips: denseLongNameMasters },
        'Event Plan: Final Combined Fleet Sortie (Long Workspace Name)',
      ),
    },
  ),
  play: async () => {
    await assertDenseGrid(await openDenseGrid())
  },
}

export const DensePlanScrollRestored: Story = {
  name: 'Each page keeps its own scroll position with 300 ships',
  parameters: denseParams({ width: 1200, height: 900 }),
  play: async () => {
    const container = await openDenseGrid()
    const body = container.querySelector('.navy-staff-scrollable') as HTMLElement

    // Scroll the grid deep into the roster.
    body.scrollTop = 600
    await expect(body.scrollTop).toBeGreaterThan(0)

    // A page visited for the first time opens at the top.
    await userEvent.click(
      within(container).getByRole('button', { name: 'Share' }),
    )
    await waitFor(async () => {
      await expect(body.scrollTop).toBe(0)
    })

    // Returning to Plan restores its previous position.
    await userEvent.click(within(container).getByRole('button', { name: 'Plan' }))
    await waitFor(async () => {
      await expect(body.scrollTop).toBeGreaterThan(0)
    })
  },
}
