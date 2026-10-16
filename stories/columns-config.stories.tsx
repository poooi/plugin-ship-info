import { Classes } from '@blueprintjs/core'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'

import { tableState } from '../tests/ui/fixtures'
import { getEnvironment } from '../preview/scenario'
import { ColumnConfig } from '../packages/ship-info/src/views/sidebar/columns/column-config'

// Mirrors the plugin's default order in views/selectors.ts + column-config.tsx.
const DEFAULT_ORDER = [
  'rowIndex',
  'id',
  'name',
  'type',
  'soku',
  'lv',
  'cond',
  'hp',
  'karyoku',
  'raisou',
  'taiku',
  'soukou',
  'lucky',
  'kaihi',
  'taisen',
  'sakuteki',
  'repairtime',
  'equipment',
  'lock',
]

const CARD = `.${Classes.CARD}`
const CONTROL = `.${Classes.CONTROL}`
const INDICATOR = `.${Classes.CONTROL_INDICATOR}`

const cardFor = (root: HTMLElement, title: string): HTMLElement =>
  within(root).getByText(title).closest(CARD) as HTMLElement

const checkboxFor = (
  card: HTMLElement,
  name: 'Visible' | 'Pin',
): HTMLInputElement =>
  within(card).getByRole('checkbox', { name }) as HTMLInputElement

const meta = {
  title: 'Sidebar/Columns/ColumnConfig',
  component: ColumnConfig,
  parameters: {
    shipInfo: { state: tableState() },
  },
} satisfies Meta<typeof ColumnConfig>

export default meta
type Story = StoryObj<typeof meta>

export const DefaultVisibilityTogglesOff: Story = {
  name: 'Default visibility toggles off on the first click',
  play: async ({ canvasElement }) => {
    const environment = getEnvironment()
    const card = cardFor(canvasElement, 'ID')
    const visible = checkboxFor(card, 'Visible')

    await expect(visible.checked).toBe(true)
    await userEvent.click(visible)

    await expect(visible.checked).toBe(false)
    await expect(environment.configCalls).toContainEqual([
      'plugin.ShipInfo.columnVisibility',
      { id: false },
    ])
    await expect(
      environment.store.getState().config.plugin.ShipInfo.columnVisibility,
    ).toEqual({ id: false })
    await expect(getComputedStyle(card).opacity).toBe('0.5')

    // Toggling back restores the explicit visible value.
    await userEvent.click(visible)
    await expect(visible.checked).toBe(true)
    await expect(getComputedStyle(card).opacity).toBe('1')
  },
}

export const ExplicitHiddenTogglesBackOn: Story = {
  name: 'Explicit hidden value toggles back on',
  parameters: {
    shipInfo: {
      state: tableState({
        config: { plugin: { ShipInfo: { columnVisibility: { id: false } } } },
      }),
    },
  },
  play: async ({ canvasElement }) => {
    const environment = getEnvironment()
    const card = cardFor(canvasElement, 'ID')
    const visible = checkboxFor(card, 'Visible')

    await expect(visible.checked).toBe(false)
    await expect(getComputedStyle(card).opacity).toBe('0.5')

    await userEvent.click(visible)

    await expect(visible.checked).toBe(true)
    await expect(environment.configCalls).toContainEqual([
      'plugin.ShipInfo.columnVisibility',
      { id: true },
    ])
  },
}

export const PinAndUnpin: Story = {
  name: 'Pin and unpin a column',
  play: async ({ canvasElement }) => {
    const environment = getEnvironment()
    const card = cardFor(canvasElement, 'Name')
    const pin = checkboxFor(card, 'Pin')

    await expect(pin.checked).toBe(false)
    await userEvent.click(pin)

    await expect(pin.checked).toBe(true)
    await expect(environment.configCalls).toContainEqual([
      'plugin.ShipInfo.columnPinning',
      { left: ['rowIndex', 'name'], right: [] },
    ])

    await userEvent.click(pin)
    await expect(pin.checked).toBe(false)
    await expect(environment.configCalls).toContainEqual([
      'plugin.ShipInfo.columnPinning',
      { left: ['rowIndex'], right: [] },
    ])
  },
}

export const ReorderAndBoundaries: Story = {
  name: 'Reorder up/down and boundary disabled controls',
  play: async ({ canvasElement }) => {
    const environment = getEnvironment()

    const nameCard = () =>
      cardFor(canvasElement, 'Name')
    const moveUp = () =>
      within(nameCard()).getByRole('button', { name: 'Move up' })
    const moveDown = () =>
      within(nameCard()).getByRole('button', { name: 'Move down' })

    await userEvent.click(moveUp())
    await expect(environment.configCalls).toContainEqual([
      'plugin.ShipInfo.columnOrder',
      ['rowIndex', 'name', 'id', 'type', 'soku', 'lv', 'cond', 'hp', 'karyoku', 'raisou', 'taiku', 'soukou', 'lucky', 'kaihi', 'taisen', 'sakuteki', 'repairtime', 'equipment', 'lock'],
    ])

    await userEvent.click(moveDown())
    await expect(environment.configCalls).toContainEqual([
      'plugin.ShipInfo.columnOrder',
      DEFAULT_ORDER,
    ])

    // The last configurable column cannot move further down.
    const lockCard = cardFor(canvasElement, 'Lock')
    const lockDown = within(lockCard).getByRole('button', {
      name: 'Move down',
    }) as HTMLButtonElement
    await expect(lockDown.disabled).toBe(true)

    // The first configurable column can still move up.
    const idUp = within(cardFor(canvasElement, 'ID')).getByRole('button', {
      name: 'Move up',
    }) as HTMLButtonElement
    await expect(idUp.disabled).toBe(false)
  },
}

export const ResetRestoresDefaults: Story = {
  name: 'Reset restores default order, visibility and pinning',
  parameters: {
    shipInfo: {
      state: tableState({
        config: {
          plugin: {
            ShipInfo: {
              columnOrder: ['rowIndex', 'name', 'id'],
              columnPinning: { left: ['rowIndex', 'name'], right: [] },
              columnVisibility: { id: false, name: false },
            },
          },
        },
      }),
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const environment = getEnvironment()

    await userEvent.click(canvas.getByRole('button', { name: 'Reset' }))

    await expect(environment.configCalls).toContainEqual([
      'plugin.ShipInfo.columnOrder',
      DEFAULT_ORDER,
    ])
    await expect(environment.configCalls).toContainEqual([
      'plugin.ShipInfo.columnVisibility',
      {},
    ])
    await expect(environment.configCalls).toContainEqual([
      'plugin.ShipInfo.columnPinning',
      { left: ['rowIndex'], right: [] },
    ])
  },
}

export const ComputedCheckboxCss: Story = {
  name: 'Real Blueprint checkbox control/indicator CSS aligns and zeroes margins',
  parameters: {
    shipInfo: {
      state: tableState({
        config: { plugin: { ShipInfo: { columnVisibility: { id: false } } } },
      }),
    },
  },
  play: async ({ canvasElement }) => {
    const cards = Array.from(canvasElement.querySelectorAll<HTMLElement>(CARD))
    await expect(cards.length).toBeGreaterThan(1)

    for (const card of cards) {
      const controls = Array.from(
        card.querySelectorAll<HTMLElement>(CONTROL),
      )
      await expect(controls.length).toBe(2)

      for (const control of controls) {
        const style = getComputedStyle(control)
        await expect(style.display).toBe('flex')
        await expect(style.alignItems).toBe('center')
        await expect(style.marginBottom).toBe('0px')
      }

      const indicators = Array.from(
        card.querySelectorAll<HTMLElement>(INDICATOR),
      )
      await expect(indicators.length).toBe(2)
      for (const indicator of indicators) {
        const style = getComputedStyle(indicator)
        await expect(style.marginTop).toBe('0px')
        await expect(style.marginBottom).toBe('0px')
      }
    }

    // A hidden column dims its whole card.
    const idCard = cardFor(canvasElement, 'ID')
    await expect(getComputedStyle(idCard).opacity).toBe('0.5')
  },
}
