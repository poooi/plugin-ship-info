import { Classes } from '@blueprintjs/core'
import type { Meta, StoryObj } from '@storybook/react-vite'
import React from 'react'
import { expect, screen, userEvent, waitFor, within } from 'storybook/test'

import { tableState } from '../preview/table-fixtures'
import { TableView } from '../packages/ship-info/src/views/table'
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

const COND_COLUMN = 5

// Local overrides keep the shared roster untouched while pinning every morale
// and repair-severity boundary. HP widths are 100 so the ratios are exact.
const statusState = () => {
  const state = tableState()
  const ships = { ...state.info.ships }
  const configure = (
    id: number,
    cond: number,
    nowhp: number,
    repairSeconds: number,
  ) => {
    ships[id] = {
      ...ships[id],
      api_cond: cond,
      api_maxhp: 100,
      api_ndock_time: repairSeconds * 1000,
      api_nowhp: nowhp,
    }
  }

  configure(1, 49, 25, 25) // morale below sparkle, repair at 25%
  configure(2, 50, 26, 26) // morale at sparkle, repair above 25%
  configure(3, 40, 50, 50) // repair at 50%
  configure(4, 30, 51, 51) // repair above 50%
  configure(5, 60, 75, 75) // repair at 75%
  configure(7, 20, 76, 76) // repair above 75%

  return tableState({ info: { ...state.info, ships } })
}

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

export const MoraleAndRepairSeverity: Story = {
  name: 'Morale sparks at 50 and repair follows HP severity boundaries',
  parameters: { shipInfo: { state: statusState() } },
  play: async ({ canvasElement }) => {
    await waitFor(async () => {
      await expect(renderedNames(canvasElement).length).toBe(8)
    })

    const cond = (name: string) =>
      cellAt(canvasElement, name, COND_COLUMN)
        .firstElementChild as HTMLElement
    const repair = (name: string) =>
      cellAt(canvasElement, name, dataColumnIndex.repairtime)
        .firstElementChild as HTMLElement
    const background = (name: string) =>
      getComputedStyle(repair(name)).backgroundColor

    // 49 stays neutral; 50 is the first sparkling value.
    await expect(cond('Alpha').textContent).toBe('49')
    await expect(cond('Beta').textContent).toBe('50')
    const neutral = getComputedStyle(cond('Alpha')).color
    const sparkle = getComputedStyle(cond('Beta')).color
    await expect(sparkle).not.toBe(neutral)

    // 25/50/75 sit in the severe category; just above each crosses to the next.
    const heavy = background('Alpha') // 25%
    const moderateAbove25 = background('Beta') // 26%
    const moderateAt50 = background('Gamma') // 50%
    const minorAbove50 = background('Delta') // 51%
    const minorAt75 = background('Epsilon') // 75%
    const clearAbove75 = background('Eta') // 76%

    await expect(heavy).not.toBe(moderateAbove25)
    await expect(moderateAbove25).toBe(moderateAt50)
    await expect(moderateAt50).not.toBe(minorAbove50)
    await expect(minorAbove50).toBe(minorAt75)
    await expect(minorAt75).not.toBe(clearAbove75)
    await expect(heavy).not.toBe('rgba(0, 0, 0, 0)')
    await expect(moderateAt50).not.toBe('rgba(0, 0, 0, 0)')
    await expect(minorAt75).not.toBe('rgba(0, 0, 0, 0)')

    // Every severity still renders its repair duration.
    await expect(repair('Alpha').textContent).toContain('25')
    await expect(repair('Beta').textContent).toContain('26')
    await expect(repair('Gamma').textContent).toContain('50')
    await expect(repair('Delta').textContent).toContain('51')
    await expect(repair('Epsilon').textContent).toContain('75')
    await expect(repair('Eta').textContent).toContain('76')
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
