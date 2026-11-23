import { get } from 'lodash'
import { z } from 'zod'

// Older releases stored "unrestricted" as maxLevel 450. Keep reading that
// value as unrestricted so existing config and bookmarks never cap a roster
// that has grown past it.
export const LEGACY_UNBOUNDED_MAX_LEVEL = 450

export const levelValueSchema = z.number().int().min(0)

export interface StoredLevelRange {
  maxLevel?: number
  minLevel: number
}

export const defaultLevelFilters: StoredLevelRange = { minLevel: 0 }

/** Normalize a stored filter object, dropping an absent or legacy maximum. */
export function normalizeLevelFilters(value: unknown): StoredLevelRange {
  const source =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {}
  const minLevel = levelValueSchema.safeParse(source.minLevel)
  const result: StoredLevelRange = {
    minLevel: minLevel.success ? minLevel.data : defaultLevelFilters.minLevel,
  }

  const maxLevel = levelValueSchema.safeParse(source.maxLevel)
  if (maxLevel.success && maxLevel.data !== LEGACY_UNBOUNDED_MAX_LEVEL) {
    result.maxLevel = maxLevel.data
  }
  return result
}

/** Read the level filters from the plugin config, normalizing legacy shapes. */
export function readStoredLevelRange(config: any): StoredLevelRange {
  return normalizeLevelFilters(get(config, 'plugin.ShipInfo.filters'))
}
