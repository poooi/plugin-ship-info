import { APIShip } from 'kcsapi/api_port/port/response'
import _, {
  findIndex,
  flatMap,
  flatten,
  fromPairs,
  get,
  includes,
  keyBy,
  map,
  mapValues,
  memoize,
  ObjectIterator,
} from 'lodash'
import fp from 'lodash/fp'
import { createSelector } from 'reselect'
import i18next from 'views/env-parts/i18next'
import { toRomaji } from 'wanakana'
import { z } from 'zod'

import {
  configSelector,
  constSelector,
  extensionSelectorFactory,
  fcdSelector,
  fleetInExpeditionSelectorFactory,
  fleetShipsIdSelectorFactory,
  IConstState,
  inRepairShipsIdSelector,
  IShipData,
  IState,
  shipDataSelectorFactory,
  shipEquipDataSelectorFactory,
  shipsSelector,
  stateSelector,
  wctfSelector,
} from 'views/utils/selectors'

import { APISlotItem } from 'kcsapi/api_get_member/require_info/response'
import { APIMstShip, APIMstSlotitem } from 'kcsapi/api_start2/getData/response'
import { PLUGIN_KEY } from './redux'
import {
  intToBoolArray,
  katakanaToHiragana,
  reverseSuperTypeMap,
  isShipCompleted,
  canEquipDaihatsu,
} from './utils'

// Zod schemas for filter validation
const yesNoFilterSchema = z.array(z.boolean()).length(2)
const radioFilterSchema = z.number().int().min(0)
const sallyAreaSchema = z.array(z.boolean())
const shipTypesSchema = z.number().int().min(0)
const levelRangeSchema = z.tuple([
  z.number().int().min(0).max(450),
  z.number().int().min(0).max(450),
])

// Column configuration schemas - TanStack Table format
const columnOrderSchema = z.array(z.string())
const columnVisibilitySchema = z.record(z.string(), z.boolean())
const columnPinningSchema = z.object({
  left: z.array(z.string()).optional(),
  right: z.array(z.string()).optional(),
})

const __ = i18next.getFixedT(null, ['poi-plugin-ship-info', 'resources'])

// Selector factories for reusable filter logic
const createYesNoFilterSelector = (configKey: string) =>
  createSelector([configSelector], (config) => {
    const rawValue = get(config, `plugin.ShipInfo.${configKey}`, [true, true])
    const result = yesNoFilterSchema.safeParse(rawValue)
    return result.success ? result.data : [true, true]
  })

const createRadioFilterSelector = (configKey: string, defaultValue = 0) =>
  createSelector([configSelector], (config) => {
    const rawValue = get(config, `plugin.ShipInfo.${configKey}`, defaultValue)
    const result = radioFilterSchema.safeParse(rawValue)
    return result.success ? result.data : defaultValue
  })

// Individual filter selectors using factories
export const lockedFilterSelector = createYesNoFilterSelector('locked')
export const expeditionFilterSelector = createYesNoFilterSelector('expedition')
export const inFleetFilterSelector = createYesNoFilterSelector('inFleet')
export const sparkleFilterSelector = createYesNoFilterSelector('sparkle')
export const exSlotFilterSelector = createYesNoFilterSelector('exSlot')
export const daihatsuFilterSelector = createYesNoFilterSelector('daihatsu')
export const modernizationFilterSelector =
  createYesNoFilterSelector('modernization')
export const remodelFilterSelector = createYesNoFilterSelector('remodel')

export const rawValueFilterSelector = createRadioFilterSelector('rawValue')

export const sallyAreaFilterSelector = createSelector(
  [configSelector, fcdSelector],
  (config, { shiptag = {} }) => {
    const defaultChecked = Array((shiptag.mapname || []).length + 1).fill(true)
    const rawValue = get(
      config,
      'plugin.ShipInfo.sallyAreaChecked',
      defaultChecked,
    )
    const result = sallyAreaSchema.safeParse(rawValue)
    return result.success ? result.data : defaultChecked
  },
)

export const shipTypesFilterSelector = createSelector(
  [configSelector],
  (config) => {
    const rawValue = get(config, 'plugin.ShipInfo.shipTypes', 0)
    const result = shipTypesSchema.safeParse(rawValue)
    return result.success ? result.data : 0
  },
)

export const graphSelector = createSelector([constSelector], (constState) =>
  keyBy(constState.$shipgraph, 'api_id'),
)

export const shipInfoConfigSelector = createSelector(
  [configSelector, fcdSelector],
  (config, { shiptag = {} }) => {
    // Helper function to validate yes/no filters
    const validateYesNo = (key: string) => {
      const rawValue = get(config, `plugin.ShipInfo.${key}`, [true, true])
      const result = yesNoFilterSchema.safeParse(rawValue)
      return result.success ? result.data : [true, true]
    }

    // Helper function to validate radio filters
    const validateRadio = (key: string, defaultValue = 0) => {
      const rawValue = get(config, `plugin.ShipInfo.${key}`, defaultValue)
      const result = radioFilterSchema.safeParse(rawValue)
      return result.success ? result.data : defaultValue
    }

    // Validate sally area checked
    const defaultSallyAreaChecked = Array(
      (shiptag.mapname || []).length + 1,
    ).fill(true)
    const rawSallyArea = get(
      config,
      'plugin.ShipInfo.sallyAreaChecked',
      defaultSallyAreaChecked,
    )
    const sallyAreaResult = sallyAreaSchema.safeParse(rawSallyArea)
    const sallyAreaChecked = sallyAreaResult.success
      ? sallyAreaResult.data
      : defaultSallyAreaChecked

    return {
      // New yes/no filters (array-based)
      locked: validateYesNo('locked'),
      expedition: validateYesNo('expedition'),
      inFleet: validateYesNo('inFleet'),
      sparkle: validateYesNo('sparkle'),
      exSlot: validateYesNo('exSlot'),
      daihatsu: validateYesNo('daihatsu'),
      modernization: validateYesNo('modernization'),
      remodel: validateYesNo('remodel'),

      // Old radio filters (kept for backward compatibility)
      lockedRadio: validateRadio('lockedRadio', 1),
      expeditionRadio: validateRadio('expeditionRadio'),
      inFleetRadio: validateRadio('inFleetRadio'),
      sparkleRadio: validateRadio('sparkleRadio'),
      exSlotRadio: validateRadio('exSlotRadio'),
      daihatsuRadio: validateRadio('daihatsuRadio'),
      lvRadio: validateRadio('lvRadio', 2),
      marriedRadio: validateRadio('marriedRadio'),
      modernizationRadio: validateRadio('modernizationRadio'),
      remodelRadio: validateRadio('remodelRadio'),
      rawValue: validateRadio('rawValue'),

      // Other settings
      pagedLayout: validateRadio('pagedLayout'),
      sallyAreaChecked,
      sortName: get(config, 'plugin.ShipInfo.sortName', 'lv'),
      sortOrder: validateRadio('sortOrder'),
    }
  },
)

const allFleetShipIdSelector = createSelector(
  [
    ...[...Array(4).keys()].map((fleetId) =>
      fleetShipsIdSelectorFactory(fleetId),
    ),
  ],
  (id1: number[], id2: number[], id3: number[], id4: number[]) => [
    id1,
    id2,
    id3,
    id4,
  ],
)

interface IDictionary<T> {
  [index: string]: T
}

export const shipFleetIdMapSelector = createSelector(
  [shipsSelector, allFleetShipIdSelector],
  (ships: IDictionary<APIShip>, fleetIds: number[][]) =>
    mapValues(ships, (ship) =>
      findIndex(fleetIds, (fleetId) => includes(fleetId, ship.api_id)),
    ),
)

export const shipFleetIdSelectorFactory = memoize((shipId) =>
  createSelector([shipFleetIdMapSelector], (fleetIdMap) => fleetIdMap[shipId]),
)

export const rawValueConfigSelector = createSelector(
  [configSelector],
  (config) => get(config, 'plugin.ShipInfo.rawValue', false),
)

// Returns raw data references instead of computed IShip object for better performance
export const shipTableDataSelectorFactory = memoize((shipId) =>
  createSelector(
    [
      shipDataSelectorFactory(shipId),
      shipEquipDataSelectorFactory(shipId),
      constSelector,
      shipFleetIdMapSelector,
      rawValueConfigSelector,
      inRepairShipsIdSelector,
      wctfSelector,
    ],
    (
      [ship, $ship] = [] as any,
      equips: IDictionary<APISlotItem>,
      { $shipTypes }: { $shipTypes: IDictionary<APIMstSlotitem> },
      fleetIdMap,
      rawValue,
      repairs = [],
      db,
    ) => ({
      ship,
      $ship,
      equips,
      $shipTypes,
      fleetIdMap,
      rawValue,
      repairs,
      db,
    }),
  ),
)

const handleTypeFilter = (typeId: number, shipTypes: number[]) =>
  (shipTypes || []).includes(typeId)

const handleLockedFilter = (locked: number, lockedFilter: boolean[]) => {
  const [yesChecked, noChecked] = lockedFilter
  const isLocked = locked === 1
  if (yesChecked && noChecked) return true
  if (yesChecked) return isLocked
  if (noChecked) return !isLocked
  return false
}

const handleExpeditionFilter = (
  id: number,
  expeditionShips: number[],
  expeditionFilter: boolean[],
) => {
  const [yesChecked, noChecked] = expeditionFilter
  const inExpedition = (expeditionShips || []).includes(id)
  if (yesChecked && noChecked) return true
  if (yesChecked) return inExpedition
  if (noChecked) return !inExpedition
  return false
}

const handleModernizationFilter = (
  isCompleted: boolean,
  modernizationFilter: boolean[],
) => {
  const [yesChecked, noChecked] = modernizationFilter
  if (yesChecked && noChecked) return true
  if (yesChecked) return isCompleted
  if (noChecked) return !isCompleted
  return false
}

const handleRemodelFilter = (after: number, remodelFilter: boolean[]) => {
  const [yesChecked, noChecked] = remodelFilter
  const remodelable = after !== 0
  if (yesChecked && noChecked) return true
  if (yesChecked) return remodelable
  if (noChecked) return !remodelable
  return false
}

const handleSallyAreaFilter = (
  sallyArea: number | undefined,
  sallyAreaChecked: boolean[],
) => {
  const checkedAll = (sallyAreaChecked || []).reduce(
    (all, checked) => all && checked,
    true,
  )
  if (checkedAll) {
    return true
  }
  return typeof sallyArea !== 'undefined'
    ? (sallyAreaChecked || [])[sallyArea || 0]
    : true
}

const handleInFleetFilter = (fleetId: number, inFleetFilter: boolean[]) => {
  const [yesChecked, noChecked] = inFleetFilter
  const isInFleet = fleetId > -1
  if (yesChecked && noChecked) return true
  if (yesChecked) return isInFleet
  if (noChecked) return !isInFleet
  return false
}

const handleSparkleFilter = (cond: number, sparkleFilter: boolean[]) => {
  const [yesChecked, noChecked] = sparkleFilter
  const hasSparkle = cond >= 50
  if (yesChecked && noChecked) return true
  if (yesChecked) return hasSparkle
  if (noChecked) return !hasSparkle
  return false
}

const handleExSlotFilter = (exslot: number, exSlotFilter: boolean[]) => {
  const [yesChecked, noChecked] = exSlotFilter
  const hasExSlot = exslot !== 0
  if (yesChecked && noChecked) return true
  if (yesChecked) return hasExSlot
  if (noChecked) return !hasExSlot
  return false
}

const handleDaihatsuFilter = (daihatsu: boolean, daihatsuFilter: boolean[]) => {
  const [yesChecked, noChecked] = daihatsuFilter
  if (yesChecked && noChecked) return true
  if (yesChecked) return daihatsu
  if (noChecked) return !daihatsu
  return false
}

// Type for raw ship data returned from shipTableDataSelectorFactory
interface IShipRawData {
  ship: APIShip
  $ship: APIMstShip
  equips: IDictionary<APISlotItem>
  $shipTypes: IDictionary<APIMstSlotitem>
  fleetIdMap: IDictionary<number>
  rawValue: boolean
  repairs: number[]
  db: any
}

const getSortFunction = (sortName: string) => {
  switch (sortName) {
    case 'id':
      return (data: IShipRawData) => data.ship.api_id
    case 'name':
      return [
        (data: IShipRawData) => katakanaToHiragana(data.$ship.api_yomi),
        (data: IShipRawData) => data.ship.api_lv,
        (data: IShipRawData) => -data.ship.api_id,
      ]
    case 'lv':
      // Sort rule of level in game (descending):
      // 1. level (descending)
      // 2. sortno (ascending)
      // 3. id (descending)
      return [
        (data: IShipRawData) => data.ship.api_lv,
        (data: IShipRawData) => -data.$ship.api_sortno!,
        (data: IShipRawData) => -data.ship.api_id,
      ]
    case 'type':
      return [
        (data: IShipRawData) => data.$ship.api_stype,
        (data: IShipRawData) => -data.$ship.api_sortno!,
        (data: IShipRawData) => data.ship.api_lv,
        (data: IShipRawData) => -data.ship.api_id,
      ]
    case 'hp':
      return [
        (data: IShipRawData) => data.ship.api_maxhp,
        (data: IShipRawData) => -data.$ship.api_sortno!,
        (data: IShipRawData) => -data.ship.api_id,
      ]
    default:
      // For other sorts (karyoku, raisou, etc.), access from ship.api_* directly
      return [
        (data: IShipRawData) => {
          const apiField = `api_${sortName}` as keyof APIShip
          const value = data.ship[apiField]
          return Array.isArray(value) ? value[0] : value
        },
        (data: IShipRawData) => data.$ship.api_sortno!,
        (data: IShipRawData) => -data.ship.api_id,
      ]
  }
}

export const shipTypesSelecor = createSelector(
  [
    (state) => get(state, 'const.$shipTypes', {}),
    (state) => get((state as IState).config, 'plugin.ShipInfo.shipTypes'),
  ],
  ($shipTypes, rawShipTypeChecked) => {
    // Validate ship type value
    const validationResult = shipTypesSchema.safeParse(rawShipTypeChecked)
    const shipTypeChecked = validationResult.success ? validationResult.data : 0

    const checked = intToBoolArray(shipTypeChecked)
    if (checked.length !== Object.keys($shipTypes).length) {
      return Object.keys($shipTypes).map((s) => +s)
    }
    return checked.reduce(
      (types: number[], check: boolean, index: number) =>
        check && index + 1 in $shipTypes ? types.concat([index + 1]) : types,
      [],
    )
  },
)

const fleetShipsInExpeditionSelectorFactory = memoize((fleetId) =>
  createSelector(
    [
      fleetInExpeditionSelectorFactory(fleetId),
      fleetShipsIdSelectorFactory(fleetId),
    ],
    (inExpedition: boolean, id: number[]) => (inExpedition ? id : []),
  ),
)

export const expeditionShipsSelector = createSelector(
  [
    (state) => fleetShipsInExpeditionSelectorFactory(0)(state),
    (state) => fleetShipsInExpeditionSelectorFactory(1)(state),
    (state) => fleetShipsInExpeditionSelectorFactory(2)(state),
    (state) => fleetShipsInExpeditionSelectorFactory(3)(state),
  ],
  (...ids) => ([] as number[]).concat(...ids),
)

export const allShipRowsSelector = createSelector(
  [shipsSelector, stateSelector],
  (ships, state) =>
    map(ships, (ship: APIShip) =>
      shipTableDataSelectorFactory(ship.api_id)(state),
    ),
)

export const allShipRowsMapSelector = createSelector(
  [shipsSelector, stateSelector],
  (ships, state) =>
    mapValues(ships, (ship: APIShip) =>
      shipTableDataSelectorFactory(ship.api_id)(state),
    ),
)

export const levelRangeFilterSelector = createSelector(
  [configSelector],
  (config) => {
    const minLevel = get(config, 'plugin.ShipInfo.filters.minLevel', 0)
    const maxLevel = get(config, 'plugin.ShipInfo.filters.maxLevel', 450)
    const result = levelRangeSchema.safeParse([minLevel, maxLevel])
    return result.success ? result.data : ([0, 450] as [number, number])
  },
)

// Default column order and visibility (TanStack Table format)
const defaultColumnOrder = [
  'rowIndex', // Row index column (not configurable)
  'id',
  'name',
  'type',
  'soku',
  'lv',
  'cond',
  'hp',
  'karyoku',
  'raisou',
  'taiku',
  'soukou',
  'lucky',
  'kaihi',
  'taisen',
  'sakuteki',
  'repairtime',
  'equipment',
  'lock',
]

const defaultColumnVisibility: Record<string, boolean> = {}

const defaultColumnPinning = {
  left: ['rowIndex'], // Row index is always pinned to left
  right: [],
}

export const columnOrderSelector = createSelector(
  [configSelector],
  (config) => {
    const rawValue = get(
      config,
      'plugin.ShipInfo.columnOrder',
      defaultColumnOrder,
    )
    const result = columnOrderSchema.safeParse(rawValue)
    return result.success ? result.data : defaultColumnOrder
  },
)

export const columnVisibilitySelector = createSelector(
  [configSelector],
  (config) => {
    const rawValue = get(
      config,
      'plugin.ShipInfo.columnVisibility',
      defaultColumnVisibility,
    )
    const result = columnVisibilitySchema.safeParse(rawValue)
    return result.success ? result.data : defaultColumnVisibility
  },
)

export const columnPinningSelector = createSelector(
  [configSelector],
  (config) => {
    const rawValue = get(
      config,
      'plugin.ShipInfo.columnPinning',
      defaultColumnPinning,
    )
    const result = columnPinningSchema.safeParse(rawValue)
    // Always ensure rowIndex is pinned to left
    const pinning = result.success ? result.data : defaultColumnPinning
    const leftPins = pinning.left || []
    if (!leftPins.includes('rowIndex')) {
      return {
        ...pinning,
        left: ['rowIndex', ...leftPins],
      }
    }
    return pinning
  },
)

export const shipInfoFiltersSelector = createSelector(
  [levelRangeFilterSelector],
  ([minLevel, maxLevel]) => ({
    minLevel,
    maxLevel,
  }),
)

export const filterShipIdsSelector = createSelector(
  [
    allShipRowsSelector,
    shipTypesSelecor,
    expeditionShipsSelector,
    shipInfoConfigSelector,
    shipInfoFiltersSelector,
  ],
  (
    shipsData,
    shipTypes,
    expeditionShips,
    {
      locked,
      expedition,
      inFleet,
      sparkle,
      exSlot,
      daihatsu,
      modernization,
      remodel,
      sallyAreaChecked,
      sortName,
      sortOrder,
    },
    { maxLevel, minLevel },
  ) =>
    fp.flow(
      fp.filter((data: IShipRawData) => {
        const { ship, $ship, fleetIdMap, db } = data
        const shipId = ship.api_id
        const typeId = $ship.api_stype
        const lv = ship.api_lv
        const lockedValue = ship.api_locked
        const fleetId = fleetIdMap[shipId]
        const after = parseInt($ship.api_aftershipid || '0', 10)
        const sallyArea = ship.api_sally_area || 0
        const exslot = ship.api_slot_ex
        const cond = ship.api_cond
        const isCompleted = isShipCompleted(ship, $ship)
        const canDaihatsu = canEquipDaihatsu($ship.api_id, db)

        return (
          handleTypeFilter(typeId, shipTypes) &&
          lv >= Math.min(minLevel, maxLevel) &&
          lv <= Math.max(minLevel, maxLevel) &&
          handleLockedFilter(lockedValue, locked) &&
          handleExpeditionFilter(shipId, expeditionShips, expedition) &&
          handleModernizationFilter(isCompleted, modernization) &&
          handleRemodelFilter(after, remodel) &&
          handleSallyAreaFilter(sallyArea, sallyAreaChecked) &&
          handleInFleetFilter(fleetId, inFleet) &&
          handleExSlotFilter(exslot, exSlot) &&
          handleSparkleFilter(cond, sparkle) &&
          handleDaihatsuFilter(canDaihatsu, daihatsu)
        )
      }),
      fp.sortBy(getSortFunction(sortName)),
      sortOrder ? (data: IShipRawData) => data : fp.reverse,
      fp.map((data: IShipRawData) => data.ship.api_id),
    )(shipsData),
)

export const sallyAreaSelectorFactory = memoize((area) =>
  createSelector([fcdSelector], (fcd) => ({
    color: get(fcd, `shiptag.color.${area - 1}`, ''),
    mapname: get(
      fcd,
      `shiptag.mapname.${area - 1}`,
      __('unknown_area', { area }),
    ),
  })),
)

export interface IShipInfoMenuData {
  area?: number | undefined
  avatarOffset?: number
  id: number
  lv: number
  name: string
  shipId: number
  superTypeIndex: number
  typeId: number
  yomi: string
  romaji: string
  exp: number
}

export const shipItemSelectorFactory = memoize((shipId) =>
  createSelector(
    [shipDataSelectorFactory(shipId), fcdSelector],
    (
      [ship, $ship] = [] as any,
      { shipavatar } = {} as any,
    ): IShipInfoMenuData | undefined =>
      !!ship && !!$ship
        ? {
            area: ship.api_sally_area,
            avatarOffset: get(
              shipavatar,
              ['marginMagics', $ship.api_id, 'normal'],
              0.555,
            ),
            exp: ship.api_exp[0],
            id: ship.api_id,
            lv: ship.api_lv,
            name: $ship.api_name,
            romaji: toRomaji($ship.api_yomi),
            shipId: $ship.api_id,
            superTypeIndex: reverseSuperTypeMap[$ship.api_stype] || 0,
            typeId: $ship.api_stype,
            yomi: $ship.api_yomi,
          }
        : undefined,
  ),
)

export const shipMenuDataSelector = createSelector(
  [shipsSelector, (state) => state],
  (_ships, state) =>
    fp.flow(
      fp.map((ship: APIShip) => ship.api_id),
      fp.map((shipId) => shipItemSelectorFactory(shipId)(state)!),
    )(_ships as any),
)

export const deckPlannerCurrentSelector = createSelector(
  [extensionSelectorFactory(PLUGIN_KEY)],
  (state) => ((state as any).planner || {}).current || [],
)

export const deckPlannerAreaSelectorFactory = memoize((areaIndex) =>
  createSelector(
    [deckPlannerCurrentSelector],
    (current) => current[areaIndex] || [],
  ),
)

export const deckPlannerAllShipIdsSelector = createSelector(
  [deckPlannerCurrentSelector],
  (current) => flatten(current),
)

export const deckPlannerShipMapSelector = createSelector(
  [deckPlannerCurrentSelector],
  (current: number[][]) =>
    fromPairs(
      flatMap(current, (ships, areaIndex: number) =>
        ships.map((id) => [id, areaIndex]),
      ),
    ),
)

const ourShipsSelector = createSelector<
  any,
  IConstState,
  IDictionary<APIMstShip>
>(
  [constSelector],
  ({ $ships = {} } = {} as any) =>
    _($ships)
      .pickBy(({ api_sortno }) => Boolean(api_sortno))
      .value() as IDictionary<APIMstShip>,
)

const beforeShipMapSelector = createSelector([ourShipsSelector], ($ships) =>
  _($ships)
    .filter<APIMstShip>(
      ((ship: APIMstShip) => +(ship.api_aftershipid || 0) > 0) as any,
    )
    .map((ship: APIMstShip) => [ship.api_aftershipid, ship.api_id])
    .fromPairs()
    .value(),
)

// the chain starts from each ship, thus incomplete if the ship is not the starting one
// the adjustedRemodelChainsSelector will return complete chains for all ships
const remodelChainsSelector = createSelector(
  [ourShipsSelector],
  ($ships: IDictionary<APIMstShip>): IDictionary<number[]> =>
    mapValues<IDictionary<APIMstShip>, number[]>(
      $ships,
      ({ api_id: shipId }: APIMstShip) => {
        let current: APIMstShip | { api_aftershipid?: string } = $ships[shipId]!
        let next = +(current.api_aftershipid || 0)
        let same = [shipId]
        while (!same.includes(next) && next > 0) {
          same = [...same, next]
          current = $ships[next] || {}
          next = +(current.api_aftershipid || 0)
        }
        return same
      },
    ),
)

export const uniqueShipIdsSelector = createSelector(
  [ourShipsSelector, beforeShipMapSelector],
  ($ships, beforeShipMap) =>
    _($ships)
      .filter(({ api_id }: APIMstShip) => !(api_id in beforeShipMap))
      .map(({ api_id }: APIMstShip) => api_id)
      .value(),
)

export const shipUniqueMapSelector = createSelector(
  [uniqueShipIdsSelector, remodelChainsSelector],
  (shipIds, chains: IDictionary<number[]>) =>
    _(shipIds)
      .flatMap((shipId) =>
        _(chains[shipId as any])
          .map((id) => [id, shipId])
          .value(),
      )
      .fromPairs()
      .value(),
)

export const adjustedRemodelChainsSelector = createSelector(
  [remodelChainsSelector, shipUniqueMapSelector],
  (remodelChains, uniqueMap) =>
    _(uniqueMap)
      .mapValues((uniqueId) => remodelChains[uniqueId as any])
      .value(),
)

export const kai2ShipSelector = createSelector(
  [uniqueShipIdsSelector, adjustedRemodelChainsSelector],
  (ships, remodelChains) =>
    fp.flow(fp.filter((shipId) => remodelChains[shipId as any].length > 3))(
      ships,
    ),
)

export const uniqueShipCountSelector = createSelector(
  [uniqueShipIdsSelector, adjustedRemodelChainsSelector, shipMenuDataSelector],
  (uniqs, remodelChains, ships) =>
    mapValues(
      remodelChains,
      (shipIds) =>
        fp.filter((ship) => shipIds.includes((ship as any).shipId))(ships)
          .length,
    ),
)
