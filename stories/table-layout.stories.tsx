import type { Meta, StoryObj } from '@storybook/react-vite'
import { getContrast } from 'polished'
import React from 'react'
import { expect, userEvent, waitFor, within } from 'storybook/test'

import { tableState } from '../preview/table-fixtures'
import { columns, getColumnMeta } from '../packages/ship-info/src/views/table/columns-config'
import { TableView } from '../packages/ship-info/src/views/table'
import { renderedNames, tableScroller } from './table-support'

const Table: React.FC = () => <TableView />

const meta = {
  title: 'Table/Layout',
  component: Table,
} satisfies Meta<typeof Table>

export default meta
type Story = StoryObj<typeof meta>

const headerCell = (root: HTMLElement, id: string): HTMLElement =>
  root.querySelector(
    `[role="columnheader"][data-column-id="${id}"]`,
  ) as HTMLElement

const headerContent = (cell: HTMLElement) => {
  const label = cell.querySelector('[data-title-label]') as HTMLElement
  return {
    label,
    minWidth: Math.max(
      getColumnMeta(cell.dataset.columnId ?? '')?.width ?? 100,
      Math.ceil(label.scrollWidth),
    ),
  }
}

const indicatorBelowOrAbove = (
  label: HTMLElement,
  indicator: HTMLElement,
) => {
  const labelRect = label.getBoundingClientRect()
  const indicatorRect = indicator.getBoundingClientRect()
  return (
    indicatorRect.bottom <= labelRect.top + 0.5 ||
    indicatorRect.top >= labelRect.bottom - 0.5
  )
}

const waitForTable = async (root: HTMLElement): Promise<void> => {
  await waitFor(async () => {
    await expect(renderedNames(root).length).toBe(8)
  })
}

const widthStory = (
  language: 'en-US' | 'ja-JP' | 'ko-KR' | 'zh-CN' | 'zh-TW',
): Story => ({
  name: `Sortable header widths stay stable in ${language}`,
  parameters: {
    shipInfo: {
      language,
      state: tableState({
        config: {
          plugin: { ShipInfo: { sortName: 'name', sortOrder: 1 } },
          poi: { appearance: { avatar: false } },
        },
      }),
    },
  },
  play: async ({ canvasElement }) => {
    await waitForTable(canvasElement)
    const scroller = tableScroller(canvasElement)
    const dataColumns = columns.filter((column) => column.id !== 'rowIndex')
    const normalHeaderColor = getComputedStyle(
      headerContent(headerCell(canvasElement, 'id')).label,
    ).color

    const checkHeaders = (direction: 'ascending' | 'descending') => {
      for (const column of dataColumns) {
        const id = column.id as string
        const cell = headerCell(canvasElement, id)
        const { label } = headerContent(cell)
        const indicator = cell.querySelector(
          '[data-sort-indicator]',
        ) as HTMLElement | null
        expect(getComputedStyle(label).whiteSpace).toBe('nowrap')
        expect(label.scrollWidth).toBeLessThanOrEqual(label.clientWidth + 1)
        expect(getComputedStyle(label).color).toBe(normalHeaderColor)
        if (id === 'name') {
          expect(indicator).toBeTruthy()
          expect(getComputedStyle(indicator!).position).toBe('absolute')
          expect(indicatorBelowOrAbove(label, indicator!)).toBe(true)
          const labelCenter =
            label.getBoundingClientRect().top +
            label.getBoundingClientRect().height / 2
          const indicatorCenter =
            indicator!.getBoundingClientRect().top +
            indicator!.getBoundingClientRect().height / 2
          if (direction === 'ascending') {
            expect(indicatorCenter).toBeLessThan(labelCenter)
          } else {
            expect(indicatorCenter).toBeGreaterThan(labelCenter)
          }
          expect(getComputedStyle(cell).backgroundImage).toContain(
            'linear-gradient',
          )
        } else {
          expect(indicator).toBeNull()
          expect(getComputedStyle(cell).backgroundImage).toBe('none')
        }
      }
    }

    checkHeaders('ascending')
    const ascendingTint = getComputedStyle(
      headerCell(canvasElement, 'name'),
    ).backgroundImage
    const before = new Map(
      dataColumns.map((column) => [
        column.id as string,
        headerCell(canvasElement, column.id as string).offsetWidth,
      ]),
    )
    const nameHeader = headerCell(canvasElement, 'name')
    const nameButton = within(nameHeader).getByRole('button')
    await expect(nameHeader.getAttribute('aria-sort')).toBe('ascending')
    await userEvent.click(nameButton)
    await waitFor(() => {
      expect(nameHeader.getAttribute('aria-sort')).toBe('descending')
    })
    await waitForTable(canvasElement)
    checkHeaders('descending')
    const descendingTint = getComputedStyle(
      headerCell(canvasElement, 'name'),
    ).backgroundImage
    await expect(descendingTint).not.toBe(ascendingTint)
    for (const [id, width] of before) {
      expect(
        Math.abs(headerCell(canvasElement, id).offsetWidth - width),
      ).toBeLessThanOrEqual(1)
    }
    await expect(scroller.scrollWidth).toBeGreaterThanOrEqual(
      scroller.clientWidth,
    )
    expect(
      headerCell(canvasElement, 'rowIndex').offsetWidth,
    ).toBe(40)
  },
})

export const WidthsEnUS = widthStory('en-US')
export const WidthsJaJP = widthStory('ja-JP')
export const WidthsKoKR = widthStory('ko-KR')
export const WidthsZhCN = widthStory('zh-CN')
export const WidthsZhTW = widthStory('zh-TW')

const tintStory = (theme: 'light' | 'dark'): Story => ({
  name: `Sort tint and direction stay visible in ${theme} theme`,
  parameters: {
    shipInfo: {
      state: tableState({
        config: {
          plugin: {
            ShipInfo: {
              columnPinning: { left: ['rowIndex', 'name'] },
              sortName: 'name',
              sortOrder: 1,
            },
          },
          poi: { appearance: { avatar: false } },
        },
      }),
      theme,
    },
  },
  play: async ({ canvasElement }) => {
    await waitForTable(canvasElement)
    const nameHeader = headerCell(canvasElement, 'name')
    const normalColor = getComputedStyle(
      headerContent(headerCell(canvasElement, 'id')).label,
    ).color
    const ascending = getComputedStyle(nameHeader).backgroundImage
    await expect(ascending).toContain('linear-gradient')
    await expect(nameHeader.getAttribute('aria-sort')).toBe('ascending')
    const ascendingIndicator = nameHeader.querySelector(
      '[data-sort-indicator]',
    ) as HTMLElement
    const label = headerContent(nameHeader).label
    await expect(
      indicatorBelowOrAbove(label, ascendingIndicator),
    ).toBe(true)
    await expect(getComputedStyle(label).color).toBe(normalColor)
    await expect(nameHeader.getBoundingClientRect().height).toBe(35)
    await expect(
      getContrast(
        getComputedStyle(nameHeader).backgroundColor,
        getComputedStyle(label).color,
      ),
    ).toBeGreaterThanOrEqual(4.5)

    await userEvent.click(within(nameHeader).getByRole('button'))
    await waitFor(() => {
      expect(nameHeader.getAttribute('aria-sort')).toBe('descending')
    })
    const descending = getComputedStyle(nameHeader).backgroundImage
    await expect(descending).toContain('linear-gradient')
    await expect(descending).not.toBe(ascending)
    const descendingIndicator = nameHeader.querySelector(
      '[data-sort-indicator]',
    ) as HTMLElement
    await expect(
      indicatorBelowOrAbove(label, descendingIndicator),
    ).toBe(true)
  },
})

export const SortTintLight = tintStory('light')
export const SortTintDark = tintStory('dark')

export const SurplusDistribution: Story = {
  name: 'Wide tables distribute surplus by configured base widths',
  parameters: {
    shipInfo: {
      dimensions: { height: 700, width: 1800 },
      state: tableState(),
    },
  },
  play: async ({ canvasElement }) => {
    await waitForTable(canvasElement)
    const scroller = tableScroller(canvasElement)
    const dataColumns = columns.filter((column) => column.id !== 'rowIndex')
    const measured = dataColumns.map((column) => {
      const cell = headerCell(canvasElement, column.id as string)
      const { minWidth } = headerContent(cell)
      return {
        baseWidth: getColumnMeta(column.id as string)?.width ?? 100,
        cell,
        id: column.id as string,
        minWidth,
      }
    })
    const minTotal = measured.reduce(
      (sum, column) => sum + column.minWidth,
      0,
    )
    const weightTotal = measured.reduce(
      (sum, column) => sum + column.baseWidth,
      0,
    )
    const spare = scroller.clientWidth - 40 - minTotal
    await expect(spare).toBeGreaterThan(100)

    for (const column of measured) {
      const expected =
        column.minWidth + (spare * column.baseWidth) / weightTotal
      await expect(
        Math.abs(column.cell.offsetWidth - expected),
      ).toBeLessThanOrEqual(1)
    }
    await expect(headerCell(canvasElement, 'rowIndex').offsetWidth).toBe(40)

    const headerCells = Array.from(
      scroller.querySelectorAll<HTMLElement>('[role="columnheader"]'),
    )
    const firstRow = canvasElement
      .querySelector('[role="gridcell"]')!
      .parentElement!.parentElement as HTMLElement
    const rowCells = Array.from(firstRow.children) as HTMLElement[]
    await expect(rowCells).toHaveLength(headerCells.length)
    for (let index = 0; index < headerCells.length; index += 1) {
      await expect(
        Math.abs(
          rowCells[index].getBoundingClientRect().width -
            headerCells[index].getBoundingClientRect().width,
        ),
      ).toBeLessThanOrEqual(1)
    }
  },
}

export const NarrowOverflow: Story = {
  name: 'Narrow tables keep native horizontal overflow',
  parameters: {
    shipInfo: {
      dimensions: { height: 500, width: 420 },
      state: tableState(),
    },
  },
  play: async ({ canvasElement }) => {
    await waitForTable(canvasElement)
    const scroller = tableScroller(canvasElement)
    await waitFor(() => {
      expect(scroller.scrollWidth).toBeGreaterThan(scroller.clientWidth + 1)
    })
    for (const column of columns.filter((item) => item.id !== 'rowIndex')) {
      const cell = headerCell(canvasElement, column.id as string)
      const { label } = headerContent(cell)
      await expect(getComputedStyle(label).whiteSpace).toBe('nowrap')
    }
  },
}
