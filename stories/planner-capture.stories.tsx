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
import { Planner } from '../views/sidebar/planner'

const params = (isMain: boolean, options?: PlannerScenarioOptions) => ({
  shipInfo: { isMain, state: plannerScenarioState(options) },
})

const openPlanner = async () => {
  await userEvent.click(screen.getByRole('button', { name: 'Deck Planner' }))
  return screen.findByRole('dialog')
}

const openGrid = async () => {
  const dialog = await openPlanner()
  await userEvent.click(within(dialog).getByRole('tab', { name: 'Ship Grid' }))
  await within(dialog).findByRole('heading', { level: 2, name: 'DD' })
  return dialog
}

const capture = async () => {
  await userEvent.click(screen.getByRole('button', { name: 'Save to image' }))
  await waitFor(async () => {
    await expect(getCaptureRequests().length).toBe(1)
  })
  return getCaptureRequests()[0]
}

const meta = {
  title: 'Sidebar/Planner/Capture',
  component: Planner,
  // The capture adapter state is module-level, so reset it before every story
  // to keep success/failure outcomes from leaking between runs.
  beforeEach: () => {
    resetCapture()
  },
} satisfies Meta<typeof Planner>

export default meta
type Story = StoryObj<typeof meta>

export const MainWindowHidesCapture: Story = {
  name: 'Main window does not offer image capture',
  parameters: params(true),
  play: async () => {
    await openPlanner()
    await expect(screen.queryByRole('button', { name: 'Save to image' })).toBeNull()
  },
}

export const DetachedWindowShowsCapture: Story = {
  name: 'Detached window offers image capture',
  parameters: params(false),
  play: async () => {
    await openPlanner()
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
