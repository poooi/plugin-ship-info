import memoize from 'fast-memoize'
import { createSelector } from 'reselect'
import { get, mapValues, findIndex, includes } from 'lodash'

import { constSelector, shipDataSelectorFactory, shipsSelector,
  configSelector, fcdSelector, shipEquipDataSelectorFactory, fleetShipsIdSelectorFactory } from 'views/utils/selectors'
import { getShipInfoData } from './utils'

const { __ } = window

export const shipTableDataSelectorFactory = memoize(shipId =>
  createSelector(
    [
      shipDataSelectorFactory(shipId),
      shipEquipDataSelectorFactory(shipId),
      constSelector,
      configSelector,
    ],
    ([ship, $ship] = [], equips, { $shipTypes }, config) =>
      getShipInfoData(ship, $ship, equips, $shipTypes, get(config, 'plugin.ShipInfo.rawValue', false))
  )
)

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

export const sallyAreaSelectorFactory = memoize(area => createSelector(
  [
    fcdSelector,
  ],
  fcd => ({
    mapname: get(fcd, `shiptag.mapname.${area - 1}`, __('Unknown Area %s, data not updated', area)),
    color: get(fcd, `shiptag.color.${area - 1}`, ''),
  })
))
