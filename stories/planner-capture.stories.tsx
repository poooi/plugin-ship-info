import type { Meta, StoryObj } from '@storybook/react-vite'
import { remote } from 'electron'
import { expect, fireEvent, screen, userEvent, waitFor, within } from 'storybook/test'

import { host } from '../preview/adapters/logs'
import { densePlannerState, plannerScenarioState } from '../preview/planner-fixtures'
import { reactClass as NavyStaff } from '../packages/navy-staff/src/views'

// Real renderer and PNG pixel checks; only the OS download boundary is mocked.
const meta = { title: 'NavyStaff/Capture', component: NavyStaff } satisfies Meta<typeof NavyStaff>
export default meta
type Story = StoryObj<typeof meta>

const openShare = async () => {
  await userEvent.click(await screen.findByRole('button', { name: 'Share' }))
  await userEvent.click(screen.getByRole('button', { name: 'Generate share text' }))
  expect(screen.queryByTestId('share-image-preview')).toBeNull()
  await userEvent.click(screen.getByRole('button', { name: 'Show image preview' }))
  return screen.getByTestId('share-image-preview')
}

const saveImage = async (scope: HTMLElement) => {
  const count = host.log.downloads.length
  await userEvent.click(within(scope).getByRole('button', { name: 'Save to image' }))
  await waitFor(() => expect(host.log.downloads.length).toBe(count + 1), { timeout: 15000 })
  const image = new Image()
  image.src = host.log.downloads[count]
  await image.decode()
  expect(image.naturalWidth).toBeGreaterThan(0)
  return image
}

const captureStory = (mode: 'area' | 'list' | 'grid', isMain: boolean): Story => ({
  name: mode + ': 300 ships, modern CSS, full-height PNG and decoded-text equivalence',
  parameters: {
    shipInfo: {
      isMain, dimensions: { width: 720, height: 640 },
      theme: mode === 'list' ? 'light' : 'dark', plugin: 'navy-staff',
      state: densePlannerState({
        current: Array.from({ length: 10 }, (_, group) =>
          Array.from({ length: 30 }, (_, index) => group * 30 + index + 1)),
      }),
    },
  },
  play: async () => {
    const preview = await openShare()
    await userEvent.selectOptions(within(preview).getByRole('combobox', { name: 'View' }), mode)
    const target = within(preview).getByTestId('reference-capture')
    expect(within(target).getAllByTestId('reference-ship')).toHaveLength(300)
    expect(within(target).queryByRole('button')).toBeNull()
    const sharedContent = target.textContent
    // A pixel marker below the viewport proves modern CSS and full capture.
    const marker = document.createElement('div')
    marker.style.cssText = 'height:12px;width:100%;background:oklch(62.8% 0.2577 29.23);'
    target.append(marker)
    try {
      const bounds = target.getBoundingClientRect()
      const markerBounds = marker.getBoundingClientRect()
      expect(bounds.height).toBeGreaterThan(window.innerHeight)
      const image = await saveImage(preview)
      const scale = image.naturalWidth / bounds.width
      expect(Math.abs(image.naturalHeight - bounds.height * scale)).toBeLessThan(4)
      const canvas = document.createElement('canvas')
      canvas.width = image.naturalWidth
      canvas.height = image.naturalHeight
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(image, 0, 0)
      const pixel = ctx.getImageData(
        Math.floor((markerBounds.left - bounds.left + 5) * scale),
        Math.floor((markerBounds.top - bounds.top + 5) * scale), 1, 1,
      ).data
      expect(pixel[0]).toBeGreaterThan(230)
      expect(pixel[1]).toBeLessThan(30)
      expect(pixel[2]).toBeLessThan(30)
      expect(pixel[3]).toBe(255)
    } finally { marker.remove() }

    const text = (screen.getByTestId('share-text') as HTMLTextAreaElement).value
    await userEvent.click(within(screen.getByRole('navigation')).getByRole('button', { name: 'Reference' }))
    fireEvent.change(screen.getByPlaceholderText('Paste a share code or open a text file'), { target: { value: text } })
    await userEvent.click(screen.getByRole('button', { name: 'Open' }))
    const reference = await screen.findByTestId('reference-result')
    await userEvent.selectOptions(within(reference).getByRole('combobox', { name: 'View' }), mode)
    expect(within(reference).getByTestId('reference-capture').textContent).toBe(sharedContent)
    await saveImage(reference)
  },
})

export const AreaFullHeightImage = captureStory('area', true)
export const ListFullHeightImage = captureStory('list', false)
export const GridFullHeightImage = captureStory('grid', true)

export const ImageFailureCanRetry: Story = {
  name: 'Image failure is adjacent to Save and can be retried',
  parameters: { shipInfo: { plugin: 'navy-staff', state: plannerScenarioState({ current: [[1], []] }) } },
  play: async () => {
    const preview = await openShare()
    const original = remote.getCurrentWebContents
    const contents = original()
    const originalDownload = contents.downloadURL
    contents.downloadURL = () => { throw new Error('download failed') }
    remote.getCurrentWebContents = () => contents
    try {
      await userEvent.click(within(preview).getByRole('button', { name: 'Save to image' }))
      const error = await within(preview).findByTestId('image-error')
      expect(error.textContent).toContain('Could not save the image')
      expect(host.log.downloads).toHaveLength(0)
      expect(within(preview).getByRole('button', { name: 'Save to image' })).not.toBeDisabled()
    } finally {
      contents.downloadURL = originalDownload
      remote.getCurrentWebContents = original
    }
    await saveImage(preview)
    expect(within(preview).queryByTestId('image-error')).toBeNull()
  },
}

export const HistoricalImageIgnoresEditorFilters: Story = {
  name: 'Historical images share the captured level and ignore editor filters',
  parameters: {
    shipInfo: {
      plugin: 'navy-staff',
      state: (() => {
        const state = plannerScenarioState({ current: [[1], []] })
        state['poi-plugin-navy-staff'].navy.workspaces[0].revisions[0].content.ships['1'] = {
          ownedId: 1, masterId: 1, name: 'Alpha', level: 5, typeId: 2, typeLabel: 'DD',
          observedAt: '2026-01-01T00:00:00.000Z',
        }
        return state
      })(),
    },
  },
  play: async () => {
    await userEvent.selectOptions(await screen.findByRole('combobox', { name: 'View' }), 'list')
    await userEvent.selectOptions(screen.getByLabelText('Assignment'), 'unassigned')
    await userEvent.click(screen.getByRole('button', { name: 'History' }))
    await userEvent.click(screen.getByRole('button', { name: 'Share this state' }))
    const preview = await openShare()
    const target = within(preview).getByTestId('reference-capture')
    expect(within(target).getByText('Lv.5')).toBeTruthy()
    expect(within(target).queryByText('Lv.50')).toBeNull()
    expect(within(target).getAllByTestId('reference-ship')).toHaveLength(1)
    await saveImage(preview)
  },
}
