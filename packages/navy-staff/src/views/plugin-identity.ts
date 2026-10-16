import path from 'path'

// Navy Staff owns its own plugin key, action namespace, saved file and config
// paths. It reads (but never writes) the legacy Ship Info file for migration.

export const PLUGIN_KEY = 'poi-plugin-navy-staff'

const { APPDATA_PATH } = window

export const LEGACY_DATA_PATH = path.join(
  APPDATA_PATH,
  'poi-plugin-ship-info.json',
)

export const ACTIONS = {
  init: `@@${PLUGIN_KEY}@init`,
  loadError: `@@${PLUGIN_KEY}@load-error`,
  // Dispatched when a load begins: clears any previous error, resets readiness,
  // and (when the action carries `account`) sets the transient loaded-account
  // marker atomically. The engine's own plain loadStart preserves the marker.
  loadStart: `@@${PLUGIN_KEY}@load-start`,
  ready: `@@${PLUGIN_KEY}@ready`,
} as const

export const DISPLAY_FLEET_NAME_CONFIG = 'plugin.NavyStaff.displayFleetName'
export const LEGACY_DISPLAY_FLEET_NAME_CONFIG =
  'plugin.ShipInfo.displayFleetName'
