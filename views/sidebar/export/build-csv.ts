import { get, map } from 'lodash'
import i18next from 'views/env-parts/i18next'
import { IShipRawData } from '../../table/cells'
import {
  computeKaryokuNow,
  computeRaisouNow,
  computeTaikuNow,
  computeSoukouNow,
  computeLuckyNow,
} from '../../utils'

let _slotitems: any
let $slotitems: any
let $ships: any

const __ = i18next.getFixedT(null, ['poi-plugin-ship-info', 'resources'])

const getItemName = (index: number) => (data: IShipRawData) => {
  const itemId = get(_slotitems, `${data.ship.api_slot[index]}.api_slotitem_id`)
  return get($slotitems, `${itemId}.api_name`, 'NA')
}

const getExItemName = (data: IShipRawData) => {
  const itemId = get(_slotitems, `${data.ship.api_slot_ex}.api_slotitem_id`)
  return get($slotitems, `${itemId}.api_name`, 'NA')
}

const buildConstFields = (apiKey: string) => [
  {
    key: apiKey,
    value: (data: IShipRawData) => {
      const value = data.$ship[`api_${apiKey}` as keyof typeof data.$ship]
      return Array.isArray(value) ? value[0] : 'NA'
    },
  },
]

const buildSlotItemFields = (index: number) => [
  {
    key: `slot${index}`,
    value: getItemName(index),
  },
  {
    key: `slot${index}Alv`,
    value: (data: IShipRawData) =>
      get(_slotitems, `${data.ship.api_slot[index]}.api_alv`, 'NA'),
  },
  {
    key: `slot${index}Level`,
    value: (data: IShipRawData) =>
      get(_slotitems, `${data.ship.api_slot[index]}.api_level`, 'NA'),
  },
]

const buildKyoukaFields = () =>
  [0, 1, 2, 3, 4].map((index) => ({
    key: `kyouka${index}`,
    value: (data: IShipRawData) => data.ship.api_kyouka[index] ?? 'NA',
  }))

interface IFieldWithKey {
  key: string
  value: (data: IShipRawData) => string | number
}

export const fields: Array<IFieldWithKey | string> = [
  { key: 'id', value: (data: IShipRawData) => data.ship.api_id },
  { key: 'name', value: (data: IShipRawData) => data.$ship.api_name },
  { key: 'yomi', value: (data: IShipRawData) => data.$ship.api_yomi },
  {
    key: 'fleetId',
    value: (data: IShipRawData) => data.fleetIdMap[data.ship.api_id],
  },
  {
    key: 'sallyArea',
    value: (data: IShipRawData) => data.ship.api_sally_area || 0,
  },
  {
    key: 'type',
    value: (data: IShipRawData) =>
      (data.$shipTypes[data.$ship.api_stype] || {}).api_name || 'NA',
  },
  { key: 'soku', value: (data: IShipRawData) => data.ship.api_soku },
  { key: 'lv', value: (data: IShipRawData) => data.ship.api_lv },
  { key: 'cond', value: (data: IShipRawData) => data.ship.api_cond },
  { key: '_karyoku', value: (data: IShipRawData) => data.ship.api_karyoku[0] },
  {
    key: 'karyokuNow',
    value: (data: IShipRawData) => computeKaryokuNow(data.ship, data.$ship),
  },
  ...buildConstFields('houg'),
  {
    key: 'karyokuMax',
    value: (data: IShipRawData) => data.ship.api_karyoku[1],
  },
  { key: '_raisou', value: (data: IShipRawData) => data.ship.api_raisou[0] },
  {
    key: 'raisouNow',
    value: (data: IShipRawData) => computeRaisouNow(data.ship, data.$ship),
  },
  ...buildConstFields('raig'),
  { key: 'raisouMax', value: (data: IShipRawData) => data.ship.api_raisou[1] },
  { key: '_taiku', value: (data: IShipRawData) => data.ship.api_taiku[0] },
  {
    key: 'taikuNow',
    value: (data: IShipRawData) => computeTaikuNow(data.ship, data.$ship),
  },
  ...buildConstFields('tyku'),
  { key: 'taikuMax', value: (data: IShipRawData) => data.ship.api_taiku[1] },
  { key: '_soukou', value: (data: IShipRawData) => data.ship.api_soukou[0] },
  {
    key: 'soukouNow',
    value: (data: IShipRawData) => computeSoukouNow(data.ship, data.$ship),
  },
  ...buildConstFields('souk'),
  { key: 'soukouMax', value: (data: IShipRawData) => data.ship.api_soukou[1] },
  { key: '_lucky', value: (data: IShipRawData) => data.ship.api_lucky[0] },
  {
    key: 'luckyNow',
    value: (data: IShipRawData) => computeLuckyNow(data.ship, data.$ship),
  },
  ...buildConstFields('luck'),
  { key: 'luckyMax', value: (data: IShipRawData) => data.ship.api_lucky[1] },
  ...buildKyoukaFields(),
  { key: 'kaihi', value: (data: IShipRawData) => data.ship.api_kaihi[0] },
  { key: 'taisen', value: (data: IShipRawData) => data.ship.api_taisen[0] },
  { key: 'sakuteki', value: (data: IShipRawData) => data.ship.api_sakuteki[0] },
  ...buildSlotItemFields(0),
  ...buildSlotItemFields(1),
  ...buildSlotItemFields(2),
  ...buildSlotItemFields(3),
  {
    key: 'exslot',
    value: getExItemName,
  },
  {
    key: 'exslotAlv',
    value: (data: IShipRawData) =>
      get(_slotitems, `${data.ship.api_slot_ex}.api_alv`, 'NA'),
  },
  {
    key: 'exslotLevel',
    value: (data: IShipRawData) =>
      get(_slotitems, `${data.ship.api_slot_ex}.api_level`, 'NA'),
  },
  { key: 'locked', value: (data: IShipRawData) => data.ship.api_locked },
  { key: 'nowhp', value: (data: IShipRawData) => data.ship.api_nowhp },
  { key: 'maxhp', value: (data: IShipRawData) => data.ship.api_maxhp },
  {
    key: 'losshp',
    value: (data: IShipRawData) => data.ship.api_maxhp - data.ship.api_nowhp,
  },
  {
    key: 'repairtime',
    value: (data: IShipRawData) =>
      Math.floor(data.ship.api_ndock_time / 1000.0),
  },
  {
    key: 'inDock',
    value: (data: IShipRawData) => data.repairs.includes(data.ship.api_id),
  },
  {
    key: 'after',
    value: (data: IShipRawData) => {
      const afterId = parseInt(data.$ship.api_aftershipid || '0', 10)
      return get($ships, `${afterId}.api_name`, 'NA')
    },
  },
]

export const buildCsv = (rows: IShipRawData[], sep = ',', end = '\n') => {
  const state = window.getStore()

  _slotitems = state.info.equips
  $slotitems = state.const.$equips
  $ships = state.const.$ships

  const entries = map(rows, (row) =>
    map(fields, (field) => (field as IFieldWithKey).value(row)),
  )

  const titles = map(fields, (field) => __((field as IFieldWithKey).key))

  entries.unshift(titles)
  return map(entries, (entry) => entry.join(sep)).join(end)
}
