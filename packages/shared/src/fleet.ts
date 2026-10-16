import { APIShip } from 'kcsapi/api_port/port/response'
import { findIndex, includes, mapValues, memoize } from 'lodash'
import { createSelector } from 'reselect'

import {
  fleetShipsIdSelectorFactory,
  shipsSelector,
} from 'views/utils/selectors'

// Fleet membership derived from the host. Consumed by both the Ship Info table
// (via the row selectors) and the planner UI.

interface IDictionary<T> {
  [index: string]: T
}

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
