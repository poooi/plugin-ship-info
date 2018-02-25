import propTypes from 'prop-types'
import _, { clone } from 'lodash'
import url from 'url'
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

const getValueByLevel = (min, max, lv) => Math.floor(((max - min) * lv) / 99) + min

export const getShipInfoData = (
  ship,
  $ship,
  equips,
  $shipTypes,
  fleetIdMap,
  rawValue = false,
  repairs = [],
  db,
) => {
  const id = ship.api_id
  const shipId = $ship.api_id
  const typeId = $ship.api_stype
  const fleetId = fleetIdMap[ship.api_id]
  const type = ($shipTypes[$ship.api_stype] || {}).api_name
  const name = $ship.api_name
  const yomi = $ship.api_yomi
  const sortno = $ship.api_sortno
  const lv = ship.api_lv

  const cond = ship.api_cond
  const houg = $ship.api_houg
  const raig = $ship.api_raig
  const tyku = $ship.api_tyku
  const souk = $ship.api_souk
  const luck = $ship.api_luck
  const taik = $ship.api_taik
  const kyouka = ship.api_kyouka

  const slot = clone(ship.api_slot)
  const exslot = ship.api_slot_ex
  const locked = ship.api_locked
  const nowhp = ship.api_nowhp
  const maxhp = ship.api_maxhp
  const losshp = ship.api_maxhp - ship.api_nowhp
  const repairtime = parseInt(ship.api_ndock_time / 1000.0, 10)
  const inDock = repairs.includes(ship.api_id)
  const after = parseInt($ship.api_aftershipid, 10)
  const sallyArea = ship.api_sally_area || 0
  const soku = ship.api_soku

  // Attention this will overwrite some original properties
  const karyokuNow = houg[0] + kyouka[0]
  const karyokuMax = ship.api_karyoku[1]
  const karyoku = rawValue ? karyokuNow : ship.api_karyoku[0]
  const _karyoku = ship.api_karyoku[0]

  const raisouNow = raig[0] + kyouka[1]
  const raisouMax = ship.api_raisou[1]
  const raisou = rawValue ? raisouNow : ship.api_raisou[0]
  const _raisou = ship.api_raisou[0]

  const taikuNow = tyku[0] + kyouka[2]
  const taikuMax = ship.api_taiku[1]
  const taiku = rawValue ? taikuNow : ship.api_taiku[0]
  const _taiku = ship.api_taiku[0]

  const soukouNow = souk[0] + kyouka[3]
  const soukouMax = ship.api_soukou[1]
  const soukou = rawValue ? soukouNow : ship.api_soukou[0]
  const _soukou = ship.api_soukou[0]

  const luckyNow = luck[0] + kyouka[4]
  const luckyMax = ship.api_lucky[1]
  const lucky = rawValue ? luckyNow : ship.api_lucky[0]
  const _lucky = ship.api_lucky[0]

  const isCompleted = karyokuNow >= karyokuMax &&
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
  const daihatsu = _(db)
    .get(['ships', shipId, 'additional_item_types'], [])
    .some(i => [24, 46].includes(_.get(db, ['item_types', i, 'id_ingame'])))

  return ({
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

export const reverseSuperTypeMap = _(shipSuperTypeMap)
  .flatMap(({ id }, index) => _(id).map(type => ([type, index])).value())
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
  // '瑞鶴', '千代田', '千歳', '瑞鳳', '伊勢', '日向', '多摩', '五十鈴', '大淀', '初月', '若月', '秋月',  '霜月'
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
  // '愛宕', '高雄', '摩耶', '鳥海', '大和', '武蔵', '長門', '妙高', '羽黒', '能代','島風', '早霜', '秋霜', '岸波', '沖波', '朝霜', '長波', '浜波', '藤波'
  {
    name: 'IJN First Striking First Section (Kurita)', // 第一遊撃部隊 第一部隊
    ships: [67, 66, 68, 69, 131, 143, 80, 62, 65, 138, 50, 409, 452, 425, 135, 485],
  },
  // 金剛、榛名
  // 鈴谷、熊野、利根、筑摩
  // 矢矧 浦風、磯風、雪風、浜風、清霜、野分
  // '金剛', '榛名', '鈴谷', '熊野', '利根', '筑摩', '矢矧', '浦風', '磯風', '雪風', '浜風', '清霜', '野分'
  {
    name: 'IJN First Striking Second Section (Suzuki)', // 第一遊撃部隊 第二部隊
    ships: [78, 79, 124, 125, 71, 72, 139, 168, 167, 20, 170, 410, 415],
  },
  // 山城、扶桑
  // 最上
  // 時雨
  // 山雲、満潮、朝雲
  // '山城', '扶桑', '最上', '時雨', '山雲', '満潮', '朝雲'
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
  // '那智', '足柄', '阿武隈', '曙', '潮', '霞', '不知火', '若葉', '初春', '初霜', '青葉', '鬼怒', '浦波'
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

export const fileUrl = pathname => url.format({
  protocol: 'file',
  slashes: true,
  pathname,
})
