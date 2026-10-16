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

// katagana to hiragana
export const katakanaToHiragana = (str: string) =>
  str.replace(/[\u30a1-\u30f6]/g, (match) => {
    const chr = match.charCodeAt(0) - 0x60
    return String.fromCharCode(chr)
  })

export const getKanaSortValues = (str: string) =>
  katakanaToHiragana(str)
    .split('')
    .map((s) => s.charCodeAt(0))

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
      62, 66, 67, 69, 68, 124, 137, 138, 42, 43, 46, 31, 481, 485, 479, 50,
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
      67, 66, 68, 69, 131, 143, 80, 62, 65, 138, 50, 409, 452, 425, 135, 485,
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
