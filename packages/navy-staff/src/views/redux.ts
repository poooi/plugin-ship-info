import { AnyAction, combineReducers } from 'redux'

import { ACTIONS } from './plugin-identity'
import { plannerReducer } from './planner/redux'

export { DATA_PATH, PLUGIN_KEY } from './plugin-identity'

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

export const reducer = combineReducers({
  error: errorReducer,
  planner: plannerReducer,
  ready: readyReducer,
})
