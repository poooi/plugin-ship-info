import { observer } from 'redux-observers'
import { isEqual, omit, get } from 'lodash'
import { combineReducers } from 'redux'

import { extensionSelectorFactory } from 'views/utils/selectors'

export const PLUGIN_KEY = 'poi-plugin-ship-info'

let bookmarkInitState = {}

const plannerInitState = {
  dpCurrent: [],
  dpBookmarks: {},
}

const uiInitState = {
  scrollTop: 0,
}

try {
  const initState = JSON.parse(localStorage.getItem(PLUGIN_KEY)) || {}
  if ('planner' in initState && 'bookmark' in initState) {
    bookmarkInitState = initState.bookmark || {}
    plannerInitState.dpCurrent = get(initState, 'planner.dpCurrent', [])
  } else {
    bookmarkInitState = initState
  }
} catch (e) {
  console.error(e.stack)
}

const bookmarkReducer = (state = bookmarkInitState, action) => {
  const { type, bookmark, settings } = action
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
    default:
      return state
  }
}

// dpCurrent: [[ship ids in the area ] for area in fcd ] current deck planner's profile,
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
  const { type, mapname, shipId, areaIndex, fromAreaIndex, toAreaIndex, data } = action
  const current = state.dpCurrent
  switch (type) {
    case `@@${PLUGIN_KEY}@loadData`: {
      return {
        ...state,
        ...data,
      }
    }
    case `@@${PLUGIN_KEY}@dp-init`: {
      if (current.length < mapname.length) {
        const len = mapname.length - current.length
        return {
          ...state,
          dpCurrent: [...current, ...new Array(len).fill([])],
        }
      } else if (current.length > mapname.length) {
        const newCurrent = current.slice(0, mapname.length)
        return {
          ...state,
          dpCurrent: newCurrent,
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
          dpCurrent: newCurrent,
        }
      }
      break
    }
    case `@@${PLUGIN_KEY}@dp-removeship`: {
      const newCurrent = current.slice()
      if (newCurrent[areaIndex].includes(shipId)) {
        newCurrent[areaIndex] = newCurrent[areaIndex].filter(id => id !== shipId)
        return {
          ...state,
          dpCurrent: newCurrent,
        }
      }
      break
    }
    case `@@${PLUGIN_KEY}@dp-displaceShip`: {
      const newCurrent = current.slice()
      if (newCurrent[fromAreaIndex].includes(shipId)) {
        newCurrent[fromAreaIndex] = newCurrent[fromAreaIndex].filter(id => id !== shipId)
        newCurrent[toAreaIndex] = [...newCurrent[toAreaIndex], shipId]
        return {
          ...state,
          dpCurrent: newCurrent,
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
  const { type, scrollTop } = action
  if (type === `@@${PLUGIN_KEY}@scroll`) {
    return {
      ...state,
      scrollTop,
    }
  }
  return state
}

export const reducer = combineReducers({
  bookmark: bookmarkReducer,
  planner: plannerReducer,
  ui: uiReducer,
})

export const onDPInit = ({ color, mapname }) =>
  ({
    type: `@@${PLUGIN_KEY}@dp-init`,
    color,
    mapname,
  })

export const onAddShip = ({ shipId, areaIndex }) =>
  ({
    type: `@@${PLUGIN_KEY}@dp-addShip`,
    shipId,
    areaIndex,
  })


export const onRemoveShip = ({ shipId, areaIndex }) =>
  ({
    type: `@@${PLUGIN_KEY}@dp-removeship`,
    shipId,
    areaIndex,
  })


export const onDisplaceShip = ({ shipId, fromAreaIndex, toAreaIndex }) =>
  ({
    type: `@@${PLUGIN_KEY}@dp-displaceShip`,
    shipId,
    fromAreaIndex,
    toAreaIndex,
  })

export const onLoadData = ({ data }) =>
  ({
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

// observers
export const ShipInfoObserver = observer(
  extensionSelectorFactory(PLUGIN_KEY),
  (dispatch, current = {}, previous) => {
    // avoid initial state overwrites file
    if (!isEqual(current, previous) && Object.keys(current).length > 0) {
      localStorage.setItem(PLUGIN_KEY, JSON.stringify(current))
    }
  }
)
