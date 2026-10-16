import { omit } from 'lodash'
import { AnyAction, combineReducers } from 'redux'

import { ACTIONS, PLUGIN_KEY } from './plugin-identity'

export { DATA_PATH, PLUGIN_KEY } from './plugin-identity'

let bookmarkInitState = {}

const uiInitState = {
  activeDropdown: '',
  isExtend: true,
  toTop: true,
}

try {
  const initState = JSON.parse(localStorage.getItem(PLUGIN_KEY)!) || {}
  bookmarkInitState = initState
} catch (e) {
  console.error(e instanceof Error ? e.stack : e)
}

const bookmarkReducer = (state = bookmarkInitState, action: AnyAction) => {
  const { type, bookmark, settings, data } = action
  switch (type) {
    case '@@poi-plugin-ship-info@update':
      return {
        ...state,
        [bookmark]: {
          ...omit(settings, 'shipTypeChecked'),
          name: bookmark,
        },
      }
    case '@@poi-plugin-ship-info@delete': {
      return omit(state, bookmark)
    }
    case '@@poi-plugin-ship-info@init': {
      return {
        ...state,
        ...data.bookmark,
      }
    }
    default:
      return state
  }
}

const uiReducer = (state = uiInitState, action: AnyAction) => {
  const { isExtend, type, toTop, activeDropdown } = action
  if (type === `@@${PLUGIN_KEY}@scroll`) {
    return {
      ...state,
      toTop,
    }
  }
  if (type === `@@${PLUGIN_KEY}@active-dropdown`) {
    return {
      ...state,
      activeDropdown:
        activeDropdown === state.activeDropdown ? '' : activeDropdown,
    }
  }
  if (type === `@@${PLUGIN_KEY}@extend`) {
    return {
      ...state,
      isExtend,
    }
  }
  return state
}

const readyReducer = (state = false, action: AnyAction) => {
  const { type } = action
  if (type === ACTIONS.ready) {
    return true
  }
  if (type === ACTIONS.loadStart) {
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
  bookmark: bookmarkReducer,
  error: errorReducer,
  ready: readyReducer,
  ui: uiReducer,
})

export const onLoadData = ({ data }: { data: any }) => ({
  data,
  type: `@@${PLUGIN_KEY}@loadData`,
})

// actions
export const onUpdate = ({
  bookmark,
  settings,
}: {
  bookmark: string
  settings: any
}) => ({
  bookmark,
  settings,
  type: '@@poi-plugin-ship-info@update',
})

export const onDelete = ({ bookmark }: { bookmark: string }) => ({
  bookmark,
  type: '@@poi-plugin-ship-info@delete',
})
