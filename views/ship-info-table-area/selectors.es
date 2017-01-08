import memoize from 'fast-memoize'
import { createSelector } from 'reselect'
import { constSelector, shipDataSelectorFactory } from 'views/utils/selectors'
import { getShipInfoData } from './utils'

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
