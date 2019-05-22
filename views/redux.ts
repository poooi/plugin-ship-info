import { promisify } from 'bluebird'
import { readJson } from 'fs-extra'
import { get, omit } from 'lodash'
import path from 'path'
import { AnyAction, combineReducers } from 'redux'
import { observer } from 'redux-observers'

import { extensionSelectorFactory } from 'views/utils/selectors'

import { Dispatch } from 'react'
import FileWriter from './file-writer'

export const PLUGIN_KEY = 'poi-plugin-ship-info'

const { APPDATA_PATH } = window

export const DATA_PATH = path.join(APPDATA_PATH, `${PLUGIN_KEY}.json`)

let bookmarkInitState = {}

interface IPlannerState {
  archive: object
  current: number[][]
}

const plannerInitState: IPlannerState = {
  archive: {},
  current: [],
}

const uiInitState = {
  activeDropdown: '',
  isExtend: true,
  toTop: true,
}

try {
  const initState = JSON.parse(localStorage.getItem(PLUGIN_KEY)!) || {}
  bookmarkInitState = initState
} catch (e) {
  console.error(e.stack)
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

const plannerReducer = (state = plannerInitState, action: AnyAction) => {
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
      }
      if (current.length > mapname.length) {
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
  if (type === `@@${PLUGIN_KEY}@ready`) {
    return true
  }
  return state
}

export const reducer = combineReducers({
  bookmark: bookmarkReducer,
  planner: plannerReducer,
  ready: readyReducer,
  ui: uiReducer,
})

export const onDPInit = ({
  color,
  mapname,
}: {
  color: string[]
  mapname: string[]
}) => ({
  color,
  mapname,
  type: `@@${PLUGIN_KEY}@dp-init`,
})

export const onAddShip = ({
  shipId,
  areaIndex,
}: {
  shipId: number
  areaIndex: number
}) => ({
  areaIndex,
  shipId,
  type: `@@${PLUGIN_KEY}@dp-addShip`,
})

export const onRemoveShip = ({
  shipId,
  areaIndex,
}: {
  shipId: number
  areaIndex: number
}) => ({
  areaIndex,
  shipId,
  type: `@@${PLUGIN_KEY}@dp-removeship`,
})

export const onDisplaceShip = ({
  shipId,
  fromAreaIndex,
  toAreaIndex,
}: {
  shipId: number
  fromAreaIndex: number
  toAreaIndex: number
}) => ({
  fromAreaIndex,
  shipId,
  toAreaIndex,
  type: `@@${PLUGIN_KEY}@dp-displaceShip`,
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

export const initStore = async (
  dispatch: Dispatch<any>,
  getState: () => any,
) => {
  try {
    const data = await readJson(DATA_PATH)

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
      data,
      type: '@@poi-plugin-ship-info@init',
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
