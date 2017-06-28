import { get, map } from 'lodash'

const { __, _slotitems, $slotitems, $ships } = window

const getItemName = index => (ship) => {
  const itemId = get(_slotitems, `${get(ship, `slot.${index}`)}.api_slotitem_id`)
  return get($slotitems, `${itemId}.api_name`)
}

const getExItemName = (ship) => {
  const itemId = get(_slotitems, `${get(ship, 'exslot')}.api_slotitem_id`)
  return get($slotitems, `${itemId}.api_name`)
}

const buildConstFields = key => ([
  {
    key,
    value: ship => get(ship, `${key}.0`),
  },
  {
    key: `${key}Max`,
    value: ship => get(ship, `${key}.1`),
  },
])

const buildSlotItemFields = index => ([
  {
    key: `slot${index}`,
    value: getItemName(index),
  },
  {
    key: `slot${index}Alv`,
    value: ship => get(_slotitems, `${get(ship, `slot.${index}`)}.api_alv`),
  },
  {
    key: `slot${index}Level`,
    value: ship => get(_slotitems, `${get(ship, `slot.${index}`)}.api_level`),
  },
])

const buildKyoukaFields = () => [0, 1, 2, 3, 4].map(index => ({
  key: `kyouka${index}`,
  value: ship => get(ship, `kyouka.${index}`),
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
  'karyoku',
  'karyokuNow',
  'karyokuMax',
  ...buildConstFields('houg'),
  'raisou',
  'raisouNow',
  'raisouMax',
  ...buildConstFields('raig'),
  'taiku',
  'taikuNow',
  'taikuMax',
  ...buildConstFields('tyku'),
  'soukou',
  'soukouNow',
  'soukouMax',
  ...buildConstFields('souk'),
  'lucky',
  'luckyNow',
  'luckyMax',
  ...buildConstFields('luck'),
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
    value: ship => get(_slotitems, `${get(ship, 'exslot')}.api_alv`),
  },
  {
    key: 'exslotLevel',
    value: ship => get(_slotitems, `${get(ship, 'exslot')}.api_level`),
  },
  'locked',
  'nowhp',
  'maxhp',
  'losshp',
  'repairtime',
  'inDock',
  {
    key: 'after',
    value: ship => get($ships, `${ship.after}.api_name`),
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
