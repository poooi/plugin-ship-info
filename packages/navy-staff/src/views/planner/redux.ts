import { AnyAction } from 'redux'

import { PLUGIN_KEY } from '../plugin-identity'

// Planner-owned state. The action prefix and namespace belong to Navy Staff;
// the root reducer composes this slice in.

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

// `current` only ever grows to fit an index; it is never truncated because the
// current event has fewer/zero areas. Retained extra assignments stay so an
// event transition (or host data that has not loaded yet) cannot silently erase
// a plan.
const ensureArea = (current: number[][], index: number): number[][] => {
  const next = current.slice()
  while (next.length <= index) {
    next.push([])
  }
  return next
}

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
      // Grow only: never drop retained assignments when the map has fewer
      // areas (including zero while host data is still loading).
      if (current.length < mapname.length) {
        const len = mapname.length - current.length
        return {
          ...state,
          current: [...current, ...new Array(len).fill([])],
        }
      }
      return state
    }
    case `@@${PLUGIN_KEY}@dp-addShip`: {
      if (!Number.isInteger(areaIndex) || areaIndex < 0) {
        return state
      }
      const grown = ensureArea(current, areaIndex)
      if (!grown[areaIndex].includes(shipId)) {
        grown[areaIndex] = [...grown[areaIndex], shipId]
        return { ...state, current: grown }
      }
      return state
    }
    case `@@${PLUGIN_KEY}@dp-removeship`: {
      if (
        !Number.isInteger(areaIndex) ||
        areaIndex < 0 ||
        areaIndex >= current.length ||
        !current[areaIndex].includes(shipId)
      ) {
        return state
      }
      const newCurrent = current.slice()
      newCurrent[areaIndex] = newCurrent[areaIndex].filter(
        id => id !== shipId,
      )
      return { ...state, current: newCurrent }
    }
    case `@@${PLUGIN_KEY}@dp-displaceShip`: {
      if (
        !Number.isInteger(fromAreaIndex) ||
        !Number.isInteger(toAreaIndex) ||
        fromAreaIndex < 0 ||
        toAreaIndex < 0 ||
        fromAreaIndex >= current.length ||
        !current[fromAreaIndex].includes(shipId)
      ) {
        return state
      }
      const grown = ensureArea(current, toAreaIndex)
      grown[fromAreaIndex] = grown[fromAreaIndex].filter(id => id !== shipId)
      grown[toAreaIndex] = [...grown[toAreaIndex], shipId]
      return { ...state, current: grown }
    }
    default:
      return state
  }
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
