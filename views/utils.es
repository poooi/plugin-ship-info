import propTypes from 'prop-types'
import { clone, each } from 'lodash'
import memoize from 'fast-memoize'
import { repairFactor } from './constants'

const { __ } = window

export const getTimePerHP = (api_lv = 1, api_stype = 1) => {
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

  return ((api_lv * 5) + ((Math.floor(Math.sqrt(api_lv - 11)) * 10) + 50)) * factor * 1000
}

export const getShipInfoData = (
  ship,
  $ship,
  equips,
  $shipTypes,
  fleetIdMap,
  rawValue = false,
  repairs = [],
  ) => {
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
    inDock: repairs.includes(ship.api_id),
    after: parseInt($ship.api_aftershipid, 10),
    sallyArea: ship.api_sally_area || 0,
    soku: ship.api_soku,
  }

  // Attention, this will overwrite some original properties
  const karyokuNow = shipInfo.houg[0] + shipInfo.kyouka[0]
  const karyokuMax = shipInfo.karyoku[1]
  const karyoku = rawValue ? karyokuNow : shipInfo.karyoku[0]
  const _karyoku = shipInfo.karyoku[0]

  const raisouNow = shipInfo.raig[0] + shipInfo.kyouka[1]
  const raisouMax = shipInfo.raisou[1]
  const raisou = rawValue ? raisouNow : shipInfo.raisou[0]
  const _raisou = shipInfo.raisou[0]

  const taikuNow = shipInfo.tyku[0] + shipInfo.kyouka[2]
  const taikuMax = shipInfo.taiku[1]
  const taiku = rawValue ? taikuNow : shipInfo.taiku[0]
  const _taiku = shipInfo.taiku[0]

  const soukouNow = shipInfo.souk[0] + shipInfo.kyouka[3]
  const soukouMax = shipInfo.soukou[1]
  const soukou = rawValue ? soukouNow : shipInfo.soukou[0]
  const _soukou = shipInfo.soukou[0]

  const luckyNow = shipInfo.luck[0] + shipInfo.kyouka[4]
  const luckyMax = shipInfo.lucky[1]
  const lucky = rawValue ? luckyNow : shipInfo.lucky[0]
  const _lucky = shipInfo.lucky[0]

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
  //   Asashio Kai 2 D = 468, Arashio Kai 2 = 490, Michishio Kai 2 = 489
  // Verniy = 147, Kawakaze Kai 2 = 469
  // Nagato Kai 2 = 541
  // Yura Kai 2 = 488
  // Fumitsuki Kai 2 = 548
  if ([
    200,
    487,
    418,
    434,
    435,
    464,
    470,
    199,
    468,
    490,
    489,
    147,
    469,
    541,
    488,
    548,
  ].includes($ship.api_id)) {
    daihatsu = true
  }

  return ({
    ...shipInfo,
    karyokuNow,
    karyokuMax,
    karyoku,
    _karyoku,
    raisouNow,
    raisouMax,
    raisou,
    _raisou,
    taikuNow,
    taikuMax,
    taiku,
    _taiku,
    soukouNow,
    soukouMax,
    soukou,
    _soukou,
    luckyNow,
    luckyMax,
    lucky,
    _lucky,
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


// ship types dated 20170106, beginning with id=1
// const shipTypes = ["海防艦", "駆逐艦", "軽巡洋艦", "重雷装巡洋艦",
// "重巡洋艦", "航空巡洋艦", "軽空母", "戦艦", "戦艦", "航空戦艦", "正規空母",
// "超弩級戦艦", "潜水艦", "潜水空母", "補給艦", "水上機母艦", "揚陸艦", "装甲空母",
// "工作艦", "潜水母艦", "練習巡洋艦", "補給艦"]
// attention, shipSuperTypeMap uses api_id

export const shipSuperTypeMap = [
  {
    name: 'DD',
    id: [2],
  },
  {
    name: 'CL',
    id: [3, 4, 21],
  },
  {
    name: 'CA',
    id: [5, 6],
  },
  {
    name: 'BB',
    id: [8, 9, 10, 12],
  },
  {
    name: 'CV',
    id: [7, 11, 18],
  },
  {
    name: 'SS',
    id: [13, 14],
  },
  {
    name: 'Others',
    id: [1, 15, 16, 17, 19, 20, 22],
  },
]

export const reverseSuperTypeMap = {}

each(shipSuperTypeMap, ({ id }, index) => each(id, typeId => reverseSuperTypeMap[typeId] = index))


export const shipTypes = {
  1: __('DE'),
  2: __('DD'),
  3: __('CL'),
  4: __('CLT'),
  5: __('CA'),
  6: __('CAV'),
  7: __('CVL'),
  8: __('FBB'),
  9: __('BB'),
  10: __('BBV'),
  11: __('CV'),
  12: __('BB'),
  13: __('SS'),
  14: __('SSV'),
  15: __('AO'),
  16: __('AV'),
  17: __('LHA'),
  18: __('CVB'),
  19: __('AR'),
  20: __('AS'),
  21: __('CT'),
  22: __('AO'),
}

export const hexToRGBA = (hex, opacity = 1) => {
  if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
    let color = hex.substring(1)
    if (color.length === 3) {
      color = [color[0], color[0], color[1], color[1], color[2], color[2]]
    }
    const r = parseInt(color.slice(0, 2), 16)
    const g = parseInt(color.slice(2, 4), 16)
    const b = parseInt(color.slice(4, 6), 16)
    return `rgba(${r}, ${g}, ${b}, ${opacity})`
  }
  return ''
}
