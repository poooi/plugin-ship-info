import { APIShip } from 'kcsapi/api_port/port/response'
import { APIMstShip } from 'kcsapi/api_start2/getData/response'
import _, { flatMap, flatten, fromPairs, get, map, memoize } from 'lodash'
import { createSelector } from 'reselect'
import { toRomaji } from 'wanakana'
import {
  constSelector,
  extensionSelectorFactory,
  fcdSelector,
  shipDataSelectorFactory,
  shipsSelector,
  IState,
} from 'views/utils/selectors'

import { shipSuperTypeMap } from '@poi-plugins/ship-info-shared/ship-types'
import { PLUGIN_KEY } from '../plugin-identity'

interface IDictionary<T> {
  [index: string]: T
}

// api_stype to super-type index, derived from the shared super-type map. Only
// the planner builds this reverse view.
export const reverseSuperTypeMap = _(shipSuperTypeMap)
  .flatMap(({ id }, index) =>
    _(id)
      .map((type) => [type, index])
      .value(),
  )
  .fromPairs()
  .value()

export interface IPlannerShipData {
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

// Builds one menu entry from an owned ship, its master data and the configured
// avatar margin. Shared by the per-ship selector and the whole-roster selector
// so both stay in lockstep.
const mapShipMenuItem = (
  ship: APIShip | undefined,
  $ship: APIMstShip | undefined,
  marginMagics: IDictionary<any> | undefined,
): IPlannerShipData | undefined =>
  !!ship && !!$ship
    ? {
        area: ship.api_sally_area,
        avatarOffset: get(marginMagics, [$ship.api_id, 'normal'], 0.555),
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
    : undefined

// The menu depends only on the owned roster, its master data and the avatar
// margins. Narrowing the host `const`/`fcd` selectors here keeps the result
// identity stable when unrelated parts of the root state change, so AddShip
// does not rebuild its Fuse index needlessly. Both stay `undefined` when data
// is absent instead of returning a fresh fallback that would break that
// stability.
const masterShipsSelector = (
  state: IState,
): IDictionary<APIMstShip> | undefined => constSelector(state).$ships

const shipAvatarMarginsSelector = (
  state: IState,
): IDictionary<any> | undefined => fcdSelector(state)?.shipavatar?.marginMagics

export const shipItemSelectorFactory = memoize((shipId) =>
  createSelector(
    [shipDataSelectorFactory(shipId), fcdSelector],
    (
      [ship, $ship] = [] as any,
      { shipavatar } = {} as any,
    ): IPlannerShipData | undefined =>
      mapShipMenuItem(ship, $ship, shipavatar?.marginMagics),
  ),
)

export const shipMenuDataSelector = createSelector(
  [shipsSelector, masterShipsSelector, shipAvatarMarginsSelector],
  (ships, $ships, marginMagics): IPlannerShipData[] =>
    map(ships, (ship: APIShip) =>
      mapShipMenuItem(ship, $ships?.[ship.api_ship_id ?? -1], marginMagics),
    ).filter((item): item is IPlannerShipData => item !== undefined),
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
