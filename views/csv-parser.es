import { get, map } from 'lodash'

const {
  _slotitems, $slotitems, $ships,
} = window
const { __ } = window.i18n['poi-plugin-ship-info']

const getItemName = index => (ship) => {
  const itemId = get(_slotitems, `${get(ship, `slot.${index}`)}.api_slotitem_id`)
  return get($slotitems, `${itemId}.api_name`, 'NA')
}

const getExItemName = (ship) => {
  const itemId = get(_slotitems, `${get(ship, 'exslot')}.api_slotitem_id`)
  return get($slotitems, `${itemId}.api_name`, 'NA')
}

const buildConstFields = key => ([
  {
    key,
    value: ship => get(ship, `${key}.0`, 'NA'),
  },
])

const buildSlotItemFields = index => ([
  {
    key: `slot${index}`,
    value: getItemName(index),
  },
  {
    key: `slot${index}Alv`,
    value: ship => get(_slotitems, `${get(ship, `slot.${index}`)}.api_alv`, 'NA'),
  },
  {
    key: `slot${index}Level`,
    value: ship => get(_slotitems, `${get(ship, `slot.${index}`)}.api_level`, 'NA'),
  },
])

const buildKyoukaFields = () => [0, 1, 2, 3, 4].map(index => ({
  key: `kyouka${index}`,
  value: ship => get(ship, `kyouka.${index}`, 'NA'),
}))

export const fields = [
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

export const parseCsv = (rows, sep = ',', end = '\n') => {
  const entries = map(rows, row =>
    map(fields, field =>
      field.key
        ? field.value(row)
        : get(row, field)
    )
  )

  const titles = map(fields, field => __(field.key || field))

  entries.unshift(titles)
  return map(entries, entry => entry.join(sep)).join(end)
}
