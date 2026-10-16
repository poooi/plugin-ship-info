import { Classes } from '@blueprintjs/core'
import type { Meta, StoryObj } from '@storybook/react-vite'
import React from 'react'
import { expect, screen, userEvent, waitFor, within } from 'storybook/test'

import type { Environment } from '../tests/ui/environment'
import { getTheme, Providers } from '../tests/ui/environment'
import { host, setSaveDialogResult } from '../preview/adapters/logs'
import {
  persistedPluginFile,
  plannerScenarioState,
  plannerSlice,
} from '../preview/planner-fixtures'
import { createScenarioEnvironment, getEnvironment } from '../preview/scenario'
import { reactClass as ShipInfo } from '../views'

const POPOVER = `.${Classes.POPOVER_CONTENT}`
const CARD = `.${Classes.CARD}`

// The real plugin root, pinned to a definite height so the virtualized table
// has a measurable scroll viewport in the browser.
const Shell: React.FC = () => (
  <div style={{ display: 'flex', height: 680, width: 1200 }}>
    <ShipInfo />
  </div>
)

const scenario = (): Environment =>
  createScenarioEnvironment({
    language: 'en-US',
    parameters: { state: plannerScenarioState() },
    theme: 'dark',
  })

// Test-only provider wrapper that can rebuild its environment and remount the
// real root on demand. This mirrors a story revisit: the new tree is the actual
// plugin UI, not just a fresh scenario object.
const ResetHarness: React.FC = () => {
  const [generation, setGeneration] = React.useState(0)
  const environment = React.useMemo(scenario, [generation])

  return (
    <Providers key={generation} environment={environment} theme={getTheme('dark')}>
      <button
        data-testid="reset-ship-info"
        onClick={() => setGeneration((value) => value + 1)}
        type="button"
      >
        Reset scenario
      </button>
      <div style={{ display: 'flex', height: 680, width: 1200 }}>
        <ShipInfo />
      </div>
    </Providers>
  )
}

const meta = {
  title: 'Integrated/PluginShell',
  component: Shell,
  parameters: {
    shipInfo: { state: plannerScenarioState() },
  },
} satisfies Meta<typeof Shell>

export default meta
type Story = StoryObj<typeof meta>

export const MountsWithPersistedPlanner: Story = {
  name: 'Root mounts table and sidebar with persisted planner data',
  parameters: {
    shipInfo: {
      state: plannerScenarioState({ mapname: ['E1', 'E2'] }),
      files: persistedPluginFile({ current: [[1, 2], [3]] }),
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Table renders the host fixture.
    await expect(await canvas.findByText('Alpha')).toBeTruthy()
    await expect(canvas.getByText('Beta')).toBeTruthy()

    // Sidebar exposes every panel trigger.
    await expect(canvas.getByRole('button', { name: 'Deck Planner' })).toBeTruthy()
    await expect(canvas.getByRole('button', { name: 'Columns' })).toBeTruthy()
    await expect(canvas.getByRole('button', { name: 'Filter' })).toBeTruthy()
    await expect(canvas.getByRole('button', { name: 'Export' })).toBeTruthy()

    // initStore loaded the persisted planner state from the seeded file.
    await waitFor(async () => {
      await expect(plannerSlice(getEnvironment()).current).toEqual([[1, 2], [3]])
    })
  },
}

// Blueprint sets aria-expanded on a popover trigger, so panel state is asserted
// semantically (re-querying the trigger each poll) rather than by scanning
// document.body for leftover text.
const expectExpanded = (
  canvas: ReturnType<typeof within>,
  name: string,
  expanded: boolean,
) =>
  waitFor(() => {
    expect(
      canvas.getByRole('button', { name }).getAttribute('aria-expanded'),
      `${name} aria-expanded`,
    ).toBe(String(expanded))
  })

// The interactive backdrop is the last one whose computed pointer-events are
// enabled; overlays that are entering or exiting a transition report `none`.
const activeBackdrop = (): HTMLElement | undefined => {
  const backdrops = Array.from(
    document.querySelectorAll<HTMLElement>(`.${Classes.OVERLAY_BACKDROP}`),
  ).filter((element) => getComputedStyle(element).pointerEvents !== 'none')
  return backdrops[backdrops.length - 1]
}

// Dismiss the topmost popover with a real backdrop click, then wait for the
// overlay transition to finish (the backdrop node is removed) before asserting.
const dismissPopover = async (
  canvas: ReturnType<typeof within>,
  name: string,
) => {
  let backdrop: HTMLElement | undefined
  await waitFor(() => {
    backdrop = activeBackdrop()
    expect(backdrop, `${name} active backdrop`).toBeTruthy()
  })
  const target = backdrop!
  await userEvent.click(target)
  await waitFor(() => {
    expect(target.isConnected, `${name} backdrop removed`).toBe(false)
  })
  await expectExpanded(canvas, name, false)
}

export const SidebarPanelsOpenAndClose: Story = {
  name: 'Sidebar panels and the planner open and close',
  parameters: { shipInfo: { state: plannerScenarioState() } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    const columns = canvas.getByRole('button', { name: 'Columns' })
    await userEvent.click(columns)
    await expectExpanded(canvas, 'Columns', true)
    await expect(await screen.findByText('Column Configuration')).toBeTruthy()
    await dismissPopover(canvas, 'Columns')

    const filter = canvas.getByRole('button', { name: 'Filter' })
    await userEvent.click(filter)
    await expectExpanded(canvas, 'Filter', true)
    await expect(await screen.findByText('Ship types')).toBeTruthy()
    await dismissPopover(canvas, 'Filter')

    const exportButton = canvas.getByRole('button', { name: 'Export' })
    await userEvent.click(exportButton)
    await expectExpanded(canvas, 'Export', true)
    await expect(
      await screen.findByRole('button', { name: 'Copy to clipboard' }),
    ).toBeTruthy()
    await dismissPopover(canvas, 'Export')

    await userEvent.click(canvas.getByRole('button', { name: 'Deck Planner' }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
    await waitFor(async () => {
      await expect(screen.queryByRole('dialog')).toBeNull()
    })
  },
}

// Default level-sorted order of the fixture roster (levels 150, 100, 90, 80,
// 50, 30, 20, 10). Exported rows follow the table's filtered/sorted order, and
// the first CSV column is the ship id.
const EXPECTED_SORTED_IDS = ['3', '4', '7', '6', '1', '8', '2', '5']

export const FilterAffectsTableAndExport: Story = {
  name: 'A filter changes both the table and the exported clipboard CSV',
  parameters: { shipInfo: { state: plannerScenarioState() } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByText('Alpha')).toBeTruthy()
    await waitFor(async () => {
      await expect(canvas.queryAllByRole('gridcell').length).toBeGreaterThan(0)
    })

    // Turn every ship type off, which removes every data cell from the table.
    // Scope to the "Ship types" section: the sally-area section also has "All".
    const filter = canvas.getByRole('button', { name: 'Filter' })
    await userEvent.click(filter)
    const shipTypes = (await screen.findByText('Ship types')).parentElement as HTMLElement
    const allTypes = within(shipTypes).getByRole('checkbox', { name: 'All' })
    await userEvent.click(allTypes.closest('label') as HTMLElement)
    await waitFor(async () => {
      await expect(canvas.queryAllByRole('gridcell').length).toBe(0)
    })
    await dismissPopover(canvas, 'Filter')

    // Exporting the current (empty) list yields the header row only.
    await userEvent.click(canvas.getByRole('button', { name: 'Export' }))
    await userEvent.click(
      await screen.findByRole('button', { name: 'Copy to clipboard' }),
    )
    await expect(host.log.clipboardWrites.length).toBe(1)
    const emptyCsv = host.log.clipboardWrites[0]
    await expect(emptyCsv.split('\n')).toHaveLength(1)
    await userEvent.keyboard('{Escape}')

    // Restore every ship type; the table and the next export follow exactly.
    await userEvent.click(filter)
    const shipTypesAgain = (await screen.findByText('Ship types'))
      .parentElement as HTMLElement
    const allTypesAgain = within(shipTypesAgain).getByRole('checkbox', {
      name: 'All',
    })
    await userEvent.click(allTypesAgain.closest('label') as HTMLElement)
    await waitFor(async () => {
      await expect(canvas.queryAllByRole('gridcell').length).toBeGreaterThan(0)
    })
    await expect(canvas.getByText('Alpha')).toBeTruthy()
    await dismissPopover(canvas, 'Filter')

    await userEvent.click(canvas.getByRole('button', { name: 'Export' }))
    await userEvent.click(
      await screen.findByRole('button', { name: 'Copy to clipboard' }),
    )
    await waitFor(async () => {
      await expect(host.log.clipboardWrites.length).toBe(2)
    })
    const fullCsv = host.log.clipboardWrites[1]
    const lines = fullCsv.split('\n')
    await expect(lines[0]).toBe(emptyCsv)
    await expect(lines.slice(1).map((line) => line.split(',')[0])).toEqual(
      EXPECTED_SORTED_IDS,
    )
  },
}

export const ColumnVisibilityAffectsTable: Story = {
  name: 'Hiding a column removes it from the table',
  parameters: { shipInfo: { state: plannerScenarioState() } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByText('Alpha')).toBeTruthy()

    const columns = canvas.getByRole('button', { name: 'Columns' })
    await userEvent.click(columns)
    const region = (await screen.findByText('Column Configuration')).closest(
      POPOVER,
    ) as HTMLElement
    const nameCard = within(region).getByText('Name').closest(CARD) as HTMLElement
    await userEvent.click(
      within(nameCard).getByRole('checkbox', { name: 'Visible' }),
    )

    await waitFor(async () => {
      await expect(canvas.queryByText('Alpha')).toBeNull()
    })

    // The configuration card stays so the column can be restored.
    await expect(within(nameCard).getByText('Name')).toBeTruthy()
    await dismissPopover(canvas, 'Columns')
  },
}

export const ResetRemountsFreshRoot: Story = {
  name: 'Reset remounts the real root: config, clipboard and file state do not leak',
  parameters: { shipInfo: { state: plannerScenarioState() } },
  render: () => <ResetHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const environment = getEnvironment()
    await expect(await canvas.findByText('Alpha')).toBeTruthy()
    await expect(canvas.getByText('Name')).toBeTruthy()

    // Real workflow mutations: hide the Name column and write to the clipboard.
    const columns = canvas.getByRole('button', { name: 'Columns' })
    await userEvent.click(columns)
    const region = (await screen.findByText('Column Configuration')).closest(
      POPOVER,
    ) as HTMLElement
    const nameCard = within(region).getByText('Name').closest(CARD) as HTMLElement
    await userEvent.click(
      within(nameCard).getByRole('checkbox', { name: 'Visible' }),
    )
    await dismissPopover(canvas, 'Columns')

    // Export to a real (in-memory) file so file/log state is actually written.
    setSaveDialogResult({ canceled: false, filePath: '/tmp/ship-info-export.csv' })
    await userEvent.click(canvas.getByRole('button', { name: 'Export' }))
    await userEvent.click(
      await screen.findByRole('button', { name: 'Copy to clipboard' }),
    )
    await userEvent.click(
      await screen.findByRole('button', { name: 'Export to file' }),
    )

    // The old rendered root really mutated config, clipboard and files.
    await waitFor(async () => {
      await expect(canvas.queryByText('Alpha')).toBeNull()
    })
    await waitFor(async () => {
      await expect(host.log.writtenFiles.length).toBe(1)
    })
    await expect(host.log.writtenFiles[0].path).toBe('/tmp/ship-info-export.csv')
    await expect(environment.configCalls.length).toBeGreaterThan(0)
    await expect(host.log.clipboardWrites.length).toBe(1)
    await expect(host.log.saveDialogCalls.length).toBe(1)

    // Close the export overlay so the reset control is genuinely reachable.
    await dismissPopover(canvas, 'Export')

    // Remount through the test-only wrapper: this is the real plugin root on a
    // fresh environment, not just a new scenario object.
    await userEvent.click(screen.getByTestId('reset-ship-info'))

    await waitFor(async () => {
      await expect(canvas.getByText('Alpha')).toBeTruthy()
    })
    await expect(canvas.getByText('Name')).toBeTruthy()
    await waitFor(async () => {
      await expect(canvas.queryAllByRole('gridcell').length).toBeGreaterThan(0)
    })
    await expect(getEnvironment().configCalls).toEqual([])
    await expect(host.log.clipboardWrites).toEqual([])
    await expect(host.log.downloads).toEqual([])
    await expect(host.log.saveDialogCalls).toEqual([])
    await expect(host.log.writtenFiles).toEqual([])
    await expect(host.log.files).toEqual({})
  },
}
