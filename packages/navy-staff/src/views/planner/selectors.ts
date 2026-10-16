import { APIShip } from 'kcsapi/api_port/port/response'
import { APIMstShip } from 'kcsapi/api_start2/getData/response'
import _, { get, map, memoize } from 'lodash'
import { createSelector } from 'reselect'
import { toRomaji } from 'wanakana'
import {
  constSelector,
  fcdSelector,
  shipDataSelectorFactory,
  shipsSelector,
  IState,
} from 'views/utils/selectors'

import { shipSuperTypeMap } from '@poi-plugins/ship-info-shared/ship-types'

interface IDictionary<T> {
  [index: string]: T
}

// api_stype to super-type index, derived from the shared super-type map. Unknown
// types are represented by -1 at the call site.
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
// avatar margin.
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
        superTypeIndex: reverseSuperTypeMap[$ship.api_stype] ?? -1,
        typeId: $ship.api_stype,
        yomi: $ship.api_yomi,
      }
    : undefined

// The menu depends only on the owned roster, its master data and the avatar
// margins. Both stay `undefined` when data is absent instead of returning a
// fresh fallback that would break result stability.
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
