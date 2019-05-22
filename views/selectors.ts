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

import { IShip } from './types'

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
import { any } from 'prop-types'
import { PLUGIN_KEY } from './redux'
import {
  getShipInfoData,
  intToBoolArray,
  katakanaToHiragana,
  reverseSuperTypeMap,
} from './utils'

const __ = i18next.getFixedT(null, ['poi-plugin-ship-info', 'resources'])

export const graphSelector = createSelector(
  [constSelector],
  constState => keyBy(constState.$shipgraph, 'api_id'),
)

export const shipInfoConfigSelector = createSelector(
  [configSelector, fcdSelector],
  (config, { shiptag = {} }) => ({
    daihatsuRadio: get(config, 'plugin.ShipInfo.daihatsuRadio', 0),
    exSlotRadio: get(config, 'plugin.ShipInfo.exSlotRadio', 0),
    expeditionRadio: get(config, 'plugin.ShipInfo.expeditionRadio', 0),
    inFleetRadio: get(config, 'plugin.ShipInfo.inFleetRadio', 0),
    lockedRadio: get(config, 'plugin.ShipInfo.lockedRadio', 1),
    lvRadio: get(config, 'plugin.ShipInfo.lvRadio', 2),
    marriedRadio: get(config, 'plugin.ShipInfo.marriedRadio', 0),
    modernizationRadio: get(config, 'plugin.ShipInfo.modernizationRadio', 0),
    pagedLayout: get(config, 'plugin.ShipInfo.pagedLayout', 0),
    rawValue: get(config, 'plugin.ShipInfo.rawValue', false),
    remodelRadio: get(config, 'plugin.ShipInfo.remodelRadio', 0),
    sallyAreaChecked: get(
      config,
      'plugin.ShipInfo.sallyAreaChecked',
      Array((shiptag.mapname || []).length + 1).fill(true),
    ),
    sortName: get(config, 'plugin.ShipInfo.sortName', 'lv'),
    sortOrder: get(config, 'plugin.ShipInfo.sortOrder', 0),
    sparkleRadio: get(config, 'plugin.ShipInfo.sparkleRadio', 0),
  }),
)

const allFleetShipIdSelector = createSelector(
  [
    ...[...Array(4).keys()].map(fleetId =>
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
    mapValues(ships, ship =>
      findIndex(fleetIds, fleetId => includes(fleetId, ship.api_id)),
    ),
)

export const shipFleetIdSelectorFactory = memoize(shipId =>
  createSelector(
    [shipFleetIdMapSelector],
    fleetIdMap => fleetIdMap[shipId],
  ),
)

export const rawValueConfigSelector = createSelector(
  [configSelector],
  config => get(config, 'plugin.ShipInfo.rawValue', false),
)

export const shipTableDataSelectorFactory = memoize(shipId =>
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
    ) =>
      getShipInfoData(
        ship!,
        $ship!,
        equips!,
        $shipTypes,
        fleetIdMap,
        rawValue,
        repairs,
        db,
      ),
  ),
)

const handleTypeFilter = (typeId: number, shipTypes: number[]) =>
  (shipTypes || []).includes(typeId)

const handleLvFilter = (lv: number, lvRadio: number) => {
  switch (lvRadio) {
    case 1:
      return lv === 1
    case 2:
      return lv >= 2
    case 3:
      return lv >= 100
    case 0:
    default:
      return true
  }
}

const handleLockedFilter = (locked: number, lockedRadio: number) => {
  switch (lockedRadio) {
    case 1:
      return locked === 1
    case 2:
      return locked === 0
    case 0:
    default:
      return true
  }
}

const handleExpeditionFilter = (
  id: number,
  expeditionShips: number[],
  expeditionRadio: number,
) => {
  switch (expeditionRadio) {
    case 1:
      return (expeditionShips || []).includes(id)
    case 2:
      return !(expeditionShips || []).includes(id)
    case 0:
    default:
      return true
  }
}

const handleModernizationFilter = (
  isCompleted: boolean,
  modernizationRadio: number,
) => {
  switch (modernizationRadio) {
    case 1:
      return isCompleted
    case 2:
      return !isCompleted
    case 0:
    default:
      return true
  }
}

const handleRemodelFilter = memoize((after: number, remodelRadio: number) => {
  const remodelable = after !== 0
  switch (remodelRadio) {
    case 1:
      return remodelable
    case 2:
      return !remodelable
    case 0:
    default:
      return true
  }
})

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

const handleInFleetFilter = (fleetId: number, inFleetRadio: number) => {
  const isInFleet = fleetId > -1
  switch (inFleetRadio) {
    case 1:
      return isInFleet
    case 2:
      return !isInFleet
    case 0:
    default:
      return true
  }
}

const handleSparkleFilter = (cond: number, sparkleRadio: number) => {
  switch (sparkleRadio) {
    case 1:
      return cond >= 50
    case 2:
      return cond < 50
    case 0:
    default:
      return true
  }
}

const handleExSlotFilter = (exslot: number, exSlotRadio: number) => {
  switch (exSlotRadio) {
    case 1:
      return exslot !== 0
    case 2:
      return exslot === 0
    case 0:
    default:
      return true
  }
}

const handleDaihatsuFilter = (daihatsu: boolean, daihatsuRadio: number) => {
  switch (daihatsuRadio) {
    case 1:
      return daihatsu
    case 2:
      return !daihatsu
    case 0:
    default:
      return true
  }
}

const getSortFunction = (sortName: string) => {
  switch (sortName) {
    case 'id':
      return (ship: IShip) => ship.id
    case 'name':
      return [
        (ship: IShip) => katakanaToHiragana(ship.yomi),
        (ship: IShip) => ship.lv,
        (ship: IShip) => -ship.id,
      ]
    case 'lv':
      // Sort rule of level in game (descending):
      // 1. level (descending)
      // 2. sortno (ascending)
      // 3. id (descending)
      return [
        (ship: IShip) => ship.lv,
        (ship: IShip) => -ship.sortno,
        (ship: IShip) => -ship.id,
      ]
    case 'type':
      return [
        (ship: IShip) => ship.typeId,
        (ship: IShip) => -ship.sortno,
        (ship: IShip) => ship.lv,
        (ship: IShip) => -ship.id,
      ]
    case 'hp':
      return [
        (ship: IShip) => ship.maxhp,
        (ship: IShip) => -ship.sortno,
        (ship: IShip) => -ship.id,
      ]
    default:
      return [
        (ship: IShip) => ship[sortName as keyof IShip],
        (ship: IShip) => ship.sortno,
        (ship: IShip) => -ship.id,
      ]
  }
}

const shipTypesSelecor = createSelector(
  [
    state => get(state, 'const.$shipTypes', {}),
    state => get((state as IState).config, 'plugin.ShipInfo.shipTypes'),
  ],
  ($shipTypes, shipTypeChecked) => {
    const checked = intToBoolArray(shipTypeChecked)
    if (checked.length !== Object.keys($shipTypes).length) {
      return Object.keys($shipTypes).map(s => +s)
    }
    return checked.reduce(
      (types: number[], check: boolean, index: number) =>
        check && index + 1 in $shipTypes ? types.concat([index + 1]) : types,
      [],
    )
  },
)

const fleetShipsInExpeditionSelectorFactory = memoize(fleetId =>
  createSelector(
    [
      fleetInExpeditionSelectorFactory(fleetId),
      fleetShipsIdSelectorFactory(fleetId),
    ],
    (inExpedition: boolean, id: number[]) => (inExpedition ? id : []),
  ),
)

const expeditionShipsSelector = createSelector(
  [
    state => fleetShipsInExpeditionSelectorFactory(0)(state),
    state => fleetShipsInExpeditionSelectorFactory(1)(state),
    state => fleetShipsInExpeditionSelectorFactory(2)(state),
    state => fleetShipsInExpeditionSelectorFactory(3)(state),
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

export const filterShipIdsSelector = createSelector(
  [
    allShipRowsSelector,
    shipTypesSelecor,
    expeditionShipsSelector,
    shipInfoConfigSelector,
  ],
  (
    ships,
    shipTypes,
    expeditionShips,
    {
      lvRadio,
      lockedRadio,
      expeditionRadio,
      modernizationRadio,
      remodelRadio,
      inFleetRadio,
      exSlotRadio,
      sparkleRadio,
      daihatsuRadio,
      sallyAreaChecked,
      sortName,
      sortOrder,
    },
  ) =>
    fp.flow(
      fp.filter(
        (ship: IShip) =>
          handleTypeFilter(ship.typeId, shipTypes) &&
          handleLvFilter(ship.lv, lvRadio) &&
          handleLockedFilter(ship.locked, lockedRadio) &&
          handleExpeditionFilter(ship.id, expeditionShips, expeditionRadio) &&
          handleModernizationFilter(ship.isCompleted, modernizationRadio) &&
          handleRemodelFilter(ship.after, remodelRadio) &&
          handleSallyAreaFilter(ship.sallyArea, sallyAreaChecked) &&
          handleInFleetFilter(ship.fleetId, inFleetRadio) &&
          handleExSlotFilter(ship.exslot, exSlotRadio) &&
          handleSparkleFilter(ship.cond, sparkleRadio) &&
          handleDaihatsuFilter(ship.daihatsu, daihatsuRadio),
      ),
      fp.sortBy(getSortFunction(sortName)),
      sortOrder ? ship => ship : fp.reverse,
      fp.map('id'),
    )(ships),
)

export const sallyAreaSelectorFactory = memoize(area =>
  createSelector(
    [fcdSelector],
    fcd => ({
      color: get(fcd, `shiptag.color.${area - 1}`, ''),
      mapname: get(
        fcd,
        `shiptag.mapname.${area - 1}`,
        __('unknown_area', { area }),
      ),
    }),
  ),
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

export const shipItemSelectorFactory = memoize(shipId =>
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
  [shipsSelector, state => state],
  (_ships, state) =>
    fp.flow(
      fp.map((ship: APIShip) => ship.api_id),
      fp.map(shipId => shipItemSelectorFactory(shipId)(state)!),
    )(_ships as any),
)

export const deckPlannerCurrentSelector = createSelector(
  [extensionSelectorFactory(PLUGIN_KEY)],
  state => ((state as any).planner || {}).current || [],
)

export const deckPlannerAreaSelectorFactory = memoize(areaIndex =>
  createSelector(
    [deckPlannerCurrentSelector],
    current => current[areaIndex] || [],
  ),
)

export const deckPlannerAllShipIdsSelector = createSelector(
  [deckPlannerCurrentSelector],
  current => flatten(current),
)

export const deckPlannerShipMapSelector = createSelector(
  [deckPlannerCurrentSelector],
  (current: number[][]) =>
    fromPairs(
      flatMap(current, (ships, areaIndex: number) =>
        ships.map(id => [id, areaIndex]),
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

const beforeShipMapSelector = createSelector(
  [ourShipsSelector],
  $ships =>
    _($ships)
      .filter<APIMstShip>(((ship: APIMstShip) =>
        +(ship.api_aftershipid || 0) > 0) as any)
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
      .flatMap(shipId =>
        _(chains[shipId as any])
          .map(id => [id, shipId])
          .value(),
      )
      .fromPairs()
      .value(),
)

export const adjustedRemodelChainsSelector = createSelector(
  [remodelChainsSelector, shipUniqueMapSelector],
  (remodelChains, uniqueMap) =>
    _(uniqueMap)
      .mapValues(uniqueId => remodelChains[uniqueId as any])
      .value(),
)

export const kai2ShipSelector = createSelector(
  [uniqueShipIdsSelector, adjustedRemodelChainsSelector],
  (ships, remodelChains) =>
    fp.flow(fp.filter(shipId => remodelChains[shipId as any].length > 3))(
      ships,
    ),
)

export const uniqueShipCountSelector = createSelector(
  [uniqueShipIdsSelector, adjustedRemodelChainsSelector, shipMenuDataSelector],
  (uniqs, remodelChains, ships) =>
    mapValues(
      remodelChains,
      shipIds =>
        fp.filter(ship => shipIds.includes((ship as any).shipId))(ships).length,
    ),
)
