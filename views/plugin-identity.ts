import path from 'path'

// Plugin identity shared by the reducers and the persistence lifecycle. Kept in
// its own module so neither side has to import the other.

export const PLUGIN_KEY = 'poi-plugin-ship-info'

const { APPDATA_PATH } = window

export const DATA_PATH = path.join(APPDATA_PATH, `${PLUGIN_KEY}.json`)

export const ACTIONS = {
  init: `@@${PLUGIN_KEY}@init`,
  loadError: `@@${PLUGIN_KEY}@load-error`,
  // Dispatched when a load begins: clears any previous error and disables
  // saving until this load resolves.
  loadStart: `@@${PLUGIN_KEY}@load-start`,
  ready: `@@${PLUGIN_KEY}@ready`,
} as const
