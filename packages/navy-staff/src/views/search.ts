// Shared ship search: one normalized Fuse index per data set, real wanakana
// normalization (hiragana/katakana/halfwidth/case), romaji readings, fuzzy
// typos, and exact identifier queries. Callers build the index once (useMemo),
// never per row.

import Fuse from 'fuse.js'
import { toHiragana, toRomaji } from 'wanakana'

export interface SearchEntry {
  /** Stable identity (owned id, occurrence key, ...). */
  id: number | string
  name: string
  /** Additional visible names (e.g. a localized resource label). */
  aliases?: readonly string[]
  yomi?: string | null
  romaji?: string | null
  /** Raw type key (e.g. `DD`). */
  type?: string | null
  /** Visible localized type label. */
  typeLabel?: string | null
  level?: number | null
  /** Exact identifiers: owned id, master id, ... */
  identifiers?: readonly (number | string | null)[]
}

export type SearchFunction = (query: string) => SearchEntry[]

/** NFKC (halfwidth -> fullwidth), katakana -> hiragana, lowercase, collapsed space.
 *  `passRomaji` keeps Latin/romaji text intact so romaji queries stay matchable. */
export const normalizeSearchText = (value: string): string => {
  try {
    return toHiragana(value.normalize('NFKC'), { passRomaji: true })
      .toLowerCase()
      .replace(/\s+/gu, ' ')
      .trim()
  } catch {
    return value.toLowerCase().trim()
  }
}

/** Romaji for a kana reading; empty when the value is not kana. */
export const readingToRomaji = (yomi: string): string => {
  try {
    return toRomaji(yomi)
  } catch {
    return ''
  }
}

export interface MasterReading {
  name: string
  yomi: string
  romaji: string
}

/**
 * Builds name/reading lookups from the current host master data only. Nothing is
 * bundled or persisted; unknown masters simply have no entry.
 */
export const buildMasterReadings = (
  $ships: Record<string, { api_name?: unknown; api_yomi?: unknown }> | undefined,
): Map<number, MasterReading> => {
  const readings = new Map<number, MasterReading>()
  if (!$ships) return readings
  for (const key of Object.keys($ships)) {
    const id = Number(key)
    const ship = $ships[key]
    if (!Number.isInteger(id) || !ship) continue
    const yomi = typeof ship.api_yomi === 'string' ? ship.api_yomi : ''
    readings.set(id, {
      name: typeof ship.api_name === 'string' ? ship.api_name : '',
      romaji: readingToRomaji(yomi),
      yomi,
    })
  }
  return readings
}

const identifierPattern = /^#?\d+$/u

/**
 * Indexes entries once and returns a search function. A pure numeric query is an
 * exact identifier (owned/master id or level); everything else is normalized
 * kana/romaji/name/type fuzzy matching.
 */
export const buildSearch = (entries: readonly SearchEntry[]): SearchFunction => {
  const prepared = entries.map((entry) => ({
    entry,
    aliases: (entry.aliases ?? []).map(normalizeSearchText).join(' '),
    name: normalizeSearchText(entry.name),
    romaji: normalizeSearchText(entry.romaji ?? ''),
    type: normalizeSearchText(entry.type ?? ''),
    typeLabel: normalizeSearchText(entry.typeLabel ?? ''),
    yomi: normalizeSearchText(entry.yomi ?? ''),
  }))
  const fuse = new Fuse(prepared, {
    ignoreLocation: true,
    includeScore: true,
    keys: ['name', 'aliases', 'yomi', 'romaji', 'type', 'typeLabel'],
    minMatchCharLength: 1,
    shouldSort: true,
    threshold: 0.4,
  })

  return (query: string) => {
    const raw = query.trim()
    if (raw.length === 0) return [...entries]

    if (identifierPattern.test(raw)) {
      const digits = raw.replace(/^#/u, '')
      return prepared
        .filter(({ entry }) => {
          if (String(entry.level ?? '') === digits) return true
          return (entry.identifiers ?? []).some(
            (identifier) => identifier !== null && String(identifier) === digits,
          )
        })
        .map(({ entry }) => entry)
    }

    const normalized = normalizeSearchText(raw)
    if (normalized.length === 0) return [...entries]
    return fuse.search(normalized).map((result) => result.item.entry)
  }
}
