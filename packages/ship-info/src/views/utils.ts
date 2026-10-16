import _, { get } from 'lodash'
import url from 'url'

import { APIShip } from 'kcsapi/api_port/port/response'
import { APIMstShip } from 'kcsapi/api_start2/getData/response'
import { repairFactor } from './constants'

export const getTimePerHP = (api_lv = 1, api_stype = 1): number => {
  let factor = 0
  if (repairFactor[api_stype] != null) {
    factor = repairFactor[api_stype].factor || 0
  }

  if (factor === 0) {
    return 0
  }

  if (api_lv < 12) {
    return api_lv * 10 * factor * 1000
  }

  return (
    (api_lv * 5 + (Math.floor(Math.sqrt(api_lv - 11)) * 10 + 50)) *
    factor *
    1000
  )
}

// Helper functions for computing ship properties from raw data
export const getValueByLevel = (min: number, max: number, lv: number): number =>
  Math.floor(((max - min) * lv) / 99) + min

export const computeKaryokuNow = (ship: APIShip, $ship: APIMstShip): number =>
  $ship.api_houg![0] + ship.api_kyouka[0]

export const computeRaisouNow = (ship: APIShip, $ship: APIMstShip): number =>
  $ship.api_raig![0] + ship.api_kyouka[1]

export const computeTaikuNow = (ship: APIShip, $ship: APIMstShip): number =>
  $ship.api_tyku![0] + ship.api_kyouka[2]

export const computeSoukouNow = (ship: APIShip, $ship: APIMstShip): number =>
  $ship.api_souk![0] + ship.api_kyouka[3]

export const computeLuckyNow = (ship: APIShip, $ship: APIMstShip): number =>
  $ship.api_luck![0] + ship.api_kyouka[4]

export const isShipCompleted = (ship: APIShip, $ship: APIMstShip): boolean => {
  const karyokuNow = computeKaryokuNow(ship, $ship)
  const raisouNow = computeRaisouNow(ship, $ship)
  const taikuNow = computeTaikuNow(ship, $ship)
  const soukouNow = computeSoukouNow(ship, $ship)

  return (
    karyokuNow >= ship.api_karyoku[1] &&
    raisouNow >= ship.api_raisou[1] &&
    taikuNow >= ship.api_taiku[1] &&
    soukouNow >= ship.api_soukou[1]
  )
}

export const canEquipDaihatsu = (shipId: number, db: any): boolean => {
  const daihatsuItems = _([24, 46]).map((i) =>
    _.find(get(db, 'item_types'), (t) => t.id_ingame === i),
  )

  const daihatsuShips = daihatsuItems
    .flatMap('equipable_extra_ship')
    .value() as number[]
  const daihastuTypes = daihatsuItems
    .flatMap('equipable_on_type')
    .value() as number[]

  return (
    daihatsuShips.includes(shipId) ||
    daihastuTypes.includes(get(db, ['ships', shipId, 'type']))
  )
}

// following function is used to convert betweern array of booleans and int
// leading true value is to ensure the bit length
// 12 => '1100' => [true, true, false, false] => [true, false, false]
// [true, false, false] => [true, true, false, false] => '1100' => 12
export const intToBoolArray = (int = 0) => {
  const boolArray = int
    .toString(2)
    .split('')
    .map((s) => !!+s)
  boolArray.shift()
  return boolArray
}

export const boolArrayToInt = (boolArray: boolean[] = []) => {
  const arr = boolArray.slice()
  arr.unshift(true)
  const str = arr.map((bool) => +bool).join('')
  return parseInt(str, 2)
}

export const fileUrl = (pathname: string): string =>
  url.format({
    pathname,
    protocol: 'file',
    slashes: true,
  })
