import { APIShip } from 'kcsapi/api_port/port/response'
import { get, keyBy, map, mapValues, memoize } from 'lodash'
import { createSelector } from 'reselect'
import i18next from 'views/env-parts/i18next'
import { z } from 'zod'

import {
  configSelector,
  constSelector,
  fcdSelector,
  fleetInExpeditionSelectorFactory,
  fleetShipsIdSelectorFactory,
  IConstState,
  inRepairShipsIdSelector,
  IState,
  shipDataSelectorFactory,
  shipEquipDataSelectorFactory,
  shipsSelector,
  stateSelector,
  wctfSelector,
} from 'views/utils/selectors'

import { APISlotItem } from 'kcsapi/api_get_member/require_info/response'
import { shipFleetIdMapSelector } from '@poi-plugins/ship-info-shared/fleet'
import { intToBoolArray } from './utils'

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

      rawValue: validateRadio('rawValue'),

      // Other settings
      sallyAreaChecked,
      sortName: get(config, 'plugin.ShipInfo.sortName', 'lv'),
      sortOrder: validateRadio('sortOrder'),
    }
  },
)

interface IDictionary<T> {
  [index: string]: T
}

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
      { $shipTypes = {} }: IConstState,
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
