import fs from 'fs'
import { readJsonSync } from 'fs-extra'
import path from 'path'
import { afterAll, describe, expect, it } from 'vitest'

import FileWriter from '../packages/shared/src/file-writer'

// Real fs-extra, real files, but always inside this test file's temp APPDATA dir.
const dir = fs.mkdtempSync(path.join((window as any).APPDATA_PATH, 'fw-real-'))

afterAll(() => {
  fs.rmSync(dir, { recursive: true, force: true })
})

describe('FileWriter against real fs-extra', () => {
  it('writes queued payloads in order and leaves the last one on disk', async () => {
    const fw = new FileWriter()
    const file = path.join(dir, 'output.json')
    const order: string[] = []

    await new Promise<void>((resolve, reject) => {
      let remaining = 3
      const done = (name: string) => (err?: any) => {
        if (err) {
          reject(err)
          return
        }
        order.push(name)
        if (--remaining === 0) resolve()
      }
      fw.write(file, { payload: 1 }, undefined, done('a'))
      fw.write(file, { payload: 2 }, undefined, done('b'))
      fw.write(file, { payload: 3 }, undefined, done('c'))
    })

    expect(order).toEqual(['a', 'b', 'c'])
    expect(fw._queue).toHaveLength(0)
    expect(fw.writing).toBe(false)
    expect(readJsonSync(file)).toEqual({ payload: 3 })
  })

  it('writes distinct payloads to distinct paths', async () => {
    const fw = new FileWriter()
    const fileA = path.join(dir, 'a.json')
    const fileB = path.join(dir, 'b.json')

    await Promise.all([
      new Promise<void>((resolve, reject) =>
        fw.write(fileA, { which: 'a' }, undefined, (err?: any) =>
          err ? reject(err) : resolve(),
        ),
      ),
      new Promise<void>((resolve, reject) =>
        fw.write(fileB, { which: 'b' }, undefined, (err?: any) =>
          err ? reject(err) : resolve(),
        ),
      ),
    ])

    expect(readJsonSync(fileA)).toEqual({ which: 'a' })
    expect(readJsonSync(fileB)).toEqual({ which: 'b' })
  })
})
