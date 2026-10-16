import { describe, expect, it } from 'vitest'

import {
  migratePersistedVersion,
  type PersistedMigration,
} from '../packages/shared/src/persistence'

describe('migratePersistedVersion', () => {
  it('treats an absent version as 0 and stamps each step in order', () => {
    // Two-step fixture: v0 -> v1 adds `a`, v1 -> v2 appends to `b`.
    const migrations: readonly PersistedMigration[] = [
      (data) => ({ ...data, a: 1 }),
      (data) => ({ ...data, b: [...((data.b as number[]) ?? []), 2] }),
    ]

    expect(migratePersistedVersion({}, migrations)).toEqual({
      a: 1,
      b: [2],
      version: 2,
    })
    expect(migratePersistedVersion({ version: 1, b: [9] }, migrations)).toEqual({
      b: [9, 2],
      version: 2,
    })
  })

  it('returns the same reference unchanged when already current', () => {
    const raw = { version: 1, planner: { current: [[1]] } }
    expect(migratePersistedVersion(raw, [(data) => data])).toBe(raw)
  })

  it('rejects malformed and negative versions', () => {
    for (const version of ['1', 1.5, -1, NaN, {}]) {
      expect(() => migratePersistedVersion({ version }, [(d) => d])).toThrow()
    }
  })

  it('rejects an unsupported future version', () => {
    expect(() =>
      migratePersistedVersion({ version: 2 }, [(d) => d]),
    ).toThrow(/newer than supported/)
  })
})
