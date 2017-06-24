import memoize from 'fast-memoize'
import { createSelector } from 'reselect'
import { get, mapValues, findIndex, includes } from 'lodash'
import fp from 'lodash/fp'

import { constSelector, shipDataSelectorFactory, shipsSelector,
  configSelector, fcdSelector, shipEquipDataSelectorFactory, fleetShipsIdSelectorFactory,
  stateSelector, inRepairShipsIdSelector } from 'views/utils/selectors'
import { getShipInfoData, katakanaToHiragana, intToBoolArray } from './utils'

const { __ } = window

export const shipInfoConfigSelector = createSelector(
  [
    configSelector,
    fcdSelector,
  ],
  (config, { shiptag = {} }) => ({
    sortName: get(config, 'plugin.ShipInfo.sortName', 'lv'),
    sortOrder: get(config, 'plugin.ShipInfo.sortOrder', 0),
    lvRadio: get(config, 'plugin.ShipInfo.lvRadio', 2),
    lockedRadio: get(config, 'plugin.ShipInfo.lockedRadio', 1),
    expeditionRadio: get(config, 'plugin.ShipInfo.expeditionRadio', 0),
    modernizationRadio: get(config, 'plugin.ShipInfo.modernizationRadio', 0),
    remodelRadio: get(config, 'plugin.ShipInfo.remodelRadio', 0),
    sallyAreaChecked: get(config,
      'plugin.ShipInfo.sallyAreaChecked', Array((shiptag.mapname || []).length + 1).fill(true)),
    pagedLayout: get(config, 'plugin.ShipInfo.pagedLayout', 0),
    marriedRadio: get(config, 'plugin.ShipInfo.marriedRadio', 0),
    inFleetRadio: get(config, 'plugin.ShipInfo.inFleetRadio', 0),
    sparkleRadio: get(config, 'plugin.ShipInfo.sparkleRadio', 0),
    exSlotRadio: get(config, 'plugin.ShipInfo.exSlotRadio', 0),
    daihatsuRadio: get(config, 'plugin.ShipInfo.daihatsuRadio', 0),
    rawValue: get(config, 'plugin.ShipInfo.rawValue', false),
  })
)

const allFleetShipIdSelector = createSelector(
  [
    ...[...Array(4).keys()].map(fleetId => fleetShipsIdSelectorFactory(fleetId)),
  ],
  (id1, id2, id3, id4) => [id1, id2, id3, id4]
)

export const shipFleetIdMapSelector = createSelector(
  [
    shipsSelector,
    allFleetShipIdSelector,
  ], (ships, fleetIds) =>
    mapValues(ships, ship => findIndex(fleetIds, fleetId => includes(fleetId, ship.api_id)))
)

export const shipTableDataSelectorFactory = memoize(shipId =>
  createSelector(
    [
      shipDataSelectorFactory(shipId),
      shipEquipDataSelectorFactory(shipId),
      constSelector,
      shipFleetIdMapSelector,
      configSelector,
      inRepairShipsIdSelector,
    ],
    ([ship, $ship] = [], equips, { $shipTypes }, fleetIdMap, config, repairs = []) =>
      getShipInfoData(ship, $ship, equips, $shipTypes, fleetIdMap, get(config, 'plugin.ShipInfo.rawValue', false), repairs)
  )
)

const handleTypeFilter = memoize((typeId, shipTypes) => (shipTypes || []).includes(typeId))

const handleLvFilter = memoize((lv, lvRadio) => {
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
})

const handleLockedFilter = memoize((locked, lockedRadio) => {
  switch (lockedRadio) {
    case 1:
      return locked === 1
    case 2:
      return locked === 0
    case 0:
    default:
      return true
  }
})

const handleExpeditionFilter = memoize((id, expeditionShips, expeditionRadio) => {
  switch (expeditionRadio) {
    case 1:
      return (expeditionShips || []).includes(id)
    case 2:
      return !(expeditionShips || []).includes(id)
    case 0:
    default:
      return true
  }
})

const handleModernizationFilter = memoize((isCompleted, modernizationRadio) => {
  switch (modernizationRadio) {
    case 1:
      return isCompleted
    case 2:
      return !isCompleted
    case 0:
    default:
      return true
  }
})

const handleRemodelFilter = memoize((after, remodelRadio) => {
  const remodelable = after !== '0'
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

const handleSallyAreaFilter = memoize((sallyArea, sallyAreaChecked) => {
  const checkedAll = (sallyAreaChecked || []).reduce((all, checked) =>
    all && checked
  , true)
  if (checkedAll) return true
  return typeof sallyArea !== 'undefined'
    ? (sallyAreaChecked || [])[sallyArea || 0]
    : true
})

const handleInFleetFilter = memoize((fleetId, inFleetRadio) => {
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
})

const handleSparkleFilter = memoize((cond, sparkleRadio) => {
  switch (sparkleRadio) {
    case 1:
      return cond >= 50
    case 2:
      return cond < 50
    case 0:
    default:
      return true
  }
})

const handleExSlotFilter = memoize((exslot, exSlotRadio) => {
  switch (exSlotRadio) {
    case 1:
      return exslot !== 0
    case 2:
      return exslot === 0
    case 0:
    default:
      return true
  }
})

const handleDaihatsuFilter = (daihatsu, daihatsuRadio) => {
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

const getSortFunction = (sortName) => {
  switch (sortName) {
    case 'id':
      return ship => ship.id
    case 'name':
      return [ship => katakanaToHiragana(ship.yomi), ship => ship.lv, ship => -ship.id]
    case 'lv':
    // Sort rule of level in game (descending):
    // 1. level (descending)
    // 2. sortno (ascending)
    // 3. id (descending)
      return [ship => ship.lv, ship => -ship.sortno, ship => -ship.id]
    case 'type':
      return [ship => ship.typeId, ship => -ship.sortno, ship => ship.lv, ship => -ship.id]
    default:
      return [ship => ship[sortName], ship => ship.sortno, ship => -ship.id]
  }
}

const shipTypesSelecor = createSelector(
  [
    state => get(state, 'const.$shipTypes', {}),
    state => get(state.config, 'plugin.ShipInfo.shipTypes'),
  ], ($shipTypes, shipTypeChecked) => {
  const checked = intToBoolArray(shipTypeChecked)
  if (checked.length !== Object.keys($shipTypes).length) {
    return Object.keys($shipTypes).map(s => +s)
  }
  return checked.reduce((types, check, index) =>
    check && ((index + 1) in $shipTypes)
      ? types.concat([index + 1])
      : types
    , [])
})

const expeditionShipsSelector = createSelector(
  [
    state => fleetShipsIdSelectorFactory(0)(state),
    state => fleetShipsIdSelectorFactory(1)(state),
    state => fleetShipsIdSelectorFactory(2)(state),
    state => fleetShipsIdSelectorFactory(3)(state),
  ], (...ids) => [].concat(...ids)
)

export const shipRowsSelector = createSelector(
  [
    shipsSelector,
    stateSelector,
    shipTypesSelecor,
    expeditionShipsSelector,
    shipInfoConfigSelector,
  ], (ships,
    state,
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
    }
  ) =>
    fp.flow(
      fp.map(ship => shipTableDataSelectorFactory(ship.api_id)(state)),
      fp.filter(ship =>
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
        handleDaihatsuFilter(ship.daihatsu, daihatsuRadio)
      ),
      fp.sortBy(getSortFunction(sortName)),
      sortOrder ? ship => ship : fp.reverse,
    )(ships)
)


export const sallyAreaSelectorFactory = memoize(area => createSelector(
  [
    fcdSelector,
  ],
  fcd => ({
    mapname: get(fcd, `shiptag.mapname.${area - 1}`, __('Unknown Area %s, data not updated', area)),
    color: get(fcd, `shiptag.color.${area - 1}`, ''),
  })
))