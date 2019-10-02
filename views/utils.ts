import { remote } from 'electron'
import _, { clone, get } from 'lodash'
import PropTypes from 'prop-types'
import url from 'url'
import i18next from 'views/env-parts/i18next'

import { APISlotItem } from 'kcsapi/api_get_member/require_info/response'
import { APIShip } from 'kcsapi/api_port/port/response'
import { APIMstShip, APIMstSlotitem } from 'kcsapi/api_start2/getData/response'
import { Dictionary } from 'views/utils/selectors'
import html2canvas from '../lib/html2canvas'
import { repairFactor, shipSuperTypeMap } from './constants'
import { IShip } from './types'

const __ = i18next.getFixedT(null, ['poi-plugin-ship-info', 'resources'])

export const getTimePerHP = (
  api_lv: number = 1,
  api_stype: number = 1,
): number => {
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

const getValueByLevel = (min: number, max: number, lv: number): number =>
  Math.floor(((max - min) * lv) / 99) + min

/* tslint:disable:object-literal-sort-keys */
export const getShipInfoData = (
  ship: APIShip,
  $ship: APIMstShip,
  equips: Dictionary<APISlotItem>,
  $shipTypes: Dictionary<APIMstSlotitem>,
  fleetIdMap: Dictionary<number>,
  rawValue = false,
  repairs: number[] = [],
  db: object,
): IShip => {
  const id = ship.api_id
  const shipId = $ship.api_id
  const typeId = $ship.api_stype
  const fleetId = fleetIdMap[ship.api_id]
  const type = ($shipTypes[$ship.api_stype] || {}).api_name
  const name = $ship.api_name
  const yomi = $ship.api_yomi
  const sortno = $ship.api_sortno!
  const lv = ship.api_lv

  const cond = ship.api_cond
  const houg = $ship.api_houg!
  const raig = $ship.api_raig!
  const tyku = $ship.api_tyku!
  const souk = $ship.api_souk!
  const luck = $ship.api_luck!
  const taik = $ship.api_taik!
  const kyouka = ship.api_kyouka

  const slot = clone(ship.api_slot)
  const exslot = ship.api_slot_ex
  const locked = ship.api_locked
  const nowhp = ship.api_nowhp
  const maxhp = ship.api_maxhp
  const losshp = ship.api_maxhp - ship.api_nowhp
  const repairtime = Math.floor(ship.api_ndock_time / 1000.0)
  const inDock = repairs.includes(ship.api_id)
  const after = parseInt($ship.api_aftershipid!, 10)
  const afterLevel = $ship.api_afterlv!
  const sallyArea = ship.api_sally_area || 0
  const soku = ship.api_soku

  // Attention this will overwrite some original properties
  const karyokuNow = houg![0] + kyouka[0]
  const karyokuMax = ship.api_karyoku[1]
  const karyoku = rawValue ? karyokuNow : ship.api_karyoku[0]
  // eslint-disable-next-line no-underscore-dangle
  const _karyoku = ship.api_karyoku[0]

  const raisouNow = raig![0] + kyouka[1]
  const raisouMax = ship.api_raisou[1]
  const raisou = rawValue ? raisouNow : ship.api_raisou[0]
  // eslint-disable-next-line no-underscore-dangle
  const _raisou = ship.api_raisou[0]

  const taikuNow = tyku![0] + kyouka[2]
  const taikuMax = ship.api_taiku[1]
  const taiku = rawValue ? taikuNow : ship.api_taiku[0]
  // eslint-disable-next-line no-underscore-dangle
  const _taiku = ship.api_taiku[0]

  const soukouNow = souk![0] + kyouka[3]
  const soukouMax = ship.api_soukou[1]
  const soukou = rawValue ? soukouNow : ship.api_soukou[0]
  // eslint-disable-next-line no-underscore-dangle
  const _soukou = ship.api_soukou[0]

  const luckyNow = luck![0] + kyouka[4]
  const luckyMax = ship.api_lucky[1]
  const lucky = rawValue ? luckyNow : ship.api_lucky[0]
  // eslint-disable-next-line no-underscore-dangle
  const _lucky = ship.api_lucky[0]

  const isCompleted =
    karyokuNow >= karyokuMax &&
    raisouNow >= raisouMax &&
    taikuNow >= taikuMax &&
    soukouNow >= soukouMax

  // get raw kaihi, taisen and sakuteki value by substracting effects of equipments
  let kaihi = ship.api_kaihi[0]
  let taisen = ship.api_taisen[0]
  let sakuteki = ship.api_sakuteki[0]

  if (rawValue) {
    kaihi = getValueByLevel(
      _.get(db, ['ships', shipId, 'stat', 'evasion'], 0),
      _.get(db, ['ships', shipId, 'stat', 'evasion_max'], 0),
      lv,
    )
    taisen = getValueByLevel(
      _.get(db, ['ships', shipId, 'stat', 'asw'], 0),
      _.get(db, ['ships', shipId, 'stat', 'asw_max'], 0),
      lv,
    )
    sakuteki = getValueByLevel(
      _.get(db, ['ships', shipId, 'stat', 'los'], 0),
      _.get(db, ['ships', shipId, 'stat', 'los_max'], 0),
      lv,
    )
  }

  // 24 = 上陸用舟艇, 46 = 特型内火艇
  const daihatsuItems = _([24, 46]).map(i =>
    _.find(get(db, 'item_types'), t => t.id_ingame === i),
  )

  const daihatsuShips = daihatsuItems
    .flatMap('equipable_extra_ship')
    .value() as number[]
  const daihastuTypes = daihatsuItems
    .flatMap('equipable_on_type')
    .value() as number[]

  const daihatsu =
    daihatsuShips.includes(shipId) ||
    daihastuTypes.includes(get(db, ['ships', shipId, 'type']))

  return {
    id,
    shipId,
    typeId,
    fleetId,
    type,
    name,
    yomi,
    sortno,
    lv,
    cond,
    karyoku,
    houg,
    raisou,
    raig,
    taiku,
    tyku,
    soukou,
    souk,
    lucky,
    luck,
    kyouka,
    kaihi,
    taisen,
    sakuteki,
    slot,
    exslot,
    locked,
    nowhp,
    maxhp,
    losshp,
    repairtime,
    inDock,
    after,
    afterLevel,
    sallyArea,
    soku,
    karyokuNow,
    karyokuMax,
    _karyoku,
    raisouNow,
    raisouMax,
    _raisou,
    taikuNow,
    taikuMax,
    _taiku,
    soukouNow,
    soukouMax,
    _soukou,
    luckyNow,
    luckyMax,
    _lucky,
    isCompleted,
    daihatsu,
    taik,
  }
}

export const shipInfoShape = {
  id: PropTypes.number.isRequired,
  typeId: PropTypes.number.isRequired,
  fleetId: PropTypes.number.isRequired,
  type: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  yomi: PropTypes.string.isRequired,
  sortno: PropTypes.number.isRequired,
  lv: PropTypes.number.isRequired,
  cond: PropTypes.number.isRequired,
  karyoku: PropTypes.number.isRequired,
  houg: PropTypes.arrayOf(PropTypes.number).isRequired,
  raisou: PropTypes.number.isRequired,
  raig: PropTypes.arrayOf(PropTypes.number).isRequired,
  taiku: PropTypes.number.isRequired,
  tyku: PropTypes.arrayOf(PropTypes.number).isRequired,
  soukou: PropTypes.number.isRequired,
  souk: PropTypes.arrayOf(PropTypes.number).isRequired,
  lucky: PropTypes.number.isRequired,
  luck: PropTypes.arrayOf(PropTypes.number).isRequired,
  kyouka: PropTypes.arrayOf(PropTypes.number).isRequired,
  kaihi: PropTypes.number.isRequired,
  taisen: PropTypes.number.isRequired,
  sakuteki: PropTypes.number.isRequired,
  slot: PropTypes.arrayOf(PropTypes.number).isRequired,
  exslot: PropTypes.number.isRequired,
  locked: PropTypes.number.isRequired,
  nowhp: PropTypes.number.isRequired,
  maxhp: PropTypes.number.isRequired,
  losshp: PropTypes.number.isRequired,
  repairtime: PropTypes.number.isRequired,
  after: PropTypes.number.isRequired,
  afterLevel: PropTypes.number.isRequired,
  sallyArea: PropTypes.number,
  soku: PropTypes.number.isRequired,
  karyokuNow: PropTypes.number.isRequired,
  karyokuMax: PropTypes.number.isRequired,
  raisouNow: PropTypes.number.isRequired,
  raisouMax: PropTypes.number.isRequired,
  taikuNow: PropTypes.number.isRequired,
  taikuMax: PropTypes.number.isRequired,
  soukouNow: PropTypes.number.isRequired,
  soukouMax: PropTypes.number.isRequired,
  luckyNow: PropTypes.number.isRequired,
  luckyMax: PropTypes.number.isRequired,
  isCompleted: PropTypes.bool.isRequired,
  daihatsu: PropTypes.bool.isRequired,
}
/* tslint:enable:object-literal-sort-keys */

const jpCollator = new Intl.Collator('ja-JP')

export const nameCompare = (a: IShip, b: IShip) => {
  if (a.yomi === b.yomi) {
    if (a.lv !== b.lv) {
      return a.lv - b.lv
    }
    if (a.id !== b.id) {
      return -(a.id - b.id)
    }
  }
  return jpCollator.compare(a.yomi, b.yomi)
}

// katagana to hiragana
export const katakanaToHiragana = (str: string) =>
  str.replace(/[\u30a1-\u30f6]/g, match => {
    const chr = match.charCodeAt(0) - 0x60
    return String.fromCharCode(chr)
  })

export const getKanaSortValues = (str: string) =>
  katakanaToHiragana(str)
    .split('')
    .map(s => s.charCodeAt(0))

// following function is used to convert betweern array of booleans and int
// leading true value is to ensure the bit length
// 12 => '1100' => [true, true, false, false] => [true, false, false]
// [true, false, false] => [true, true, false, false] => '1100' => 12
export const intToBoolArray = (int = 0) => {
  const boolArray = int
    .toString(2)
    .split('')
    .map(s => !!+s)
  boolArray.shift()
  return boolArray
}

export const boolArrayToInt = (boolArray: boolean[] = []) => {
  const arr = boolArray.slice()
  arr.unshift(true)
  const str = arr.map(bool => +bool).join('')
  return parseInt(str, 2)
}

export const reverseSuperTypeMap = _(shipSuperTypeMap)
  .flatMap(({ id }, index) =>
    _(id)
      .map(type => [type, index])
      .value(),
  )
  .fromPairs()
  .value()

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

export const hexToRGBA = (hex: string, opacity = 1) => {
  if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
    const color = hex.substring(1)
    let colors
    if (color.length === 3) {
      colors = [
        color[0],
        color[0],
        color[1],
        color[1],
        color[2],
        color[2],
      ].join('')
    } else {
      return ''
    }
    const r = parseInt(colors.slice(0, 2), 16)
    const g = parseInt(colors.slice(2, 4), 16)
    const b = parseInt(colors.slice(4, 6), 16)
    return `rgba(${r}, ${g}, ${b}, ${opacity})`
  }
  return ''
}

export const solomonShips = [
  {
    name: 'ビラ・スタンモーア夜戦',
    ships: [44],
  },
  {
    name: 'い号作戦',
    ships: [111, 116, 92, 75],
  },
  {
    name: 'クラ湾夜戦',
    ships: [169, 170, 46, 32, 479, 28, 6, 7, 31],
  },
  {
    name: 'コロンバンガラ島沖海戦',
    ships: [55, 7, 20, 170],
  },
  {
    name: 'ブーゲンビル島への輸送',
    ships: [55, 7, 20, 170, 137, 183, 454, 455, 167, 532, 423],
  },
  {
    name: 'ベラ湾夜戦',
    ships: [454, 455, 459, 43],
  },
  {
    name: '第一次ベララベラ海戦',
    ships: [94, 170, 167, 43],
  },
  {
    name: '第二次ベララベラ海戦',
    ships: [132, 133, 453, 167, 43, 46, 29, 474],
  },
  {
    name: 'ラバウル空襲',
    ships: [
      62,
      66,
      67,
      69,
      68,
      124,
      137,
      138,
      42,
      43,
      46,
      31,
      481,
      485,
      479,
      50,
    ],
  },
  {
    name: 'ブーゲンビル島沖海戦',
    ships: [62, 65, 54, 21, 42, 43, 46, 165, 28, 29, 481],
  },
  {
    name: 'セント・ジョージ岬沖海戦',
    ships: [479, 165],
  },
]

export const euroShips = [
  {
    name: '🇬🇧 Royal Navy',
    ships: [78, 439, 515, 519],
  },
  {
    name: '🇩🇪 Kriegsmarine',
    ships: [171, 174, 175, 176, 431, 432],
  },
  {
    name: '🇮🇹 Regia Marina',
    ships: [441, 442, 443, 444, 448, 449, 535],
  },
  {
    name: '🇫🇷 Marine nationale',
    ships: [491, 492],
  },
  {
    name: '🇷🇺 Военно-Морской Флот СССР',
    ships: [147, 511, 516],
  },
]

// http://pwencycl.kgbudge.com/L/e/Leyte_Gulf.htm
// https://ja.wikipedia.org/wiki/レイテ沖海戦
// _.map(names, name => _.get(_.find($ships, ship => ship.api_name.startsWith(name)), 'api_id'))
export const leyteFleets = [
  // 瑞鶴
  // 千代田
  // 千歳
  // 瑞鳳
  // 伊勢、日向
  // 多摩、五十鈴
  // 大淀
  // 初月、若月、秋月
  // 霜月
  {
    name: 'IJN Mobile Force (Ozawa)', // 機動部隊本隊
    ships: [111, 103, 102, 116, 77, 87, 100, 22, 183, 423, 421],
  },
  // 愛宕、高雄、摩耶、鳥海
  // 大和、武蔵、長門
  // 妙高、羽黒
  // 能代 島風
  // 早霜、秋霜
  // 岸波、沖波、朝霜、長波
  // 浜波、藤波
  {
    name: 'IJN First Striking First Section (Kurita)', // 第一遊撃部隊 第一部隊
    ships: [
      67,
      66,
      68,
      69,
      131,
      143,
      80,
      62,
      65,
      138,
      50,
      409,
      452,
      425,
      135,
      485,
    ],
  },
  // 金剛、榛名
  // 鈴谷、熊野、利根、筑摩
  // 矢矧 浦風、磯風、雪風、浜風、清霜、野分
  {
    name: 'IJN First Striking Second Section (Suzuki)', // 第一遊撃部隊 第二部隊
    ships: [78, 79, 124, 125, 71, 72, 139, 168, 167, 20, 170, 410, 415],
  },
  // 山城、扶桑
  // 最上
  // 時雨
  // 山雲、満潮、朝雲
  {
    name: 'IJN First Striking Third Section (Nishimura)', // 第一遊撃部隊 第三部隊
    ships: [27, 26, 70, 43, 414, 97, 413],
  },
  // 那智、足柄
  // 阿武隈
  // 曙、潮、霞
  // 不知火
  // 若葉、初春、初霜
  // 青葉
  // 鬼怒
  // 浦波
  {
    name: 'IJN Second Striking Force (Shima)', // 第二遊撃部隊
    ships: [63, 64, 114, 15, 16, 49, 18, 40, 38, 41, 61, 113, 486],
  },
  // Iowa
  // 'Iowa'
  {
    name: 'USN Task Force 38 Fast Carrier Force', // 第38任務部隊
    ships: [440],
  },
]

export const fileUrl = (pathname: string): string =>
  url.format({
    pathname,
    protocol: 'file',
    slashes: true,
  })

export const captureRect = async (rect: HTMLElement) => {
  if (!rect) {
    return
  }
  const { width, height } = rect.getBoundingClientRect()

  let canvas

  try {
    canvas = await html2canvas(rect, {
      allowTaint: true,
      backgroundColor: '#333',
      height: _.ceil(height, 16),
      width: _.ceil(width, 16),
    })
  } catch (e) {
    console.error(e)
    return
  }
  remote.getCurrentWebContents().downloadURL(canvas.toDataURL('image/png'))
}
