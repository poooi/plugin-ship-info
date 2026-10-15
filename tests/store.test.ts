import fs from 'fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({
  observerArgs: {} as { cb?: any; selector?: any },
  writes: [] as any[][],
}))

vi.mock('views/utils/selectors', () => ({
  extensionSelectorFactory: (key: string) => (state: any) => state[key],
}))
vi.mock('redux-observers', () => ({
  observer: (selector: any, cb: any) => {
    h.observerArgs = { cb, selector }
    return { cb, selector }
  },
}))
vi.mock('../views/file-writer', () => ({
  default: class {
    public write(...args: any[]) {
      h.writes.push(args)
    }
  },
}))

import { DATA_PATH, dataObserver, initStore, PLUGIN_KEY } from '../views/redux'

const flush = () => new Promise((resolve) => setImmediate(resolve))

type DispatchMock = ReturnType<typeof vi.fn<(value: any) => void>>

describe('initStore', () => {
  let dispatch: DispatchMock
  let errorSpy: ReturnType<typeof vi.spyOn>

  const getState = () => ({ fcd: { shiptag: { mapname: ['E1', 'E2'] } } })

  beforeEach(() => {
    dispatch = vi.fn<(value: any) => void>()
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    fs.rmSync(DATA_PATH, { force: true })
  })

  afterEach(() => {
    errorSpy.mockRestore()
  })

  it('loads the saved file and dispatches init then ready, in order', async () => {
    const saved = {
      bookmark: { alpha: { name: 'alpha' } },
      planner: { archive: {}, current: [[1, 2]] },
    }
    fs.writeFileSync(DATA_PATH, JSON.stringify(saved))

    await initStore(dispatch, getState)

    expect(dispatch).toHaveBeenCalledTimes(2)
    expect(dispatch.mock.calls[0][0]).toEqual({
      data: saved,
      type: `@@${PLUGIN_KEY}@init`,
    })
    expect(dispatch.mock.calls[1][0]).toEqual({
      type: `@@${PLUGIN_KEY}@ready`,
    })
    expect(errorSpy).not.toHaveBeenCalled()
  })

  it('reports a missing file and still dispatches ready', async () => {
    await initStore(dispatch, getState)

    expect(errorSpy).toHaveBeenCalledTimes(1)
    expect(dispatch).toHaveBeenCalledTimes(1)
    expect(dispatch.mock.calls[0][0]).toEqual({
      type: `@@${PLUGIN_KEY}@ready`,
    })
  })

  it('reports a corrupt file and still dispatches ready', async () => {
    fs.writeFileSync(DATA_PATH, '{ not valid json')

    await initStore(dispatch, getState)

    expect(errorSpy).toHaveBeenCalledTimes(1)
    expect(dispatch).toHaveBeenCalledTimes(1)
    expect(dispatch.mock.calls[0][0]).toEqual({
      type: `@@${PLUGIN_KEY}@ready`,
    })
  })
})

describe('dataObserver', () => {
  beforeEach(() => {
    h.writes.length = 0
  })

  it('reads the plugin slice through the host extension selector', () => {
    const state = { [PLUGIN_KEY]: { ready: true } }
    expect(h.observerArgs.selector(state)).toBe(state[PLUGIN_KEY])
  })

  it('never writes before ready and writes the latest ready state', async () => {
    const write = h.observerArgs.cb
    const dispatch = vi.fn()

    write(dispatch, { planner: { current: [[1]] }, ready: false })
    await flush()
    expect(h.writes).toHaveLength(0)

    const first = { planner: { current: [[1]] }, ready: true }
    write(dispatch, first)
    await flush()
    expect(h.writes).toEqual([[DATA_PATH, first]])

    const latest = { planner: { current: [[1, 2]] }, ready: true }
    write(dispatch, latest)
    await flush()
    expect(h.writes).toHaveLength(2)
    expect(h.writes[1]).toEqual([DATA_PATH, latest])
  })

  it('treats a missing current state as not ready', async () => {
    h.observerArgs.cb(vi.fn())
    await flush()
    expect(h.writes).toHaveLength(0)
  })
})
