import { Classes } from '@blueprintjs/core'
import type { Meta, StoryObj } from '@storybook/react-vite'
import React from 'react'
import { expect, screen, userEvent, waitFor, within } from 'storybook/test'

import { tableState } from '../preview/table-fixtures'
import { TableView } from '../views/table'
import {
  dataColumnIndex,
  renderedNames,
  rowFor,
  tableScroller,
} from './table-support'

const Table: React.FC = () => <TableView />

const meta = {
  title: 'Table/Display',
  component: Table,
  parameters: { shipInfo: { state: tableState() } },
} satisfies Meta<typeof Table>

export default meta
type Story = StoryObj<typeof meta>

const cellAt = (root: HTMLElement, name: string, index: number): HTMLElement =>
  rowFor(root, name).querySelectorAll<HTMLElement>('[role="gridcell"]')[index]

export const EquipmentAndTooltips: Story = {
  name: 'Equipment normal/extra slot, upgrade and proficiency tooltips',
  play: async ({ canvasElement }) => {
    await waitFor(async () => {
      await expect(renderedNames(canvasElement).length).toBe(8)
    })

    const equipmentCell = cellAt(
      canvasElement,
      'Alpha',
      dataColumnIndex.equipment,
    )
    const icons = equipmentCell.querySelectorAll('[data-slotitem]')
    await expect(icons.length).toBe(2)

    // Normal slot: upgraded (★+2) and proficient (alv image).
    await userEvent.hover(icons[0] as HTMLElement)
    await screen.findByText('12cm Single Gun')
    await screen.findByText('★+2')
    await waitFor(async () => {
      await expect(
        document.querySelector('img[alt="alv"]'),
      ).toBeTruthy()
    })

    // Extra slot: rendered with the "+" indicator.
    await expect(equipmentCell.textContent).toContain('+')
    await userEvent.hover(icons[1] as HTMLElement)
    await screen.findByText('Type 22 Radar')
  },
}

export const StatusTagsAndRepair: Story = {
  name: 'Fleet icon, sally tag and repair status',
  play: async ({ canvasElement }) => {
    await waitFor(async () => {
      await expect(renderedNames(canvasElement).length).toBe(8)
    })

    // Alpha is in fleet 0: a fleet icon renders next to the name.
    const alphaName = cellAt(canvasElement, 'Alpha', 1)
    await expect(alphaName.querySelector('svg')).toBeTruthy()

    // Delta is tagged to sally area E2 (mapname index 1).
    const deltaTag = cellAt(canvasElement, 'Delta', 1).querySelector(
      `.${Classes.TAG}`,
    ) as HTMLElement
    await expect(deltaTag).toBeTruthy()
    await userEvent.hover(deltaTag)
    await screen.findByText('Ship tag: E2')

    // Epsilon is in repair (bath icon + duration).
    const epsilonRepair = cellAt(
      canvasElement,
      'Epsilon',
      dataColumnIndex.repairtime,
    )
    await expect(epsilonRepair.textContent).toContain('30')
    await expect(epsilonRepair.querySelector('svg')).toBeTruthy()

    // Gamma has a repair time but is not in dock: no icon.
    const gammaRepair = cellAt(
      canvasElement,
      'Gamma',
      dataColumnIndex.repairtime,
    )
    await expect(gammaRepair.textContent).toContain('65')
    await expect(gammaRepair.querySelector('svg')).toBeNull()
  },
}

export const AvatarEnabled: Story = {
  name: 'Avatar column enabled',
  parameters: {
    shipInfo: {
      state: tableState({
        config: {
          plugin: { ShipInfo: {} },
          poi: { appearance: { avatar: true } },
        },
      }),
    },
  },
  play: async ({ canvasElement }) => {
    await waitFor(async () => {
      await expect(
        canvasElement.querySelectorAll('[data-avatar]').length,
      ).toBe(8)
    })
  },
}

export const AvatarDisabled: Story = {
  name: 'Avatar column disabled',
  play: async ({ canvasElement }) => {
    await waitFor(async () => {
      await expect(renderedNames(canvasElement).length).toBe(8)
    })
    await expect(canvasElement.querySelectorAll('[data-avatar]').length).toBe(0)
  },
}

export const DarkTheme: Story = {
  name: 'Dark theme applies the Blueprint dark class',
  parameters: { shipInfo: { theme: 'dark' } },
  play: async ({ canvasElement }) => {
    await waitFor(async () => {
      await expect(document.body.classList.contains(Classes.DARK)).toBe(true)
    })
    await expect(renderedNames(canvasElement).length).toBe(8)
  },
}

export const LightTheme: Story = {
  name: 'Light theme removes the Blueprint dark class',
  parameters: { shipInfo: { theme: 'light' } },
  play: async ({ canvasElement }) => {
    await waitFor(async () => {
      await expect(document.body.classList.contains(Classes.DARK)).toBe(false)
    })
    await expect(renderedNames(canvasElement).length).toBe(8)
  },
}

export const NarrowLayout: Story = {
  name: 'Narrow layout scrolls horizontally',
  parameters: {
    shipInfo: { dimensions: { height: 400, width: 420 } },
  },
  play: async ({ canvasElement }) => {
    await waitFor(async () => {
      const scroller = tableScroller(canvasElement)
      await expect(scroller.scrollWidth).toBeGreaterThan(scroller.clientWidth)
    })
  },
}

export const WideLayout: Story = {
  name: 'Wide layout fits the columns',
  parameters: {
    shipInfo: { dimensions: { height: 800, width: 1400 } },
  },
  play: async ({ canvasElement }) => {
    await waitFor(async () => {
      const scroller = tableScroller(canvasElement)
      await expect(scroller.scrollWidth).toBeLessThanOrEqual(
        scroller.clientWidth + 1,
      )
    })
    await expect(renderedNames(canvasElement).length).toBe(8)
  },
}

export const TranslatedLocale: Story = {
  name: 'Translated locale renders localized copy',
  parameters: {
    shipInfo: { language: 'ja-JP' },
  },
  play: async ({ canvasElement }) => {
    await waitFor(async () => {
      await expect(renderedNames(canvasElement).length).toBe(8)
    })

    const deltaTag = within(rowFor(canvasElement, 'Delta'))
      .getByText('Delta')
      .closest('[role="gridcell"]')!
      .querySelector(`.${Classes.TAG}`) as HTMLElement
    await userEvent.hover(deltaTag)
    await screen.findByText('出擊限定: E2')
  },
}
