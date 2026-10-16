import { PLUGIN_KEY } from '../plugin-identity'

// Action type constants live in their own module so the pure reducer does not
// import the thunk module (and through it the host selectors).
export const NAVY_ACTIONS = {
  addShip: `@@${PLUGIN_KEY}@ws-add-ship`,
  applySync: `@@${PLUGIN_KEY}@ws-apply-sync`,
  create: `@@${PLUGIN_KEY}@ws-create`,
  delete: `@@${PLUGIN_KEY}@ws-delete`,
  moveShip: `@@${PLUGIN_KEY}@ws-move-ship`,
  redo: `@@${PLUGIN_KEY}@ws-redo`,
  removeShip: `@@${PLUGIN_KEY}@ws-remove-ship`,
  rename: `@@${PLUGIN_KEY}@ws-rename`,
  restore: `@@${PLUGIN_KEY}@ws-restore`,
  select: `@@${PLUGIN_KEY}@ws-select`,
  undo: `@@${PLUGIN_KEY}@ws-undo`,
} as const
