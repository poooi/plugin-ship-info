import { describe, expect, it } from 'vitest'

import {
  onDelete,
  onUpdate,
  PLUGIN_KEY,
  reducer,
} from '../packages/ship-info/src/views/redux'

const T = (name: string) => `@@${PLUGIN_KEY}@${name}`

const initialState = () => reducer(undefined, { type: '@@INIT' })

describe('redux: Ship Info init', () => {
  it('loads saved bookmarks and ignores the opaque legacy planner', () => {
    const state = reducer(initialState(), {
      data: {
        bookmark: { alpha: { name: 'alpha', ships: [1] } },
        planner: { archive: { old: [[9]] }, current: [[1]] },
      },
      type: T('init'),
    })

    expect(state.bookmark.alpha).toEqual({ name: 'alpha', ships: [1] })
    expect(state.ready).toBe(false)
    expect(state).not.toHaveProperty('planner')
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
    expect(reducer(ready, { type: 'nope' }).ready).toBe(true)
  })

  it('resets transient ready/error on load-start and sets error on load-error', () => {
    let state = initialState()
    state = reducer(state, { type: T('ready') })
    state = reducer(state, { error: 'load', type: T('load-error') })
    expect(state.ready).toBe(true)
    expect(state.error).toBe('load')

    state = reducer(state, { type: T('load-start') })
    expect(state.error).toBeNull()
  })
})
