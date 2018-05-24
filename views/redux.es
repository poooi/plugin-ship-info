import { observer } from 'redux-observers'
import { omit, get } from 'lodash'
import { combineReducers } from 'redux'
import path from 'path'
import { promisify } from 'bluebird'
import { readJson } from 'fs-extra'

import { extensionSelectorFactory } from 'views/utils/selectors'

import FileWriter from './file-writer'

export const PLUGIN_KEY = 'poi-plugin-ship-info'

const { APPDATA_PATH } = window

export const DATA_PATH = path.join(APPDATA_PATH, `${PLUGIN_KEY}.json`)

let bookmarkInitState = {}

const plannerInitState = {
  current: [],
  archive: {},
}

const uiInitState = {
  toTop: true,
  activeDropdown: '',
  isExtend: true,
}

try {
  const initState = JSON.parse(localStorage.getItem(PLUGIN_KEY)) || {}
  bookmarkInitState = initState
} catch (e) {
  console.error(e.stack)
}

const bookmarkReducer = (state = bookmarkInitState, action) => {
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

// current: [[ship ids in the area ] for area in fcd ] current deck planner's profile,
// it depends on the fcd name, so only ship ids are stored
// TODO dpBookmarks: historical data, we must make sure it is independent of fcd
// {
//   name: 'example',
//   areas: [
//     {
//       name: 'E1',
//       color: '#0099ff',
//       ships: [1, 2, 3]
//     }
//   ]
// }

const plannerReducer = (state = plannerInitState, action) => {
  const {
    type,
    mapname,
    shipId,
    areaIndex,
    fromAreaIndex,
    toAreaIndex,
    data,
  } = action
  const { current } = state
  switch (type) {
    case `@@${PLUGIN_KEY}@init`: {
      return {
        ...state,
        ...data.planner,
      }
    }
    case `@@${PLUGIN_KEY}@dp-init`: {
      if (current.length < mapname.length) {
        const len = mapname.length - current.length
        return {
          ...state,
          current: [...current, ...new Array(len).fill([])],
        }
      } else if (current.length > mapname.length) {
        const newCurrent = current.slice(0, mapname.length)
        return {
          ...state,
          current: newCurrent,
        }
      }
      break
    }
    case `@@${PLUGIN_KEY}@dp-addShip`: {
      const newCurrent = current.slice()
      if (!newCurrent[areaIndex].includes(shipId)) {
        newCurrent[areaIndex] = [...newCurrent[areaIndex], shipId]
        return {
          ...state,
          current: newCurrent,
        }
      }
      break
    }
    case `@@${PLUGIN_KEY}@dp-removeship`: {
      const newCurrent = current.slice()
      if (newCurrent[areaIndex].includes(shipId)) {
        newCurrent[areaIndex] = newCurrent[areaIndex].filter(
          id => id !== shipId,
        )
        return {
          ...state,
          current: newCurrent,
        }
      }
      break
    }
    case `@@${PLUGIN_KEY}@dp-displaceShip`: {
      const newCurrent = current.slice()
      if (newCurrent[fromAreaIndex].includes(shipId)) {
        newCurrent[fromAreaIndex] = newCurrent[fromAreaIndex].filter(
          id => id !== shipId,
        )
        newCurrent[toAreaIndex] = [...newCurrent[toAreaIndex], shipId]
        return {
          ...state,
          current: newCurrent,
        }
      }
      break
    }
    default:
      return state
  }
  return state
}

const uiReducer = (state = uiInitState, action) => {
  const { isExtend, type, toTop, activeDropdown } = action
  if (type === `@@${PLUGIN_KEY}@scroll`) {
    return {
      ...state,
      toTop,
    }
  } else if (type === `@@${PLUGIN_KEY}@active-dropdown`) {
    return {
      ...state,
      activeDropdown:
        activeDropdown === state.activeDropdown ? '' : activeDropdown,
    }
  } else if (type === `@@${PLUGIN_KEY}@extend`) {
    return {
      ...state,
      isExtend,
    }
  }
  return state
}

const readyReducer = (state = false, action) => {
  const { type } = action
  if (type === `@@${PLUGIN_KEY}@ready`) {
    return true
  }
  return state
}

export const reducer = combineReducers({
  bookmark: bookmarkReducer,
  planner: plannerReducer,
  ui: uiReducer,
  ready: readyReducer,
})

export const onDPInit = ({ color, mapname }) => ({
  type: `@@${PLUGIN_KEY}@dp-init`,
  color,
  mapname,
})

export const onAddShip = ({ shipId, areaIndex }) => ({
  type: `@@${PLUGIN_KEY}@dp-addShip`,
  shipId,
  areaIndex,
})

export const onRemoveShip = ({ shipId, areaIndex }) => ({
  type: `@@${PLUGIN_KEY}@dp-removeship`,
  shipId,
  areaIndex,
})

export const onDisplaceShip = ({ shipId, fromAreaIndex, toAreaIndex }) => ({
  type: `@@${PLUGIN_KEY}@dp-displaceShip`,
  shipId,
  fromAreaIndex,
  toAreaIndex,
})

export const onLoadData = ({ data }) => ({
  type: `@@${PLUGIN_KEY}@loadData`,
  data,
})

// actions
export const onUpdate = ({ bookmark, settings }) => ({
  type: '@@poi-plugin-ship-info@update',
  bookmark,
  settings,
})

export const onDelete = ({ bookmark }) => ({
  type: '@@poi-plugin-ship-info@delete',
  bookmark,
})

export const initStore = async (dispatch, getState) => {
  try {
    const data = await promisify(readJson)(DATA_PATH)

    const mapname = get(getState(), 'fcd.shbiptag.mapname', [])

    const { planner = [] } = data

    if (planner.length < mapname.length) {
      const len = mapname.length - planner.length
      data.planner = [...planner, ...new Array(len).fill([])]
    } else if (planner.length > mapname.length) {
      const newCurrent = planner.slice(0, mapname.length)
      data.planner = newCurrent
    }

    dispatch({
      type: '@@poi-plugin-ship-info@init',
      data,
    })
  } catch (e) {
    console.error(e.stack)
  } finally {
    dispatch({
      type: '@@poi-plugin-ship-info@ready',
    })
  }
}

const fileWriter = new FileWriter()

// observers
export const dataObserver = observer(
  extensionSelectorFactory(PLUGIN_KEY),
  (dispatch, current = {}) => {
    // avoid initial state overwrites file
    if (current.ready) {
      fileWriter.write(DATA_PATH, current)
    }
  },
)
