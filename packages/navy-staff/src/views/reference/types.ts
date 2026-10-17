// Navy Staff read-only reference data contract.
//
// This is the *compact* reference projection, not the editable workspace. It
// deliberately carries only assignments, forms, levels, and area labels. It must
// never carry owned-game ship IDs, owner/account identifiers, local file paths,
// operation history, screenshots, or the opaque legacy archive.
//
// One exact current schema version covers both the wire format and the meaning
// of master IDs. Older and newer versions are rejected. When master IDs are
// remapped, bump this version rather than adding a compatibility path. Missing
// master metadata is valid at this version: the row keeps its master ID/level and
// the reader shows a `???` fallback.
//
// Characters in `t`, `l`, `g[][0]` (label) are plain display strings. They are
// never interpreted as markup or paths; the reader must render them as text.

/** Exact current reference schema version. Bump only on a format/master-ID change. */
export const REFERENCE_SCHEMA_VERSION = 1

/**
 * A master record/form identifier. `null` marks a migrated row whose master ID
 * could not be recovered; the reader must never substitute an owned-game ID.
 */
export type ReferenceMasterId = number | null

/** A ship level. `null` marks an unknown level in a migrated row. */
export type ReferenceLevel = number | null

/**
 * One ship occurrence: `[masterId, level]`. Rows are ordered occurrences, so
 * two identical tuples are two distinct ships and must not be deduplicated.
 */
export type ReferenceRow = readonly [ReferenceMasterId, ReferenceLevel]

/** One captured area: `[label, color, rows]`, where color is `#RRGGBB`. */
export type ReferenceGroupTuple = readonly [
  label: string,
  color: string,
  rows: readonly ReferenceRow[],
]

/**
 * Serialized schema v1 shape:
 * `{ v:1, t:title, c:captureTime, e:exportTime, l:locale, g:[[label,color,[[masterId,level],...]],...] }`
 */
export interface SerializedReferenceV1 {
  readonly v: typeof REFERENCE_SCHEMA_VERSION
  readonly t: string
  readonly c: string
  readonly e: string
  readonly l: string
  readonly g: readonly ReferenceGroupTuple[]
}

/** A single decoded ship occurrence. */
export interface DecodedReferenceShip {
  readonly masterId: number | null
  readonly level: number | null
}

/** A decoded captured area with its ordered occurrences. */
export interface DecodedReferenceGroup {
  readonly label: string
  readonly color: string
  readonly ships: readonly DecodedReferenceShip[]
}

/** Typed, validated reference data returned by the decoder. */
export interface DecodedReference {
  readonly schemaVersion: typeof REFERENCE_SCHEMA_VERSION
  readonly title: string
  readonly captureTime: string
  readonly exportTime: string
  readonly locale: string
  readonly groups: readonly DecodedReferenceGroup[]
}
