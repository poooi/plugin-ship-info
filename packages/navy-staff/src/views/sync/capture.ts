// Host capture helpers. They read already-selected host values (the `fcd.shiptag`
// view and the active per-account roster) rather than global state, so they stay
// testable; ./selectors feeds them from poi state.

import { NAVY_DEFAULT_AREA_COLOR } from '../workspace/types'
import type { RosterSample, RosterShip, SyncSourceArea, SyncSourceSnapshot } from './core'

/** The subset of `fcd.shiptag` the capture needs. */
export interface HostShiptagView {
  color?: readonly string[]
  fleetname?: Readonly<Record<string, readonly string[]>>
  mapname?: readonly string[]
}

/** One live roster row, already resolved by the integration selector. */
export interface HostRosterShipView {
  level: number | null
  masterId: number | null
  name: string | null
  ownedId: number
  /** Sortie-tag slot the ship currently carries, or null when untagged. */
  tagSlot: number | null
  typeId: number | null
  typeLabel: string | null
}

/**
 * Builds a source snapshot from the host shiptag arrays. Returns null when the
 * host data is unloaded/empty, so an empty source never clears a workspace.
 */
export const captureHostSource = (
  shiptag: HostShiptagView | null | undefined,
  sourceId: string | null = null,
): SyncSourceSnapshot | null => {
  const mapname = shiptag?.mapname
  if (!Array.isArray(mapname) || mapname.length === 0) return null

  const areas: SyncSourceArea[] = mapname.map((rawLabel, slot) => {
    const fleetLabels: Record<string, string> = {}
    for (const [locale, labels] of Object.entries(shiptag?.fleetname ?? {})) {
      const value = Array.isArray(labels) ? labels[slot] : undefined
      if (typeof value === 'string' && value.length > 0) fleetLabels[locale] = value
    }
    const color = shiptag?.color?.[slot]
    return {
      color:
        typeof color === 'string' && color.length > 0 ? color : NAVY_DEFAULT_AREA_COLOR,
      fleetLabels,
      label:
        typeof rawLabel === 'string' && rawLabel.length > 0
          ? rawLabel
          : `Area ${slot + 1}`,
      slot,
    }
  })

  return { areas, sourceId }
}

/**
 * Maps a host sortie-tag value to a source slot index. `api_sally_area` is
 * 1-based, with 0/absent meaning untagged; the design's slots are 0-based array
 * indices, so the tagged slot is `value - 1`.
 */
export const slotFromSallyArea = (value: unknown): number | null =>
  typeof value === 'number' && Number.isInteger(value) && value >= 1
    ? value - 1
    : null

/**
 * Builds a roster sample for the active loaded account. Returns null when no
 * account is loaded or the roster is empty. `accountId` is the loaded
 * account-file id; equality with the workspace snapshot is session freshness.
 */
export const captureRoster = (
  accountId: string | null,
  ships: readonly HostRosterShipView[],
): RosterSample | null => {
  if (accountId === null || ships.length === 0) return null
  const rows: RosterShip[] = ships.map((ship) => ({
    level: ship.level,
    masterId: ship.masterId,
    name: ship.name,
    ownedId: ship.ownedId,
    tagSlot: ship.tagSlot,
    typeId: ship.typeId,
    typeLabel: ship.typeLabel,
  }))
  return { accountId, ships: rows }
}
