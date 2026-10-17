// Pure, framework-free helpers for the reference UI. Kept separate so they can
// be unit-tested without React and reused by the browser story assertions.

import type { ProjectedReference, ProjectedShip } from './catalog.ts'
import { isNavyReferenceError, REFERENCE_LIMITS } from './codec.ts'
import { buildSearch, type SearchEntry } from '../search'

/** i18n key for a decode failure; the UI passes it through `t`. */
export type ReferenceErrorMessageKey =
  | 'clipboardReadFailed'
  | 'exportFailed'
  | 'shareTextCopyFailed'
  | 'shareTextDamaged'
  | 'shareTextInvalid'
  | 'shareTextReadFailed'
  | 'shareTextSaveFailed'
  | 'shareTextTooLarge'
  | 'shareTextUnsupported'

/**
 * Maps a thrown value to a localized-message key. Unsupported versions/codecs
 * and unknown fields are distinct from damaged bytes, so the UI can be specific
 * without leaking internal error text.
 */
export const errorMessageKey = (
  error: unknown,
): ReferenceErrorMessageKey => {
  if (!isNavyReferenceError(error)) return 'shareTextInvalid'
  switch (error.code) {
    case 'INPUT_TOO_LARGE':
    case 'COMPRESSED_TOO_LARGE':
    case 'DECOMPRESSED_TOO_LARGE':
      return 'shareTextTooLarge'
    case 'UNSUPPORTED_VERSION':
    case 'UNSUPPORTED_SCHEMA_VERSION':
    case 'UNSUPPORTED_CODEC':
    case 'UNSUPPORTED_URL_ORIGIN':
      return 'shareTextUnsupported'
    case 'INVALID_BASE64':
    case 'NON_CANONICAL_BASE64':
    case 'DECOMPRESSION_FAILED':
    case 'INVALID_UTF8':
    case 'INVALID_JSON':
      return 'shareTextDamaged'
    default:
      return 'shareTextInvalid'
  }
}

/** Whether a file may be read at all, checked before reading (bounded decoder). */
export const inputWithinLimit = (size: number): boolean =>
  Number.isFinite(size) && size >= 0 && size <= REFERENCE_LIMITS.maxInputChars

/** Deterministic `.txt` name for a saved share code. */
export const shareFileName = (now: Date): string =>
  `navy-reference-${now.toISOString().replace(/[:.]/gu, '-')}.txt`

const normalizeQuery = (query: string): string => query.trim().toLowerCase()

/** Resolves a raw type key (e.g. `DD`) to its visible, localized label. */
export type TypeLabelResolver = (type: string) => string

/**
 * Filters a projection by search text (shared kana/romaji/fuzzy helper, one
 * index per call), recomputing counts and type totals. Rows are never
 * deduplicated: identical occurrences stay distinct.
 */
export const filterProjectedReference = (
  projected: ProjectedReference,
  query: string,
  resolveType?: TypeLabelResolver,
): ProjectedReference => {
  if (normalizeQuery(query).length === 0) return projected

  const keyOf = (groupIndex: number, shipIndex: number): string =>
    `${groupIndex}:${shipIndex}`
  const entries: SearchEntry[] = []
  projected.groups.forEach((group, groupIndex) => {
    group.ships.forEach((ship, shipIndex) => {
      entries.push({
        id: keyOf(groupIndex, shipIndex),
        name: ship.name,
        yomi: ship.yomi,
        romaji: ship.romaji,
        type: ship.type,
        typeLabel: ship.type
          ? resolveType
            ? resolveType(ship.type)
            : ship.type
          : '',
        level: ship.level,
        identifiers: [ship.masterId],
      })
    })
  })
  const matched = new Set(
    buildSearch(entries)(query).map((entry) => String(entry.id)),
  )

  let shipCount = 0
  let knownShipCount = 0
  const typeCounts = new Map<string | null, number>()
  const groups = projected.groups.map((group, groupIndex) => {
    const ships = group.ships.filter((_ship, shipIndex) =>
      matched.has(keyOf(groupIndex, shipIndex)),
    )
    for (const ship of ships) {
      shipCount += 1
      if (ship.known) knownShipCount += 1
      typeCounts.set(ship.type, (typeCounts.get(ship.type) ?? 0) + 1)
    }
    return { ...group, shipCount: ships.length, ships }
  })

  return {
    ...projected,
    groups,
    knownShipCount,
    shipCount,
    typeCounts: [...typeCounts].map(([type, count]) => ({ count, type })),
    unknownShipCount: shipCount - knownShipCount,
  }
}

export interface AreaShip extends ProjectedShip {
  /** Captured area the occurrence belongs to, so the grid keeps area identity. */
  readonly areaColor: string
  readonly areaLabel: string
}

export interface TypeGroup {
  readonly type: string | null
  readonly ships: ReadonlyArray<AreaShip>
}

/**
 * Flattens groups into type buckets for the grid view, preserving occurrences
 * and the owning area label/color so identical ships in different areas remain
 * distinguishable.
 */
export const groupShipsByType = (
  projected: ProjectedReference,
): TypeGroup[] => {
  const buckets = new Map<string | null, AreaShip[]>()
  for (const group of projected.groups) {
    for (const ship of group.ships) {
      const list = buckets.get(ship.type) ?? []
      list.push({ ...ship, areaColor: group.color, areaLabel: group.label })
      buckets.set(ship.type, list)
    }
  }
  return [...buckets].map(([type, ships]) => ({ ships, type }))
}

/**
 * A tiny request guard for one-shot async work (file reads). `begin` returns a
 * token; `invalidate` (close/replace) makes every outstanding token stale, so a
 * late resolution is ignored instead of reopening or overwriting newer state.
 */
export interface RequestGuard {
  begin: () => number
  invalidate: () => void
  isCurrent: (token: number) => boolean
}

export const createRequestGuard = (): RequestGuard => {
  let current = 0
  return {
    begin: () => {
      current += 1
      return current
    },
    invalidate: () => {
      current += 1
    },
    isCurrent: (token: number) => token === current,
  }
}
