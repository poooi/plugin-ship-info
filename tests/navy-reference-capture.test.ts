import { describe, expect, it } from 'vitest'

import { captureReference } from '../packages/navy-staff/src/views/reference/capture'
import { projectReference } from '../packages/navy-staff/src/views/reference/catalog'
import {
  createRequestGuard,
  filterProjectedReference,
  groupShipsByType,
  inputWithinLimit,
} from '../packages/navy-staff/src/views/reference/helpers'
import type { DecodedReference } from '../packages/navy-staff/src/views/reference/types'
import type {
  DisplayContent,
  WorkspaceShipRow,
} from '../packages/navy-staff/src/views/workspace/display'

const row = (over: Partial<WorkspaceShipRow>): WorkspaceShipRow => ({
  assignedColor: '#ff0000',
  avatarOffset: 0.555,
  fleetId: -1,
  level: null,
  live: false,
  masterId: null,
  name: null,
  ownedId: 0,
  record: null,
  superTypeIndex: -1,
  typeId: null,
  ...over,
})

const display = (): DisplayContent => ({
  areas: [
    {
      color: '#ff0000',
      fleetLabels: { 'en-US': 'Fleet A', 'zh-CN': '第一舰队' },
      id: 'area-1',
      index: 0,
      label: 'E1',
      ships: [
        row({ level: 10, masterId: 123, ownedId: 5 }),
        row({ ownedId: 6 }),
        row({ level: 10, masterId: 123, ownedId: 7 }),
      ],
      tagSlot: 0,
    },
    { color: '#00ff00', fleetLabels: {}, id: 'area-2', index: 1, label: 'E2', ships: [], tagSlot: 1 },
  ],
  gridShips: [row({ level: 60, masterId: 999999, ownedId: 5 })],
  name: 'Plan',
})

const options = {
  captureTime: '2026-01-01T00:00:00.000Z',
  displayFleetName: false,
  exportTime: '2026-01-02T00:00:00.000Z',
  locale: 'en-US',
}

describe('reference capture', () => {
  it('captures ordered groups with duplicates, nulls, and empty areas', () => {
    const reference = captureReference(display(), options)
    expect(reference.groups.map((g) => g.label)).toEqual(['E1', 'E2'])
    expect(reference.groups[0].ships).toEqual([
      { level: 10, masterId: 123 },
      { level: null, masterId: null },
      { level: 10, masterId: 123 },
    ])
    expect(reference.groups[1].ships).toEqual([])
    expect(
      captureReference({ areas: [], gridShips: [], name: 'Empty' }, options).groups,
    ).toEqual([])
  })

  it('respects the fleet-name preference and locale fallback', () => {
    expect(
      captureReference(display(), { ...options, displayFleetName: true, locale: 'zh-CN' })
        .groups[0].label,
    ).toBe('第一舰队')
    expect(
      captureReference(display(), { ...options, displayFleetName: true, locale: 'ja-JP' })
        .groups[0].label,
    ).toBe('E1')
  })

  it('current export overlays raw owned values regardless of master metadata', () => {
    // The live row for owned 5 has raw master 999999 / level 60 (missing master).
    const rawShips = new Map([
      [5, { level: 60, masterId: 999999 }],
    ])
    const current = captureReference(display(), { ...options, rawShips })
    expect(current.groups[0].ships[0]).toEqual({ level: 60, masterId: 999999 })
    // Owned 6 is not in the raw roster: its captured values stay.
    expect(current.groups[0].ships[1]).toEqual({ level: null, masterId: null })
  })

  it('historical export keeps the captured values without raw overlay', () => {
    const rawShips = new Map([[5, { level: 60, masterId: 999999 }]])
    const historical = captureReference(display(), options)
    expect(historical.groups[0].ships[0]).toEqual({ level: 10, masterId: 123 })
    // A mismatched/empty raw map overlays nothing.
    const mismatched = captureReference(display(), { ...options, rawShips: new Map() })
    expect(mismatched.groups[0].ships[0]).toEqual({ level: 10, masterId: 123 })
  })
})

describe('reference helpers', () => {
  it('a newer oversized selection invalidates a pending read (A -> oversized B)', () => {
    const guard = createRequestGuard()
    const tokenA = guard.begin()
    const tokenB = guard.begin()
    expect(inputWithinLimit(200 * 1024)).toBe(false)
    expect(guard.isCurrent(tokenA)).toBe(false)
    expect(guard.isCurrent(tokenB)).toBe(true)
  })

  it('filters by master ID and groups by type preserving occurrences and area', () => {
    const reference: DecodedReference = {
      captureTime: options.captureTime,
      exportTime: options.exportTime,
      groups: [
        { color: '#ff0000', label: 'E1', ships: [{ level: 10, masterId: 123 }, { level: 20, masterId: 999999 }] },
      ],
      locale: 'en-US',
      schemaVersion: 1,
      title: 'Plan',
    }
    const masters = new Map([[123, { name: 'Fubuki', type: 'DD' }]])
    const projected = projectReference(reference, masters)
    expect(projected.unknownShipCount).toBe(1)
    expect(filterProjectedReference(projected, 'fubuki').shipCount).toBe(1)
    const buckets = groupShipsByType(projected)
    const dd = buckets.find((bucket) => bucket.type === 'DD')
    expect(dd?.ships[0]).toMatchObject({ areaColor: '#ff0000', areaLabel: 'E1' })
  })
})
