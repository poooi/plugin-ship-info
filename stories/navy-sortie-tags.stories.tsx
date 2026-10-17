import type { Meta, StoryObj } from '@storybook/react-vite'
import React from 'react'
import { expect, screen, userEvent, waitFor, within } from 'storybook/test'

import { reactClass as NavyStaff } from '../packages/navy-staff/src/views'
import { densePlannerState, plannerOwnedShips, plannerScenarioState } from '../preview/planner-fixtures'
import { getEnvironment } from '../preview/scenario'

const Shell = () => <div style={{ display: 'flex', width: '100%', height: '100%' }}><NavyStaff /></div>
const stateWithTag = (tag = 1) => plannerScenarioState({
  current: [[], [1, 2]],
  mapname: ['E1', 'E2'],
  ships: { ...plannerOwnedShips, 1: { ...plannerOwnedShips[1], api_sally_area: tag } },
})
const meta = {
  title: 'NavyStaff/ActualTags',
  component: Shell,
  parameters: { shipInfo: { lifecycle: false, plugin: 'navy-staff', dimensions: { width: 720, height: 760 } } },
} satisfies Meta<typeof Shell>
export default meta
type Story = StoryObj<typeof meta>

const views = ['Area View', 'Ship List', 'Grid Palette']
const selectView = (name: string) => userEvent.click(screen.getByRole('button', { name }))
const actualTag = (label: string) => screen.getByLabelText(`Actual sortie tag: ${label}`)

export const ActualAndPlannedAreIndependent: Story = {
  parameters: { shipInfo: { state: stateWithTag() } },
  play: async () => {
    const store = getEnvironment().store
    const navy = () => store.getState()['poi-plugin-navy-staff'].navy
    const assignments = () => {
      const workspace = navy().workspaces[0]
      return workspace.revisions[workspace.cursor].content.assignments
    }
    await screen.findByRole('button', { name: 'Plan' })
    const before = JSON.stringify(navy())
    for (const view of views) {
      await selectView(view)
      expect(actualTag('E1')).toBeVisible()
      expect(actualTag('E1').textContent).toContain('Actual: E1')
      expect(assignments()['area-2']).toContain(1)
      expect(screen.getAllByTestId('actual-sortie-tag')).toHaveLength(1)
      if (view === 'Grid Palette') {
        const card = screen.getByRole('button', { name: 'Alpha Lv.50' })
        expect(within(card).getByText('E2')).toBeTruthy()
        expect(card).toHaveAccessibleDescription(/E2.*Actual: E1/)
      }
    }
    expect(JSON.stringify(navy())).toBe(before)

    await selectView('Ship List')
    const list = within(screen.getByTestId('ship-list'))
    await userEvent.click(list.getByRole('checkbox', { name: /Alpha/ }))
    await userEvent.selectOptions(list.getByLabelText('Assign to'), 'area-1')
    await userEvent.click(list.getByRole('button', { name: 'Apply to selected' }))
    expect(assignments()['area-1']).toContain(1)
    expect(store.getState().info.ships[1].api_sally_area).toBe(1)
    expect(actualTag('E1')).toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(assignments()['area-2']).toContain(1)
    expect(actualTag('E1')).toBeVisible()

    // The game tags Beta after a sortie; rendering must not reconcile the plan.
    const planBeforeSortie = JSON.stringify(navy())
    const info = store.getState().info
    store.dispatch({ type: 'TEST/REPLACE', state: { info: {
      ...info, ships: { ...info.ships, 2: { ...info.ships[2], api_sally_area: 2 } },
    } } })
    for (const view of views) {
      await selectView(view)
      await waitFor(() => expect(actualTag('E2')).toBeVisible())
      expect(actualTag('E1')).toBeVisible()
    }
    expect(JSON.stringify(navy())).toBe(planBeforeSortie)

    await userEvent.click(screen.getByRole('button', { name: 'History' }))
    for (const view of views) {
      await selectView(view)
      expect(screen.queryByTestId('actual-sortie-tag')).toBeNull()
    }
    await userEvent.click(screen.getByRole('button', { name: 'Return to current plan' }))
    await userEvent.click(within(screen.getByRole('navigation')).getByRole('button', { name: 'Share' }))
    await userEvent.click(screen.getByRole('button', { name: 'Start sharing' }))
    await userEvent.click(screen.getByRole('button', { name: 'Show image preview' }))
    const preview = within(screen.getByTestId('share-image-preview'))
    for (const view of ['Area View', 'Ship List', 'Ship Grid']) {
      await userEvent.click(preview.getByRole('button', { name: view }))
      expect(preview.queryByTestId('actual-sortie-tag')).toBeNull()
    }
  },
}

export const MissingTagMetadata: Story = {
  parameters: { shipInfo: { state: stateWithTag(99) } },
  play: async () => {
    await screen.findByRole('button', { name: 'Plan' })
    for (const view of views) {
      await selectView(view)
      expect(actualTag('Tag 99')).toBeVisible()
    }
  },
}

const denseTaggedState = () => {
  const state = densePlannerState()
  state.info = { ...state.info, ships: Object.fromEntries(
    Object.entries(state.info.ships).map(([id, ship]) => [id, {
      ...(ship as object), api_sally_area: Number(id) % 3 === 0 ? 0 : Number(id) % 10 + 1,
    }]),
  ) }
  state.fleets = [[1, 2, 3, 4, 5, 6], [7, 8, 9, 10, 11, 12], [], []]
  return state
}
const denseStory = (theme: 'dark' | 'light'): Story => ({
  parameters: { shipInfo: { state: denseTaggedState(), theme, dimensions: { width: 480, height: 760 } } },
  play: async () => {
    await screen.findByRole('button', { name: 'Plan' })
    const body = document.querySelector('.navy-staff-scrollable') as HTMLElement
    for (const view of views) {
      await selectView(view)
      const badges = screen.getAllByTestId('actual-sortie-tag')
      expect(badges.length).toBeGreaterThan(100)
      expect(body.scrollWidth).toBeLessThanOrEqual(body.clientWidth)
      for (const badge of badges) {
        const rect = badge.getBoundingClientRect()
        expect(rect.width).toBeGreaterThan(0)
        expect(rect.height).toBeGreaterThan(0)
        expect(rect.right).toBeLessThanOrEqual(body.getBoundingClientRect().right)
      }
    }
  },
})
export const DenseTagsDark = denseStory('dark')
export const DenseTagsLight = denseStory('light')

const portraitState = denseTaggedState()
portraitState.config.poi.appearance.avatar = true
portraitState.config.plugin.NavyStaff = { displayFleetName: true }
portraitState.fcd.shiptag.fleetname = {
  'en-US': Array.from({ length: 10 }, (_, index) => `Expeditionary Support Fleet ${index + 1}`),
}
export const TranslatedPortraitTags: Story = {
  parameters: { shipInfo: { state: portraitState, dimensions: { width: 480, height: 760 } } },
  play: async () => {
    await screen.findByRole('button', { name: 'Plan' })
    await selectView('Grid Palette')
    const badge = screen.getAllByTestId('actual-sortie-tag')[0]
    const card = badge.closest('[role="button"]') as HTMLElement
    expect(badge).toHaveAttribute('title', expect.stringContaining('Expeditionary Support Fleet'))
    const rect = badge.getBoundingClientRect()
    const bounds = card.getBoundingClientRect()
    expect(rect.bottom).toBeLessThanOrEqual(bounds.bottom)
    expect(rect.right).toBeLessThanOrEqual(bounds.right)
    // The full tooltip must be reachable despite the card's pointer-transparent text layer.
    const hovered = document.elementFromPoint(rect.left + 6, rect.top + rect.height / 2)
    expect(hovered && badge.contains(hovered)).toBe(true)
    await userEvent.selectOptions(screen.getByLabelText('Assign to'), 'area-2')
    const name = card.getAttribute('aria-label')!
    await userEvent.click(badge)
    expect(within(screen.getByRole('button', { name })).getByText('E2')).toBeVisible()
    expect(screen.getByRole('button', { name })).toHaveAccessibleDescription(/Actual: Expeditionary Support Fleet/)
  },
}
