import propTypes from 'prop-types'
import { clone } from 'lodash'
import memoize from 'fast-memoize'
import { repairFactor } from './constants'

export const getTimePerHP = memoize((api_lv = 1, api_stype = 1) => {
  let factor = 0
  if (repairFactor[api_stype] != null) factor = repairFactor[api_stype].factor || 0

  if (factor === 0) return 0

  if (api_lv < 12) {
    return api_lv * 10 * factor * 1000
  }

  return ((api_lv * 5) + ((Math.floor(Math.sqrt(api_lv - 11)) * 10) + 50)) * factor * 1000
})

export const getShipInfoData = (ship, $ship, equips, $shipTypes, fleetIdMap, rawValue = false) => {
  const shipInfo = {
    id: ship.api_id,
    typeId: $ship.api_stype,
    fleetId: fleetIdMap[ship.api_id],
    type: ($shipTypes[$ship.api_stype] || {}).api_name,
    name: $ship.api_name,
    yomi: $ship.api_yomi,
    sortno: $ship.api_sortno,
    lv: ship.api_lv,
    cond: ship.api_cond,
    karyoku: ship.api_karyoku,
    houg: $ship.api_houg,
    raisou: ship.api_raisou,
    raig: $ship.api_raig,
    taiku: ship.api_taiku,
    tyku: $ship.api_tyku,
    soukou: ship.api_soukou,
    souk: $ship.api_souk,
    lucky: ship.api_lucky,
    luck: $ship.api_luck,
    kyouka: ship.api_kyouka,
    kaihi: ship.api_kaihi[0],
    taisen: ship.api_taisen[0],
    sakuteki: ship.api_sakuteki[0],
    slot: clone(ship.api_slot),
    exslot: ship.api_slot_ex,
    locked: ship.api_locked,
    nowhp: ship.api_nowhp,
    maxhp: ship.api_maxhp,
    losshp: ship.api_maxhp - ship.api_nowhp,
    repairtime: parseInt(ship.api_ndock_time / 1000.0, 10),
    after: parseInt($ship.api_aftershipid, 10),
    sallyArea: ship.api_sally_area || 0,
    soku: ship.api_soku,
  }

  // Attention, this will overwrite some original properties
  const karyokuNow = shipInfo.houg[0] + shipInfo.kyouka[0]
  const karyokuMax = shipInfo.karyoku[1]
  const karyoku = rawValue ? karyokuNow : shipInfo.karyoku[0]

  const raisouNow = shipInfo.raig[0] + shipInfo.kyouka[1]
  const raisouMax = shipInfo.raisou[1]
  const raisou = rawValue ? raisouNow : shipInfo.raisou[0]

  const taikuNow = shipInfo.tyku[0] + shipInfo.kyouka[2]
  const taikuMax = shipInfo.taiku[1]
  const taiku = rawValue ? taikuNow : shipInfo.taiku[0]

  const soukouNow = shipInfo.souk[0] + shipInfo.kyouka[3]
  const soukouMax = shipInfo.soukou[1]
  const soukou = rawValue ? soukouNow : shipInfo.soukou[0]

  const luckyNow = shipInfo.luck[0] + shipInfo.kyouka[4]
  const luckyMax = shipInfo.lucky[1]
  const lucky = rawValue ? luckyNow : shipInfo.lucky[0]

  const isCompleted = karyokuNow >= karyokuMax &&
            raisouNow >= raisouMax &&
            taikuNow >= taikuMax &&
            soukouNow >= soukouMax

  let { kaihi, taisen, sakuteki } = shipInfo
  // get raw kaihi, taisen and sakuteki value by substracting effects of equipments
  if (rawValue) {
    equips.forEach((equip) => {
      if (typeof equip === 'undefined') {
        return
      }
      const $equip = equip[1] || {}
      kaihi -= $equip.api_houk || 0
      taisen -= $equip.api_tais || 0
      sakuteki -= $equip.api_saku || 0
    })
  }

  // check if ship can equip daihatsu
  let daihatsu = false
  // AV=16, LHA=17, AO=22
  if ([16, 17, 22].includes($ship.api_stype)) {
    daihatsu = true
  }

  // excluding Akitsushima(445) and Hayasui(352)
  if ([445, 460].includes($ship.api_id)) {
    daihatsu = false
  }

  // Abukuma Kai 2 = 200, Kinu Kai 2 = 487
  // Satsuki Kai 2 = 418 , Mutsuki Kai 2 = 434, Kisaragi Kai 2 = 435
  // Kasumi Kai 2 = 464, Kasumi Kai 2 B = 470, Ooshio Kai 2 = 199,
  //   Asashio Kai 2 D = 468, Arashio Kai 2 = 490
  // Verniy = 147, Kawakaze Kai 2 = 469
  // Nagato Kai 2 = 541
  if ([200, 487, 418, 434, 435, 464, 470, 199, 468, 490, 147, 469, 541].includes($ship.api_id)) {
    daihatsu = true
  }

  return ({
    ...shipInfo,
    karyokuNow,
    karyokuMax,
    karyoku,
    raisouNow,
    raisouMax,
    raisou,
    taikuNow,
    taikuMax,
    taiku,
    soukouNow,
    soukouMax,
    soukou,
    luckyNow,
    luckyMax,
    lucky,
    isCompleted,
    kaihi,
    taisen,
    sakuteki,
    daihatsu,
  })
}

export const shipInfoShape = {
  id: propTypes.number.isRequired,
  typeId: propTypes.number.isRequired,
  fleetId: propTypes.number.isRequired,
  type: propTypes.string.isRequired,
  name: propTypes.string.isRequired,
  yomi: propTypes.string.isRequired,
  sortno: propTypes.number.isRequired,
  lv: propTypes.number.isRequired,
  cond: propTypes.number.isRequired,
  karyoku: propTypes.number.isRequired,
  houg: propTypes.arrayOf(propTypes.number).isRequired,
  raisou: propTypes.number.isRequired,
  raig: propTypes.arrayOf(propTypes.number).isRequired,
  taiku: propTypes.number.isRequired,
  tyku: propTypes.arrayOf(propTypes.number).isRequired,
  soukou: propTypes.number.isRequired,
  souk: propTypes.arrayOf(propTypes.number).isRequired,
  lucky: propTypes.number.isRequired,
  luck: propTypes.arrayOf(propTypes.number).isRequired,
  kyouka: propTypes.arrayOf(propTypes.number).isRequired,
  kaihi: propTypes.number.isRequired,
  taisen: propTypes.number.isRequired,
  sakuteki: propTypes.number.isRequired,
  slot: propTypes.arrayOf(propTypes.number).isRequired,
  exslot: propTypes.number.isRequired,
  locked: propTypes.number.isRequired,
  nowhp: propTypes.number.isRequired,
  maxhp: propTypes.number.isRequired,
  losshp: propTypes.number.isRequired,
  repairtime: propTypes.number.isRequired,
  after: propTypes.number.isRequired,
  sallyArea: propTypes.number,
  soku: propTypes.number.isRequired,
  karyokuNow: propTypes.number.isRequired,
  karyokuMax: propTypes.number.isRequired,
  raisouNow: propTypes.number.isRequired,
  raisouMax: propTypes.number.isRequired,
  taikuNow: propTypes.number.isRequired,
  taikuMax: propTypes.number.isRequired,
  soukouNow: propTypes.number.isRequired,
  soukouMax: propTypes.number.isRequired,
  luckyNow: propTypes.number.isRequired,
  luckyMax: propTypes.number.isRequired,
  isCompleted: propTypes.bool.isRequired,
  daihatsu: propTypes.bool.isRequired,
}

const jpCollator = new Intl.Collator('ja-JP')

export const nameCompare = (a, b) => {
  if (a.yomi === b.yomi) {
    if (a.lv !== b.lv) return a.lv - b.lv
    if (a.id !== b.id) return -(a.id - b.id)
  }
  return jpCollator.compare(a.yomi, b.yomi)
}

// katagana to hiragana
export const katakanaToHiragana = str =>
  str.replace(/[\u30a1-\u30f6]/g, (match) => {
    const chr = match.charCodeAt(0) - 0x60
    return String.fromCharCode(chr)
  })

export const getKanaSortValues = str =>
  katakanaToHiragana(str).split('').map(s => s.charCodeAt())

// following function is used to convert betweern array of booleans and int
// leading true value is to ensure the bit length
// 12 => '1100' => [true, true, false, false] => [true, false, false]
// [true, false, false] => [true, true, false, false] => '1100' => 12
export const intToBoolArray = (int = 0) => {
  const boolArray = int.toString(2).split('').map(s => !!+s)
  boolArray.shift()
  return boolArray
}

export const boolArrayToInt = (boolArray = []) => {
  const arr = boolArray.slice()
  arr.unshift(true)
  const str = arr.map(bool => +bool).join('')
  return parseInt(str, 2)
}
