import { describe, expect, it, vi } from 'vitest'

vi.mock('views/utils/selectors', () => ({
  extensionSelectorFactory: (key: string) => (state: any) => state[key],
}))
vi.mock('redux-observers', () => ({
  observer: (...args: any[]) => args,
}))

import {
  onAddShip,
  onDisplaceShip,
  onDPInit,
  onRemoveShip,
} from '../packages/ship-info/src/views/planner/redux'
import { onDelete, onUpdate, PLUGIN_KEY, reducer } from '../packages/ship-info/src/views/redux'

const T = (name: string) => `@@${PLUGIN_KEY}@${name}`

const initialState = () => reducer(undefined, { type: '@@INIT' })

const initPlanner = (planner: any, bookmark?: any) =>
  reducer(initialState(), {
    data: { bookmark, planner },
    type: T('init'),
  })

describe('redux: planner @init', () => {
  it('loads saved current/archive planner and bookmarks', () => {
    const state = initPlanner(
      { archive: { old: [[9]] }, current: [[1, 2], [3]] },
      { alpha: { name: 'alpha', ships: [1] } },
    )

    expect(state.planner.current).toEqual([[1, 2], [3]])
    expect(state.planner.archive).toEqual({ old: [[9]] })
    expect(state.bookmark.alpha).toEqual({ name: 'alpha', ships: [1] })
    // ready is only set by the explicit ready action
    expect(state.ready).toBe(false)
  })

  it('falls back to the default empty planner when none is saved', () => {
    const state = reducer(initialState(), { data: {}, type: T('init') })
    expect(state.planner).toEqual({ archive: {}, current: [] })
  })
})

describe('redux: planner @dp-init resizing', () => {
  it('grows current to the map area count with empty areas', () => {
    const state = initPlanner({ archive: {}, current: [[1]] })
    const next = reducer(state, onDPInit({ color: [], mapname: ['E1', 'E2', 'E3'] }))

    expect(next.planner.current).toEqual([[1], [], []])
  })

  it('shrinks current to the map area count', () => {
    const state = initPlanner({ archive: {}, current: [[1], [2], [3]] })
    const next = reducer(state, onDPInit({ color: [], mapname: ['E1'] }))

    expect(next.planner.current).toEqual([[1]])
  })

  it('keeps the same planner reference when the count already matches', () => {
    const state = initPlanner({ archive: {}, current: [[1], [2]] })
    const next = reducer(state, onDPInit({ color: [], mapname: ['E1', 'E2'] }))

    expect(next.planner).toBe(state.planner)
  })
})

describe('redux: planner ship mutations', () => {
  it('adds, removes and displaces ships between areas', () => {
    let state = initPlanner({ archive: {}, current: [[], []] })

    state = reducer(state, onAddShip({ areaIndex: 0, shipId: 10 }))
    expect(state.planner.current).toEqual([[10], []])

    state = reducer(state, onDisplaceShip({ fromAreaIndex: 0, shipId: 10, toAreaIndex: 1 }))
    expect(state.planner.current).toEqual([[], [10]])

    state = reducer(state, onRemoveShip({ areaIndex: 1, shipId: 10 }))
    expect(state.planner.current).toEqual([[], []])
  })

  it('treats repeated add of the same ship as a no-op', () => {
    let state = initPlanner({ archive: {}, current: [[]] })
    state = reducer(state, onAddShip({ areaIndex: 0, shipId: 10 }))
    const next = reducer(state, onAddShip({ areaIndex: 0, shipId: 10 }))

    expect(next.planner).toBe(state.planner)
    expect(next.planner.current).toEqual([[10]])
  })

  it('treats removing a ship that is absent as a no-op', () => {
    const state = initPlanner({ archive: {}, current: [[10]] })
    const next = reducer(state, onRemoveShip({ areaIndex: 0, shipId: 99 }))
    expect(next.planner).toBe(state.planner)
  })

  it('does not mutate the previous state', () => {
    const state = initPlanner({ archive: {}, current: [[1], [2]] })
    const snapshot = structuredClone(state)

    const next = reducer(state, onAddShip({ areaIndex: 0, shipId: 7 }))

    expect(state).toEqual(snapshot)
    expect(next.planner.current).not.toBe(state.planner.current)
    expect(next.planner.current[1]).toBe(state.planner.current[1])
  })

  it('preserves unrelated bookmark, ui and ready slices', () => {
    let state = initPlanner({ archive: {}, current: [[]] })
    state = reducer(state, { bookmark: 'b', settings: {}, type: '@@poi-plugin-ship-info@update' })
    state = reducer(state, { isExtend: false, type: T('extend') })
    state = reducer(state, { type: T('ready') })

    const next = reducer(state, onAddShip({ areaIndex: 0, shipId: 5 }))

    expect(next.bookmark).toBe(state.bookmark)
    expect(next.ui).toBe(state.ui)
    expect(next.ui.isExtend).toBe(false)
    expect(next.ready).toBe(true)
  })
})

describe('redux: bookmark and ui actions', () => {
  it('adds and deletes bookmarks without dropping others', () => {
    let state = initialState()
    state = reducer(state, onUpdate({ bookmark: 'a', settings: { shipTypeChecked: 1, x: 2 } }))
    state = reducer(state, onUpdate({ bookmark: 'b', settings: { x: 3 } }))

    expect(state.bookmark.a).toEqual({ name: 'a', x: 2 })
    expect(state.bookmark.b).toEqual({ name: 'b', x: 3 })

    state = reducer(state, onDelete({ bookmark: 'a' }))
    expect(state.bookmark.a).toBeUndefined()
    expect(state.bookmark.b).toEqual({ name: 'b', x: 3 })
  })

  it('toggles ui state and latches ready', () => {
    let state = initialState()
    state = reducer(state, { isExtend: false, type: T('extend') })
    state = reducer(state, { toTop: false, type: T('scroll') })
    state = reducer(state, { activeDropdown: 'menu', type: T('active-dropdown') })

    expect(state.ui).toEqual({
      activeDropdown: 'menu',
      isExtend: false,
      toTop: false,
    })

    state = reducer(state, { activeDropdown: 'menu', type: T('active-dropdown') })
    expect(state.ui.activeDropdown).toBe('')

    const ready = reducer(state, { type: T('ready') })
    expect(ready.ready).toBe(true)
    // ready stays set for unrelated actions
    expect(reducer(ready, { type: 'nope' }).ready).toBe(true)
  })
})
