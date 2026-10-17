import { describe, expect, it } from 'vitest'

import {
  resolveSortieTagColor,
  resolveSortieTagLabel,
} from '../packages/navy-staff/src/views/planner/actual-sortie-tag'
import type { HostShiptagView } from '../packages/navy-staff/src/views/sync/capture'

// In the node test environment `currentLocale()` resolves to `en-US`.
const shiptag: HostShiptagView = {
  color: ['#ff0000', '#00ff00'],
  fleetname: { 'en-US': ['Fleet One', ''], 'ja-JP': ['第1艦隊', '第2艦隊'] },
  mapname: ['E1', 'E2'],
}

describe('resolveSortieTagLabel', () => {
  it('returns the original map label by default', () => {
    expect(resolveSortieTagLabel(shiptag, 1, false)).toBe('E1')
  })

  it('returns the translated fleet label when present', () => {
    expect(resolveSortieTagLabel(shiptag, 1, true)).toBe('Fleet One')
  })

  it('falls back to the original map label when the translation is empty', () => {
    expect(resolveSortieTagLabel(shiptag, 2, true)).toBe('E2')
  })

  it('falls back to the original map label when the locale entry is absent', () => {
    const onlyJapanese: HostShiptagView = {
      fleetname: { 'ja-JP': ['第1艦隊'] },
      mapname: ['E1'],
    }
    expect(resolveSortieTagLabel(onlyJapanese, 1, true)).toBe('E1')
  })

  it('returns null when both the translation and the map label are absent', () => {
    expect(resolveSortieTagLabel(null, 1, false)).toBeNull()
    expect(resolveSortieTagLabel({ mapname: [] }, 1, true)).toBeNull()
  })
})

describe('resolveSortieTagColor', () => {
  it('returns the host color for a tagged slot', () => {
    expect(resolveSortieTagColor(shiptag, 2)).toBe('#00ff00')
  })

  it('returns null when the color metadata is absent', () => {
    expect(resolveSortieTagColor(shiptag, 3)).toBeNull()
    expect(resolveSortieTagColor(null, 1)).toBeNull()
  })
})
