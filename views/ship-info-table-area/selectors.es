import memoize from 'fast-memoize'
import { createSelector } from 'reselect'
// import { constSelector } from 'views/utils/selectors'
import { getShipInfoData } from './utils'

const shipsSelector = (state) => state.info.ships
const constSelector = (state) => state.const

// copied from main poi, but skips some check because the origin of shipId is _ships' key
const shipBaseDataSelectorFactory = memoize((shipId) =>
  createSelector([
    shipsSelector,
  ], (ships) => 
    ships[shipId]
  )
)
// Reads props.shipId
// Returns [_ship, $ship]
// Returns undefined if uninitialized, or if ship not found in _ship
const shipDataSelectorFactory = memoize((shipId) =>
  createSelector([
    shipBaseDataSelectorFactory(shipId),
    constSelector,
  ], (ship, {$ships}) => 
    $ships
    ? [ship, $ships[ship.api_ship_id]]
    : undefined
  )
)


export const shipTableDataSelectorFactory = memoize((shipId) =>
  createSelector(
    [
      shipDataSelectorFactory(shipId),
      constSelector,
    ], 
    ([ship, $ship]=[], {$shipTypes}) =>
      getShipInfoData(ship, $ship, $shipTypes)
  )
)
