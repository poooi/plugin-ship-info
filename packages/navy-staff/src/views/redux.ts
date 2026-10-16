import { AnyAction, combineReducers } from 'redux'

import { ACTIONS } from './plugin-identity'
import { NAVY_ACTIONS } from './workspace/action-types'
import { navyReducer } from './workspace/reducer'

export { PLUGIN_KEY } from './plugin-identity'
export { navyReducer } from './workspace/reducer'

const readyReducer = (state = false, action: AnyAction) => {
  if (action.type === ACTIONS.ready) {
    return true
  }
  if (action.type === ACTIONS.loadStart) {
    return false
  }
  return state
}

// Transient load-status marker. It is never persisted: the persistence layer
// strips it before writing and only writes after a successful load.
const errorReducer = (state: string | null = null, action: AnyAction) => {
  if (action.type === ACTIONS.loadStart) {
    return null
  }
  if (action.type === ACTIONS.loadError) {
    return typeof action.error === 'string' ? action.error : 'load'
  }
  return state
}

// Transient loaded-account marker. Never persisted: the persistence layer
// strips it before writing. It is set atomically by a loadStart that carries an
// `account` property; the engine's plain loadStart preserves it.
const accountReducer = (state: string | null = null, action: AnyAction) => {
  if (action.type === ACTIONS.loadStart && 'account' in action) {
    return typeof action.account === 'string' && action.account.length > 0
      ? action.account
      : null
  }
  return state
}

// Only durable workspace data lives in `navy`. Transient view state (history
// previews, references, dialogs, search, tabs) stays out of the observed slice.
const combined = combineReducers({
  account: accountReducer,
  error: errorReducer,
  navy: navyReducer,
  ready: readyReducer,
})

type NavySlice = ReturnType<typeof combined>

// The durable apply-sync action carries the loaded account it was prepared for.
// A raced account switch, or a same-account reload that is not ready yet, is
// rejected here before the navy slice can append; the navy reducer separately
// guards the base revision.
export const reducer = (
  state: NavySlice | undefined,
  action: AnyAction,
): NavySlice => {
  if (
    action.type === NAVY_ACTIONS.applySync &&
    state !== undefined &&
    (!state.ready || state.account !== action.accountId)
  ) {
    return state
  }
  return combined(state, action)
}
