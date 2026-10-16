import { AnyAction } from 'redux'

import { PLUGIN_KEY } from '../plugin-identity'

// Planner-owned state. The action prefix and namespace are unchanged; the root
// reducer composes this slice in.

interface IPlannerState {
  archive: object
  current: number[][]
}

const plannerInitState: IPlannerState = {
  archive: {},
  current: [],
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

export const plannerReducer = (state = plannerInitState, action: AnyAction) => {
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
