// Reference export capture.
//
// It consumes the workspace display boundary (`DisplayContent`) and produces a
// `DecodedReference`. It is deliberately pure: it never reads the host store,
// never dispatches, never persists, and never creates an editable workspace.
//
// The caller chooses the display, which also encodes the account gating:
//   current export   -> `editingDisplayContentSelector`, which overlays live
//                       data only when `liveRosterAvailableSelector` holds (the
//                       ready account file matches the host and the roster has
//                       loaded), plus a raw owned-value overlay (`rawShips`) so a
//                       live ship with missing master metadata still exports its
//                       raw master ID and level. Values are frozen once.
//   historical export -> `capturedDisplayContent(revision.content)`, saved
//                       records only (no raw overlay).
//
// The reference carries only title, capture/export times, locale, and ordered
// `[label, color, [[masterId, level], ...]]` groups. Owned-game IDs, account
// IDs, paths, images, history, and unassigned roster never enter it.

import {
  REFERENCE_SCHEMA_VERSION,
  type DecodedReference,
} from './types.ts'
import type {
  DisplayContent,
  WorkspaceAreaView,
} from '../workspace/display'

export interface RawShipValue {
  masterId: number | null
  level: number | null
}

export interface CaptureReferenceOptions {
  /** The revision/snapshot time the captured content describes. */
  captureTime: string
  /** Export time (ISO string), supplied by the caller. */
  exportTime: string
  locale: string
  displayFleetName: boolean
  /** Title; defaults to the display content's workspace name. */
  title?: string
  /**
   * Current-export raw owned values keyed by owned ID (`api_ship_id`/`api_lv`),
   * supplied only when the loaded account matches the host and the roster has
   * loaded. These overlay the row regardless of master metadata, so a live ship
   * with missing master data still exports its raw master ID and level. Omit for
   * a historical export, which keeps the captured values.
   */
  rawShips?: ReadonlyMap<number, RawShipValue>
}

const resolveGroupLabel = (
  area: WorkspaceAreaView,
  locale: string,
  displayFleetName: boolean,
): string => {
  if (!displayFleetName) return area.label
  const localized = area.fleetLabels[locale]
  return localized && localized.length > 0 ? localized : area.label
}

/**
 * Captures one display content snapshot as a reference. The caller passes the
 * already-gated display (editing for a current export, captured-only for a
 * historical export), so this helper stays a pure projection.
 */
export const captureReference = (
  display: DisplayContent,
  options: CaptureReferenceOptions,
): DecodedReference => ({
  captureTime: options.captureTime,
  exportTime: options.exportTime,
  groups: display.areas.map((area) => ({
    color: area.color,
    label: resolveGroupLabel(area, options.locale, options.displayFleetName),
    // One row per occurrence: order and duplicates are preserved, and unknown
    // master/level values stay null.
    ships: area.ships.map((ship) => {
      const raw = options.rawShips?.get(ship.ownedId)
      return {
        level: raw ? raw.level : ship.level,
        masterId: raw ? raw.masterId : ship.masterId,
      }
    }),
  })),
  locale: options.locale,
  schemaVersion: REFERENCE_SCHEMA_VERSION,
  title: options.title ?? display.name,
})
