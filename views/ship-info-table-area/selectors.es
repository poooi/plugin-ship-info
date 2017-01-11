import memoize from 'fast-memoize'
import { createSelector } from 'reselect'
import { constSelector, shipDataSelectorFactory, shipsSelector,
  configSelector, fcdSelector, shipEquipDataSelectorFactory, fleetShipsIdSelectorFactory } from 'views/utils/selectors'
import { getShipInfoData } from './utils'
import { get } from 'lodash'

export const shipTableDataSelectorFactory = memoize((shipId) =>
  createSelector(
    [
      shipDataSelectorFactory(shipId),
      shipEquipDataSelectorFactory(shipId),
      constSelector,
      configSelector,
    ], 
    ([ship, $ship]=[], equips, {$shipTypes}, config) =>
      getShipInfoData(ship, $ship, equips, $shipTypes, get(config, 'plugin.ShipInfo.rawValue', false))
  )
)

export const shipInfoConfigSelector = createSelector(
  [
    configSelector,
    fcdSelector,
  ],
  (config, {shiptag={}}) =>({
    sortName: get(config, "plugin.ShipInfo.sortName", "lv"),
    sortOrder: get(config, "plugin.ShipInfo.sortOrder", 0),
    lvRadio: get(config, "plugin.ShipInfo.lvRadio", 2),
    lockedRadio: get(config, "plugin.ShipInfo.lockedRadio", 1),
    expeditionRadio: get(config, "plugin.ShipInfo.expeditionRadio", 0),
    modernizationRadio: get(config, "plugin.ShipInfo.modernizationRadio", 0),
    remodelRadio: get(config, "plugin.ShipInfo.remodelRadio", 0),
    sallyAreaChecked: get(config, 
      "plugin.ShipInfo.sallyAreaChecked", (shiptag.mapname || [] ).slice().fill(true)),
    pagedLayout: get(config, "plugin.ShipInfo.pagedLayout", false),
    marriedRadio: get(config, "plugin.ShipInfo.marriedRadio", 0),
    inFleetRadio: get(config, "plugin.ShipInfo.inFleetRadio", 0),
    sparkleRadio: get(config, "plugin.ShipInfo.sparkleRadio", 0),
    exSlotRadio: get(config, "plugin.ShipInfo.exSlotRadio", 0),
  })
)

const allFleetShipIdSelector = createSelector(
  [
    ...[...Array(4).keys()].map(fleetId => fleetShipsIdSelectorFactory(fleetId)),
  ], 
  (id1, id2, id3, id4) => [id1, id2, id3, id4]
)

const getShipFleetId = memoize((shipId, fleetShips) => {
  return fleetShips.reduce((id, ships, index) =>
    (Number.isNaN(id) && (ships || []).includes(parseInt(shipId))) 
    ? index 
    : id
  , NaN)
})


export const shipFleetIdMapSelector = createSelector(
  [
    shipsSelector,
    allFleetShipIdSelector,
  ], 
  (ships=[], fleetShips=[]) => {
    const map = {}
    Object.keys(ships).forEach(shipId => 
      map[shipId] = getShipFleetId(shipId, fleetShips)
    )
    return map
  }
)
