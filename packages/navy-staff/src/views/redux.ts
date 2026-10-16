import { AnyAction, combineReducers } from 'redux'

import { ACTIONS } from './plugin-identity'
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
export const reducer = combineReducers({
  account: accountReducer,
  error: errorReducer,
  navy: navyReducer,
  ready: readyReducer,
})
