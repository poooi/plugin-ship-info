import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  expect,
  screen,
  spyOn,
  userEvent,
  waitFor,
  within,
} from 'storybook/test'

import { host } from '../preview/adapters/logs'
import type { PlannerScenarioOptions } from '../preview/planner-fixtures'
import {
  getCaptureRequests,
  plannerScenarioState,
  resetCapture,
  setCaptureOutcome,
} from '../preview/planner-fixtures'
import { reactClass as NavyStaff } from '../packages/navy-staff/src/views'

const params = (isMain: boolean, options?: PlannerScenarioOptions) => ({
  shipInfo: {
    isMain,
    plugin: 'navy-staff' as const,
    state: plannerScenarioState(options),
  },
})

const openPlanner = async () => {
  const view = await screen.findByRole('tab', { name: 'Area View' })
  return view.closest('#poi-plugin-navy-staff') as HTMLElement
}

const openGrid = async () => {
  const container = await openPlanner()
  await userEvent.click(
    within(container).getByRole('tab', { name: 'Grid Palette' }),
  )
  await within(container).findByRole('heading', { level: 2, name: 'DD' })
  return container
}

const openShare = () => userEvent.click(screen.getByRole('tab', { name: 'Share' }))

const capture = async () => {
  await openShare()
  await userEvent.click(screen.getByRole('button', { name: 'Save to image' }))
  await waitFor(async () => {
    await expect(getCaptureRequests().length).toBe(1)
  })
  return getCaptureRequests()[0]
}

const meta = {
  title: 'NavyStaff/Capture',
  component: NavyStaff,
  // The capture adapter state is module-level, so reset it before every story
  // to keep success/failure outcomes from leaking between runs.
  beforeEach: () => {
    resetCapture()
  },
} satisfies Meta<typeof NavyStaff>

export default meta
type Story = StoryObj<typeof meta>

export const MainWindowHidesCapture: Story = {
  name: 'Main window explains why image capture requires a detached window',
  parameters: params(true),
  play: async () => {
    await openPlanner()
    await openShare()
    await expect(screen.getByRole('button', { name: 'Save to image' })).toBeDisabled()
    await expect(screen.getByText('Image capture is only available in the detached window.')).toBeTruthy()
  },
}

export const DetachedWindowShowsCapture: Story = {
  name: 'Detached window offers image capture',
  parameters: params(false),
  play: async () => {
    await openPlanner()
    await openShare()
    await expect(
      await screen.findByRole('button', { name: 'Save to image' }),
    ).toBeTruthy()
  },
}

export const AreaCaptureSuccessDownloadsImage: Story = {
  name: 'Area capture uses the area element and real dimensions, then downloads',
  parameters: params(false),
  play: async () => {
    await openPlanner()
    const request = await capture()

    // The intended element is the area container rendered inside the dialog.
    await expect(request.element.textContent).toContain('E1')
    await expect(request.element.textContent).not.toContain('Save to image')
    await expect(request.options).toMatchObject({
      allowTaint: true,
      backgroundColor: '#333',
    })
    // Options are sized from the element's real rect; lodash `ceil(value, 16)`
    // is decimal precision (effectively the raw size), so compare to the bounds
    // the adapter recorded at capture time.
    await expect(request.options.width).toBeCloseTo(request.rect.width, 3)
    await expect(request.options.height).toBeCloseTo(request.rect.height, 3)

    await waitFor(async () => {
      await expect(host.log.downloads.length).toBe(1)
    })
    await expect(host.log.downloads[0]).toContain('data:image/png')
  },
}

export const GridCaptureUsesGridElement: Story = {
  name: 'Ship Grid capture targets the grid cells, not the toolbar or palette',
  parameters: params(false),
  play: async () => {
    await openGrid()
    const request = await capture()

    // The captured element is the ship grid: it contains real cells but not the
    // toolbar, help callout, palette or dialog tabs that surround it.
    await expect(request.element.textContent).toContain('Zeta')
    await expect(request.element.textContent).not.toContain('Palette')
    await expect(request.element.textContent).not.toContain('Refresh')
    await expect(request.element.textContent).not.toContain('Ship Grid')

    await waitFor(async () => {
      await expect(host.log.downloads.length).toBe(1)
    })
  },
}

export const CaptureRejectionLogsAndDoesNotDownload: Story = {
  name: 'Rejected capture logs the error and does not download',
  parameters: params(false),
  play: async () => {
    setCaptureOutcome('failure')
    const errorSpy = spyOn(console, 'error').mockImplementation(() => undefined)
    try {
      await openPlanner()
      await openShare()
      await userEvent.click(screen.getByRole('button', { name: 'Save to image' }))

      // The catch path in captureRect logs the renderer failure.
      await waitFor(async () => {
        await expect(errorSpy).toHaveBeenCalled()
      })
      await waitFor(async () => {
        await expect(getCaptureRequests().length).toBe(1)
      })
      await expect(host.log.downloads.length).toBe(0)
    } finally {
      errorSpy.mockRestore()
    }
  },
}


export const HistoricalImageIgnoresEditorFilters: Story = {
  name: 'Historical images use captured ships and the inspected view, not editor filters',
  parameters: (() => {
    const parameters = params(false, { current: [[1], []], mapname: ['E1', 'E2'] })
    const state = parameters.shipInfo.state as any
    state['poi-plugin-navy-staff'].navy.workspaces[0].revisions[0].content.ships['1'] = {
      ownedId: 1, masterId: 1, name: 'Alpha', level: 5, typeId: 2, typeLabel: 'DD',
      observedAt: '2026-01-01T00:00:00.000Z',
    }
    return parameters
  })(),
  play: async () => {
    await openGrid()
    await userEvent.selectOptions(screen.getByLabelText('Assignment'), 'unassigned')
    expect(screen.queryByRole('button', { name: 'Alpha Lv.50' })).toBeNull()
    // Leave the editor in List while choosing Grid in the historical task.
    await userEvent.click(screen.getByRole('tab', { name: 'Ship List' }))
    await userEvent.click(screen.getByRole('button', { name: 'History' }))
    await userEvent.click(screen.getByRole('tab', { name: 'Grid Palette' }))
    await userEvent.click(screen.getByRole('button', { name: 'Share this state' }))
    const request = await capture()
    expect(request.element.textContent).toContain('Alpha')
    expect(request.element.textContent).toContain('Lv.5')
    expect(request.element.textContent).not.toContain('Beta')
    expect(request.element.querySelector('[data-testid="ship-list"]')).toBeNull()
    expect(request.element.querySelectorAll('[role="group"]')).toHaveLength(1)
  },
}
