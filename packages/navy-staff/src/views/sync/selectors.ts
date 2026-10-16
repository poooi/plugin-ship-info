// Sync selectors. They derive the frozen workspace snapshot and the captured
// host source/roster from Redux state, so acceptance always compares against
// current state rather than stale rendered props.
//
// The roster candidate set is built from the raw owned ships (`info.ships`), not
// from the enriched ship-menu selector, so an owned ship whose master metadata is
// missing still contributes its owned ID and sortie tag. Missing display fields
// stay nullable; the raw `api_ship_id` remains a known master ID.

import { get } from 'lodash'
import { createSelector } from 'reselect'

import { APIShip } from 'kcsapi/api_port/port/response'
import { APIMstShip } from 'kcsapi/api_start2/getData/response'

import { shipTypeLabelKeys } from '@poi-plugins/ship-info-shared/ship-types'
import type { IState } from 'views/utils/selectors'

import { contentAtCursor } from '../workspace/operations'
import {
  liveRosterAvailableSelector,
  loadedAccountIdSelector,
  selectedWorkspaceSelector,
} from '../workspace/selectors'
import {
  captureHostSource,
  captureRoster,
  slotFromSallyArea,
  type HostRosterShipView,
  type HostShiptagView,
} from './capture'
import type { RosterSample, SyncSourceSnapshot, SyncWorkspaceSnapshot } from './core'

export const selectedSyncWorkspaceSelector = createSelector(
  [selectedWorkspaceSelector, loadedAccountIdSelector],
  (workspace, accountId): SyncWorkspaceSnapshot | null =>
    // Require a loaded account: a not-ready or unloaded file must never prepare
    // or commit against stale navy data.
    workspace && accountId !== null
      ? {
          accountId,
          content: contentAtCursor(workspace),
          revisionId: workspace.revisions[workspace.cursor].id,
          workspaceId: workspace.id,
        }
      : null,
)

const shiptagSelector = (state: IState): HostShiptagView | null =>
  (get(state, 'fcd.shiptag', null) as HostShiptagView | null) ?? null

// Transient source generation. A distinct host `fcd.shiptag` reference (a
// replaced source/session) gets a new id, so an open confirmation is invalidated
// even when the replacement contents are identical. This is not a persisted
// event id and never establishes continuity; an unloaded source is null.
const sourceGenerations = new WeakMap<object, number>()
let sourceGenerationSeq = 0
const sourceIdOf = (shiptag: object): string => {
  const existing = sourceGenerations.get(shiptag)
  if (existing !== undefined) return `shiptag-${existing}`
  sourceGenerationSeq += 1
  sourceGenerations.set(shiptag, sourceGenerationSeq)
  return `shiptag-${sourceGenerationSeq}`
}

export const syncSourceSelector = createSelector(
  [shiptagSelector],
  (shiptag): SyncSourceSnapshot | null =>
    shiptag ? captureHostSource(shiptag, sourceIdOf(shiptag)) : null,
)

const ownedShipsSelector = (state: IState): Record<string, APIShip> => {
  const ships = get(state, 'info.ships') as unknown
  return ships && typeof ships === 'object' ? (ships as Record<string, APIShip>) : {}
}

const mastersSelector = (state: IState): Record<string, APIMstShip> => {
  const masters = get(state, ['const', '$ships']) as unknown
  return masters && typeof masters === 'object'
    ? (masters as Record<string, APIMstShip>)
    : {}
}

const rosterRow = (raw: APIShip, masters: Record<string, APIMstShip>): HostRosterShipView => {
  const masterId = Number.isInteger(raw.api_ship_id) ? raw.api_ship_id : null
  const master = masterId !== null ? masters[String(masterId)] : undefined
  const typeId = master && Number.isInteger(master.api_stype) ? master.api_stype : null
  return {
    level: Number.isInteger(raw.api_lv) ? raw.api_lv : null,
    masterId,
    name: master && typeof master.api_name === 'string' ? master.api_name : null,
    ownedId: raw.api_id,
    tagSlot: slotFromSallyArea(raw.api_sally_area),
    typeId,
    typeLabel: typeId !== null ? shipTypeLabelKeys[typeId] ?? null : null,
  }
}

export const syncRosterSelector = createSelector(
  [loadedAccountIdSelector, liveRosterAvailableSelector, ownedShipsSelector, mastersSelector],
  (accountId, available, ships, masters): RosterSample | null => {
    if (!available) return null
    const rows = Object.values(ships)
      .filter((raw) => Number.isInteger(raw.api_id))
      .map((raw) => rosterRow(raw, masters))
    return captureRoster(accountId, rows)
  },
)
