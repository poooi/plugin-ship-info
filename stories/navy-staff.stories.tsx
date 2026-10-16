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
  NAVY_PLUGIN_DATA_PATH,
  persistedPluginFile,
  plannerScenarioState,
  plannerSlice,
} from '../preview/planner-fixtures'
import { getEnvironment } from '../preview/scenario'
import { reactClass as NavyStaff } from '../packages/navy-staff/src/views'
import { reactClass as ShipInfo } from '../packages/ship-info/src/views'

const Shell: React.FC = () => (
  <div style={{ display: 'flex', height: 680, width: 1200 }}>
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
  await expect(await screen.findByRole('tab', { name: 'Area View' })).toBeTruthy()
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
    await expect(await canvas.findByRole('tab', { name: 'Area View' })).toBeTruthy()
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
    await userEvent.click(
      await canvas.findByRole('checkbox', { name: 'Show fleet name' }),
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

export const UpgradesStoredFileAndSaves: Story = {
  name: 'A v0 Navy file is upgraded to v2 and later saves keep v2',
  parameters: {
    shipInfo: {
      dimensions: { width: 1400, height: 760 },
      files: {
        [NAVY_PLUGIN_DATA_PATH]: {
          planner: { archive: {}, current: [[1]] },
          ready: true,
        },
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

    // The v0 file was upgraded in place to the v2 workspace root.
    await waitFor(() => {
      expect((host.log.files[NAVY_PLUGIN_DATA_PATH] as any)?.version).toBe(2)
    })
    expect((host.log.files[NAVY_PLUGIN_DATA_PATH] as any)?.selectedWorkspaceId).toBeTruthy()
    expect((host.log.files[NAVY_PLUGIN_DATA_PATH] as any)?.legacyArchive).toEqual({})

    // The migrated workspace has an unknown owner, so start a fresh workspace
    // bound to the loaded roster, then add a ship through the live picker.
    await userEvent.click(
      await within(view).findByRole('button', { name: 'New workspace' }),
    )
    await userEvent.click(
      await within(view).findByRole('button', { name: 'Add ship' }),
    )
    const popover = document.querySelector(
      `.${Classes.POPOVER_CONTENT}`,
    ) as HTMLElement
    await userEvent.click(await within(popover).findByText('Epsilon'))

    await waitFor(() => {
      const saved = host.log.files[NAVY_PLUGIN_DATA_PATH] as any
      const ids = saved.workspaces.flatMap((workspace: any) =>
        Object.values(
          workspace.revisions[workspace.cursor].content.assignments,
        ).flat(),
      )
      expect(ids).toContain(5)
    })
    await expect(
      (host.log.files[NAVY_PLUGIN_DATA_PATH] as any)?.version,
    ).toBe(2)
  },
}

const previewFileNavy = () => {
  const navy = mkNavyData({ current: [[1], []], ownerMemberId: '123' })
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
      files: { [NAVY_PLUGIN_DATA_PATH]: previewFileNavy() },
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

    const fileText = () => JSON.stringify(host.log.files[NAVY_PLUGIN_DATA_PATH])
    const before = fileText()

    await userEvent.selectOptions(
      screen.getByLabelText('History') as HTMLSelectElement,
      'rev-1',
    )
    await expect(
      screen.getByText('Viewing an earlier revision (read-only)'),
    ).toBeTruthy()

    await userEvent.selectOptions(
      screen.getByLabelText('History') as HTMLSelectElement,
      'rev-2',
    )
    await expect(
      screen.queryByText('Viewing an earlier revision (read-only)'),
    ).toBeNull()

    expect(fileText()).toBe(before)
  },
}
