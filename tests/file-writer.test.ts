import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({
  calls: [] as {
    args: any[]
    promise: Promise<any>
    reject: (e: any) => void
    resolve: (v?: any) => void
  }[],
}))

vi.mock('fs-extra', () => ({
  outputJson: (...args: any[]) => {
    let reject!: (e: any) => void
    let resolve!: (v?: any) => void
    const promise = new Promise((res, rej) => {
      reject = rej
      resolve = res
    })
    h.calls.push({ args, promise, reject, resolve })
    return promise
  },
}))

import FileWriter from '../views/file-writer'

const flush = () => new Promise((resolve) => setImmediate(resolve))

describe('FileWriter', () => {
  beforeEach(() => {
    h.calls.length = 0
  })

  it('runs queued writes one at a time in insertion order', async () => {
    const fw = new FileWriter()
    const events: string[] = []
    const cb = (name: string) => (err?: any) => {
      events.push(`${name}:${err ? 'err' : 'ok'}`)
    }

    fw.write('p1', 'd1', undefined, cb('c1'))
    fw.write('p2', 'd2', undefined, cb('c2'))
    fw.write('p3', 'd3', undefined, cb('c3'))

    // only the first write starts; the rest stay queued
    expect(h.calls).toHaveLength(1)
    expect(h.calls[0].args).toEqual(['p1', 'd1', undefined])
    expect(fw._queue).toHaveLength(2)
    expect(fw.writing).toBe(true)

    h.calls[0].resolve()
    await flush()
    expect(h.calls.map((c) => c.args[0])).toEqual(['p1', 'p2'])
    expect(events).toEqual(['c1:ok'])

    h.calls[1].resolve()
    await flush()
    expect(h.calls.map((c) => c.args[0])).toEqual(['p1', 'p2', 'p3'])
    expect(events).toEqual(['c1:ok', 'c2:ok'])

    h.calls[2].resolve()
    await flush()
    expect(events).toEqual(['c1:ok', 'c2:ok', 'c3:ok'])
    expect(fw._queue).toHaveLength(0)
    expect(fw.writing).toBe(false)
  })

  it('keeps independent queues per instance', async () => {
    const a = new FileWriter()
    const b = new FileWriter()

    a.write('a1', 1)
    b.write('b1', 2)

    expect(h.calls.map((c) => c.args[0])).toEqual(['a1', 'b1'])

    h.calls[0].resolve()
    h.calls[1].resolve()
    await flush()
    expect(a.writing).toBe(false)
    expect(b.writing).toBe(false)
  })

  it('reports a rejected write and keeps processing the queue', async () => {
    const fw = new FileWriter()
    const events: string[] = []
    const cb = (name: string) => (err?: unknown) => {
      events.push(`${name}:${err ? 'err' : 'ok'}`)
    }

    fw.write('p1', 'd1', undefined, cb('c1'))
    fw.write('p2', 'd2', undefined, cb('c2'))

    h.calls[0].reject(new Error('EACCES: permission denied'))
    await flush()
    expect(events).toEqual(['c1:err'])
    expect(h.calls.map((c) => c.args[0])).toEqual(['p1', 'p2'])
    expect(fw.writing).toBe(true)

    h.calls[1].resolve()
    await flush()
    expect(events).toEqual(['c1:err', 'c2:ok'])
    expect(fw.writing).toBe(false)
    expect(fw._queue).toHaveLength(0)
  })

  it('releases the writer even when the final write rejects', async () => {
    const fw = new FileWriter()
    const seen: unknown[] = []

    fw.write('only', 'd', undefined, (err) => seen.push(err))
    h.calls[0].reject(new Error('boom'))
    await flush()

    expect(seen).toHaveLength(1)
    expect(seen[0]).toBeInstanceOf(Error)
    expect(fw.writing).toBe(false)
    expect(fw._queue).toHaveLength(0)
  })

  it('a throwing callback does not strand later writes', async () => {
    const fw = new FileWriter()
    const events: string[] = []
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    fw.write('p1', 'd1', undefined, () => {
      throw new Error('callback boom')
    })
    fw.write('p2', 'd2', undefined, (err) => events.push(err ? 'err' : 'ok'))

    h.calls[0].resolve()
    await flush()
    expect(h.calls.map((c) => c.args[0])).toEqual(['p1', 'p2'])

    h.calls[1].resolve()
    await flush()
    expect(events).toEqual(['ok'])
    expect(fw.writing).toBe(false)
    expect(fw._queue).toHaveLength(0)
    errorSpy.mockRestore()
  })

  it('drain resolves once the current queue settles', async () => {
    const fw = new FileWriter()
    let drained = false

    fw.write('p1', 'd1')
    const pending = fw.drain().then(() => {
      drained = true
    })
    await flush()
    expect(drained).toBe(false)

    h.calls[0].resolve()
    await pending
    expect(drained).toBe(true)
  })

  it('drain resolves immediately when nothing is queued', async () => {
    const fw = new FileWriter()
    await expect(fw.drain()).resolves.toBeUndefined()
  })
})
