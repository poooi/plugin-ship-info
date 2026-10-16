import { Classes } from '@blueprintjs/core'
import type { Meta, StoryContext, StoryObj } from '@storybook/react-vite'
import React from 'react'
import { expect, screen, userEvent, waitFor, within } from 'storybook/test'

import { host, setSaveDialogResult } from '../preview/adapters/logs'
import { useScenarioReset, withShipInfo } from '../preview/decorators'
import { i18n } from '../preview/i18n'
import {
  persistedPluginFile,
  plannerScenarioState,
  plannerSlice,
} from '../preview/planner-fixtures'
import { getEnvironment } from '../preview/scenario'
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

// Test-only control surface for the reset flow. The owning `withShipInfo`
// decorator holds the environment and the reset callback, so the button remounts
// the real root on a fresh environment without shadowing the toolbar globals.
const ResetHarness: React.FC = () => {
  const reset = useScenarioReset()

  return (
    <>
      <button data-testid="reset-ship-info" onClick={reset} type="button">
        Reset scenario
      </button>
      <div style={{ display: 'flex', height: 680, width: 1200 }}>
        <ShipInfo />
      </div>
    </>
  )
}

// Portable Vitest stories have no manager channel to switch toolbar globals at
// runtime, so this harness rerenders the real owning decorator with controllable
// globals. Theme/locale therefore travel the same resolution path the toolbar
// uses, and changing them after the first render rebuilds the environment.
const SettingsHarness: React.FC<{ context: StoryContext }> = ({ context }) => {
  const [globals, setGlobals] = React.useState({
    locale: 'en-US',
    theme: 'dark',
  })

  return (
    <>
      <button
        data-testid="switch-toolbar-settings"
        onClick={() => setGlobals({ locale: 'ja-JP', theme: 'light' })}
        type="button"
      >
        Switch settings
      </button>
      {withShipInfo(() => <ResetHarness />, { ...context, globals })}
    </>
  )
}

// The innermost decorated surface: the harness renders a second decorator pass
// on top of the project decorator, so the last surface reflects its globals.
const decoratedSurface = () => {
  const surfaces = document.querySelectorAll<HTMLElement>(
    '[data-ship-info-scenario]',
  )
  return surfaces[surfaces.length - 1]
}

const meta = {
  title: 'Integrated/PluginShell',
  component: Shell,
  parameters: {
    shipInfo: {
      // The shell is 1200x680; size the themed scenario surface so the whole
      // root sits inside it instead of overflowing onto the white preview.
      dimensions: { width: 1400, height: 760 },
      state: plannerScenarioState(),
    },
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

    // The rendered root must stay inside the themed scenario surface, otherwise
    // it overflows onto the unthemed preview background.
    const surface = document.querySelector(
      '[data-ship-info-scenario]',
    ) as HTMLElement
    const root = surface.querySelector('#poi-plugin-ship-info') as HTMLElement
    const surfaceRect = surface.getBoundingClientRect()
    const rootRect = root.getBoundingClientRect()
    await expect(rootRect.width).toBeGreaterThan(0)
    await expect(rootRect.height).toBeGreaterThan(0)
    await expect(rootRect.left).toBeGreaterThanOrEqual(surfaceRect.left)
    await expect(rootRect.top).toBeGreaterThanOrEqual(surfaceRect.top)
    await expect(rootRect.right).toBeLessThanOrEqual(surfaceRect.right)
    await expect(rootRect.bottom).toBeLessThanOrEqual(surfaceRect.bottom)
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

const DARK_SURFACE = 'rgb(28, 33, 39)'
const LIGHT_SURFACE = 'rgb(246, 247, 249)'

export const ToolbarSettingsSurviveReset: Story = {
  name: 'Resolved theme/locale drive the reset preview',
  parameters: { shipInfo: { state: plannerScenarioState() } },
  render: (_args, context) => <SettingsHarness context={context} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const ja = i18n.getFixedT('ja-JP', 'poi-plugin-ship-info')
    const jaName = ja('Name') as string

    await expect(await canvas.findByText('Alpha')).toBeTruthy()

    // The preview starts from dark / en-US.
    await expect(getComputedStyle(decoratedSurface()).backgroundColor).toBe(
      DARK_SURFACE,
    )
    await expect(canvas.getByText('Name')).toBeTruthy()

    // Change theme/locale after the first render. The decorator must resolve
    // the new settings and recreate the environment behind the rendered root.
    await userEvent.click(screen.getByTestId('switch-toolbar-settings'))
    await waitFor(async () => {
      await expect(getComputedStyle(decoratedSurface()).backgroundColor).toBe(
        LIGHT_SURFACE,
      )
    })
    await waitFor(async () => {
      await expect(canvas.queryByText('Name')).toBeNull()
      await expect(canvas.getByText(jaName)).toBeTruthy()
    })

    // A real config mutation through the now-localized UI: hide the Name column.
    await userEvent.click(canvas.getByRole('button', { name: 'Columns' }))
    const region = (await screen.findByText(ja('Column Configuration')))
      .closest(POPOVER) as HTMLElement
    const nameCard = within(region).getByText(jaName).closest(CARD) as HTMLElement
    await userEvent.click(
      within(nameCard).getByRole('checkbox', { name: ja('Visible') as string }),
    )
    await dismissPopover(canvas, 'Columns')

    // The rendered table visibly dropped the column and the config write landed.
    await waitFor(async () => {
      await expect(canvas.queryByText(jaName)).toBeNull()
    })
    await expect(getEnvironment().configCalls.length).toBeGreaterThan(0)

    // Reset remounts on a fresh environment but keeps the resolved theme/locale,
    // and the fresh root starts from unmutated config again.
    await userEvent.click(screen.getByTestId('reset-ship-info'))

    await waitFor(async () => {
      await expect(canvas.getByText(jaName)).toBeTruthy()
    })
    await expect(canvas.getByText('Alpha')).toBeTruthy()
    await expect(getComputedStyle(decoratedSurface()).backgroundColor).toBe(
      LIGHT_SURFACE,
    )
    await expect(canvas.queryByText('Name')).toBeNull()
    await expect(getEnvironment().configCalls).toEqual([])
    await expect(host.log.clipboardWrites).toEqual([])
    await expect(host.log.writtenFiles).toEqual([])
    await expect(host.log.files).toEqual({})
  },
}
