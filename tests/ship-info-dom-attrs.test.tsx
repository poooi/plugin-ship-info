// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import i18next from 'i18next'
import React from 'react'
import { I18nextProvider } from 'react-i18next'
import { Provider } from 'react-redux'
import { legacy_createStore } from 'redux'
import { ThemeProvider } from 'styled-components'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getTheme } from './ui/environment'

vi.mock('views/env-parts/i18next', () => ({
  default: { getFixedT: () => (key: string) => key },
}))
vi.mock('views/utils/selectors', async () => (await import('./ui/host')).poiSelectors)
vi.mock('views/components/etc/overlay', () => ({
  Tooltip: ({ children }: any) => children,
}))
vi.mock('views/components/etc/avatar', () => ({ Avatar: () => null }))
vi.mock('views/components/etc/icon', () => ({ SlotitemIcon: () => null }))
vi.mock('views/utils/tools', () => ({ resolveTime: (time: number) => `${time}` }))
vi.mock('wanakana', () => ({ toRomaji: (value: string) => value }))
vi.mock('react-fontawesome', async () => {
  const React = await import('react')
  return {
    default: ({ name: _name, ...rest }: any) =>
      React.createElement('span', rest),
  }
})

import { mkRow } from './fixtures'
import { Cells } from '../packages/ship-info/src/views/table/cells'
import { columns } from '../packages/ship-info/src/views/table/columns-config'
import { TitleCell } from '../packages/ship-info/src/views/table/title-cell'

const i18n = i18next.createInstance()
i18n.init({
  defaultNS: 'resources',
  fallbackLng: false,
  initAsync: false,
  lng: 'en-US',
  ns: ['resources', 'poi-plugin-ship-info'],
  resources: { 'en-US': { resources: {}, 'poi-plugin-ship-info': {} } },
})

const tableState = () => ({
  config: { plugin: { ShipInfo: {} }, poi: { appearance: { avatar: false } } },
  const: { $shipTypes: {}, $ships: {} },
  fcd: { shiptag: { color: [], mapname: [] } },
  info: { equips: {}, ships: {} },
  repairs: [],
})

const wrap = (node: React.ReactNode, withStore = false) => {
  const tree = (
    <ThemeProvider theme={getTheme('dark')}>
      <I18nextProvider i18n={i18n}>{node}</I18nextProvider>
    </ThemeProvider>
  )
  return render(
    withStore ? (
      <Provider store={legacy_createStore(() => tableState())}>{tree}</Provider>
    ) : (
      tree
    ),
  )
}

let errorSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  // React reports leaked attributes and invalid prop values through
  // console.error; assert the render is silent instead of only checking that
  // React happened to drop the value from the DOM.
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  errorSpy.mockRestore()
  cleanup()
})

describe('Ship Info table DOM attributes', () => {
  it('does not leak title-cell styling props to the DOM', () => {
    const { container } = wrap(
      <TitleCell title="Name" sortable centerAlign sorting up={false} />,
    )
    const element = container.firstChild as HTMLElement

    expect(element.getAttribute('role')).toBe('button')
    expect(element.hasAttribute('centeralign')).toBe(false)
    expect(element.hasAttribute('sorting')).toBe(false)
    expect(element.hasAttribute('sortable')).toBe(false)
    expect(errorSpy).not.toHaveBeenCalled()
  })

  it('keeps DOM forwarding and click behavior for sortable headers', () => {
    const onClick = vi.fn()
    wrap(
      <TitleCell
        title="Name"
        sortable
        centerAlign
        sorting={false}
        up={false}
        data-testid="title-cell"
        onClick={onClick}
      />,
    )
    const element = screen.getByTestId('title-cell')

    fireEvent.click(element)
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(errorSpy).not.toHaveBeenCalled()
  })

  it('does not leak the per-cell max flag to the DOM', () => {
    const { container } = wrap(<Cells.karyoku shipData={mkRow()} />)
    const element = container.firstChild as HTMLElement

    expect(element.hasAttribute('max')).toBe(false)
    expect(element.textContent).toContain('/')
    expect(errorSpy).not.toHaveBeenCalled()
  })

  it('does not forward the connection dispatch prop from the real columns name cell', () => {
    const nameColumn = columns.find((column) => column.id === 'name')!
    const renderNameCell = nameColumn.cell as unknown as (ctx: {
      row: { original: { shipData: ReturnType<typeof mkRow> } }
    }) => React.ReactElement
    const { container } = wrap(
      renderNameCell({ row: { original: { shipData: mkRow() } } }),
      true,
    )

    expect(container.querySelector('[dispatch]')).toBeNull()
    expect(screen.getByText('Ship')).toBeTruthy()
    expect(errorSpy).not.toHaveBeenCalled()
  })

  it('does not forward the connection dispatch prop from the shared name cell', () => {
    const { container } = wrap(<Cells.name shipData={mkRow()} />, true)

    expect(container.querySelector('[dispatch]')).toBeNull()
    expect(screen.getByText('Ship')).toBeTruthy()
    expect(errorSpy).not.toHaveBeenCalled()
  })
})
