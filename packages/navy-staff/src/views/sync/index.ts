// Navy Staff manual-sync module: pure core, host capture, actions, and toolbar.

export {
  SyncBar,
  SyncTools,
  type SyncMode,
  type SyncOperation,
  type SyncToolsProps,
} from './SyncTools'

export { commitSyncBatch, newSyncAreaId } from './actions'

export {
  captureHostSource,
  captureRoster,
  slotFromSallyArea,
  type HostRosterShipView,
  type HostShiptagView,
} from './capture'

export {
  addedAreaSources,
  areaUpdateDiffs,
  defaultSlotSelection,
  findAreaIdForShip,
  NO_MAPPING,
  STALE_MESSAGE_KEYS,
  syncErrorMessageKey,
  toMapping,
  type AreaUpdateDiff,
  type FleetLabelChange,
  type SlotSelection,
} from './logic'

export {
  selectedSyncWorkspaceSelector,
  syncRosterSelector,
  syncSourceSelector,
} from './selectors'

export {
  acceptAreaSync,
  acceptTagSync,
  areaSyncFreshness,
  isSyncError,
  prepareAreaSync,
  prepareTagSync,
  SyncError,
  tagSyncFreshness,
  type AreaSyncCurrent,
  type AreaSyncOperation,
  type AreaSyncSummary,
  type PreparedAreaSync,
  type PreparedTagSync,
  type RosterSample,
  type RosterShip,
  type SlotMappingInput,
  type SyncAcceptance,
  type SyncFreshness,
  type SyncSourceArea,
  type SyncSourceSnapshot,
  type SyncStaleReason,
  type SyncWorkspaceSnapshot,
  type TagSyncCurrent,
  type TagSyncOperation,
  type TagSyncSummary,
} from './core'
