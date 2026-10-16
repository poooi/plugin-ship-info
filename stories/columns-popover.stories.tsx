import { Classes } from '@blueprintjs/core'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, screen, userEvent, waitFor, within } from 'storybook/test'

import { tableState } from '../tests/ui/fixtures'
import { Columns } from '../views/sidebar/columns'

const meta = {
  title: 'Sidebar/Columns/Columns',
  component: Columns,
  parameters: {
    shipInfo: { state: tableState() },
  },
} satisfies Meta<typeof Columns>

export default meta
type Story = StoryObj<typeof meta>

export const OpensScrollsAndDismisses: Story = {
  name: 'Real popover opens, scrolls and dismisses',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const trigger = canvas.getByRole('button', { name: 'Columns' })

    await userEvent.click(trigger)

    // The popover content renders in a Blueprint portal outside the canvas.
    await screen.findByText('Column Configuration')

    const content = document.querySelector(
      `.${Classes.POPOVER_CONTENT}`,
    ) as HTMLElement | null
    await expect(content).toBeTruthy()
    if (!content) throw new Error('popover content not found')

    // A real scroll assertion: find the overflowing list and scroll it.
    const list = Array.from(content.querySelectorAll<HTMLElement>('*')).find(
      (element) =>
        getComputedStyle(element).overflowY === 'auto' &&
        element.scrollHeight > element.clientHeight,
    )
    await expect(list).toBeTruthy()
    if (!list) throw new Error('no overflowing list in the popover')

    list.scrollTop = list.scrollHeight
    await expect(list.scrollTop).toBeGreaterThan(0)

    const visible = within(content).getAllByRole('checkbox', {
      name: 'Visible',
    })
    await expect(visible.length).toBeGreaterThan(1)

    // Escape closes the popover via the real Blueprint overlay handling.
    await userEvent.keyboard('{Escape}')
    await waitFor(async () => {
      await expect(screen.queryByText('Column Configuration')).toBeNull()
    })
  },
}
