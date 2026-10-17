// Pure display projection for read-only references.
//
// Master names and types are supplied by the caller from the current poi Redux
// store (the plugin's live master data); this module bundles no catalog and
// performs no host or network access. A null master ID or an ID absent from the
// supplied masters resolves to the `???` fallback (the raw master ID and level
// are still shown). The projection only groups and counts already-decoded rows
// and never mutates them.

import type { DecodedReference } from './types.ts'

/** The minimal master fields a reference row needs to display and search. */
export interface ReferenceMaster {
  readonly name: string
  readonly type: string
  /** Kana reading from the current host master data, when present. */
  readonly yomi?: string
  /** Romaji derived from `yomi` at read time; never stored in the reference. */
  readonly romaji?: string
}

/** Caller-supplied lookup of the current masters, keyed by master ID. */
export type MasterCatalog = ReadonlyMap<number, ReferenceMaster>

/**
 * Primary-name fallback for a row whose master metadata is missing (a null
 * master ID, or a master ID absent from the supplied masters). The row stays
 * valid: its master ID and level are preserved and the shared protocol version
 * is unchanged. Display only; never fetched or stored.
 */
export const UNKNOWN_SHIP_NAME = '???'

export interface ResolvedShip {
  /** Display name: master name, or `???` when the metadata is missing. */
  readonly name: string
  /** Type label, or null when the master metadata is missing. */
  readonly type: string | null
  /** Kana reading from the current masters ('' when missing/unknown). */
  readonly yomi: string
  /** Romaji reading derived from `yomi` ('' when missing/unknown). */
  readonly romaji: string
  /** True only when the master ID resolved from the supplied masters. */
  readonly known: boolean
}

/** Resolves a row's display name/type without ever guessing or fetching. */
export const resolveShip = (
  masterId: number | null,
  masters: MasterCatalog,
): ResolvedShip => {
  if (masterId === null) {
    return { name: UNKNOWN_SHIP_NAME, type: null, known: false, romaji: '', yomi: '' }
  }
  const master = masters.get(masterId)
  if (master === undefined) {
    return { name: UNKNOWN_SHIP_NAME, type: null, known: false, romaji: '', yomi: '' }
  }
  return {
    name: master.name,
    type: master.type,
    known: true,
    romaji: master.romaji ?? '',
    yomi: master.yomi ?? '',
  }
}

export interface ProjectedShip {
  readonly masterId: number | null
  readonly level: number | null
  readonly name: string
  readonly type: string | null
  /** Search-only readings from the current masters; '' when unknown. */
  readonly yomi: string
  readonly romaji: string
  readonly known: boolean
}

export interface ProjectedGroup {
  readonly label: string
  readonly color: string
  readonly ships: readonly ProjectedShip[]
  readonly shipCount: number
}

export interface ReferenceTypeCount {
  readonly type: string | null
  readonly count: number
}

export interface ProjectedReference {
  readonly title: string
  readonly captureTime: string
  readonly exportTime: string
  readonly locale: string
  readonly groups: readonly ProjectedGroup[]
  readonly groupCount: number
  readonly shipCount: number
  readonly knownShipCount: number
  readonly unknownShipCount: number
  /** Type counts in first-seen order; null is the unknown-type bucket. */
  readonly typeCounts: readonly ReferenceTypeCount[]
}

/**
 * Projects a decoded reference into display groups and counts using the supplied
 * current masters. Duplicate rows are preserved and counted individually. Type
 * counts are ordered by first appearance so the UI is deterministic.
 */
export const projectReference = (
  reference: DecodedReference,
  masters: MasterCatalog,
): ProjectedReference => {
  let shipCount = 0
  let knownShipCount = 0
  const typeCounts = new Map<string | null, number>()
  const groups: ProjectedGroup[] = []

  for (const group of reference.groups) {
    const ships: ProjectedShip[] = []
    for (const ship of group.ships) {
      const resolved = resolveShip(ship.masterId, masters)
      ships.push({
        masterId: ship.masterId,
        level: ship.level,
        name: resolved.name,
        type: resolved.type,
        known: resolved.known,
        romaji: resolved.romaji,
        yomi: resolved.yomi,
      })
      shipCount += 1
      if (resolved.known) knownShipCount += 1
      typeCounts.set(resolved.type, (typeCounts.get(resolved.type) ?? 0) + 1)
    }
    groups.push({
      label: group.label,
      color: group.color,
      ships,
      shipCount: ships.length,
    })
  }

  return {
    title: reference.title,
    captureTime: reference.captureTime,
    exportTime: reference.exportTime,
    locale: reference.locale,
    groups,
    groupCount: groups.length,
    shipCount,
    knownShipCount,
    unknownShipCount: shipCount - knownShipCount,
    typeCounts: [...typeCounts].map(([type, count]) => ({ type, count })),
  }
}
