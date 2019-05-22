import { get, map } from 'lodash'
import i18next from 'views/env-parts/i18next'
import { IShip } from '../../types'

let _slotitems: any
let $slotitems: any
let $ships: any

const __ = i18next.getFixedT(null, ['poi-plugin-ship-info', 'resources'])

const getItemName = (index: number) => (ship: any) => {
  const itemId = get(
    _slotitems,
    `${get(ship, `slot.${index}`)}.api_slotitem_id`,
  )
  return get($slotitems, `${itemId}.api_name`, 'NA')
}

const getExItemName = (ship: any) => {
  const itemId = get(_slotitems, `${get(ship, 'exslot')}.api_slotitem_id`)
  return get($slotitems, `${itemId}.api_name`, 'NA')
}

const buildConstFields = (key: string) => [
  {
    key,
    value: (ship: any) => get(ship, `${key}.0`, 'NA'),
  },
]

const buildSlotItemFields = (index: number) => [
  {
    key: `slot${index}`,
    value: getItemName(index),
  },
  {
    key: `slot${index}Alv`,
    value: (ship: any) =>
      get(_slotitems, `${get(ship, `slot.${index}`)}.api_alv`, 'NA'),
  },
  {
    key: `slot${index}Level`,
    value: (ship: any) =>
      get(_slotitems, `${get(ship, `slot.${index}`)}.api_level`, 'NA'),
  },
]

const buildKyoukaFields = () =>
  [0, 1, 2, 3, 4].map(index => ({
    key: `kyouka${index}`,
    value: (ship: any) => get(ship, `kyouka.${index}`, 'NA'),
  }))

interface IFieldWithKey {
  key: string
  value: (ship: any) => string
}

export const fields: Array<IFieldWithKey | string> = [
  'id',
  'name',
  'yomi',
  'fleetId',
  'sallyArea',
  'type',
  'soku',
  'lv',
  'cond',
  '_karyoku',
  'karyokuNow',
  ...buildConstFields('houg'),
  'karyokuMax',
  '_raisou',
  'raisouNow',
  ...buildConstFields('raig'),
  'raisouMax',
  '_taiku',
  'taikuNow',
  ...buildConstFields('tyku'),
  'taikuMax',
  '_soukou',
  'soukouNow',
  ...buildConstFields('souk'),
  'soukouMax',
  '_lucky',
  'luckyNow',
  ...buildConstFields('luck'),
  'luckyMax',
  ...buildKyoukaFields(),
  'kaihi',
  'taisen',
  'sakuteki',
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
    value: ship => get(_slotitems, `${get(ship, 'exslot')}.api_alv`, 'NA'),
  },
  {
    key: 'exslotLevel',
    value: ship => get(_slotitems, `${get(ship, 'exslot')}.api_level`, 'NA'),
  },
  'locked',
  'nowhp',
  'maxhp',
  'losshp',
  'repairtime',
  'inDock',
  {
    key: 'after',
    value: ship => get($ships, `${ship.after}.api_name`, 'NA'),
  },
]

export const buildCsv = (rows: IShip[], sep = ',', end = '\n') => {
  const state = window.getStore()

  _slotitems = state.info.equips
  $slotitems = state.const.$equips
  $ships = state.const.$ships

  const entries = map(rows, row =>
    map(fields, field =>
      (field as IFieldWithKey).key
        ? (field as IFieldWithKey).value(row)
        : get(row, field as string),
    ),
  )

  const titles = map(fields, field =>
    __((field as IFieldWithKey).key || (field as string)),
  )

  entries.unshift(titles)
  return map(entries, entry => entry.join(sep)).join(end)
}
