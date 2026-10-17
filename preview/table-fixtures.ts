import { mkMstShip, mkShip } from '../tests/fixtures'

// Rich, deterministic browser fixtures for the table/filter/export stories.
// Every attribute a filter or cell reads is varied across ships so stories can
// assert real rendered rows. This module is pure (no jsdom, no vitest).

const PLUGIN_KEY = 'poi-plugin-ship-info'

const mst = (over: Record<string, any>) =>
  mkMstShip({ api_taik: [30, 30], ...over })

// Ship types present in the fixture. Contiguous ids 1..8 because the ship-type
// filter UI maps config bits positionally to these keys; api_id matches the key
// so the individual type cards can render their label.
export const tableShipTypes = {
  1: { api_id: 1, api_name: 'DE' },
  2: { api_id: 2, api_name: 'DD' },
  3: { api_id: 3, api_name: 'CL' },
  4: { api_id: 4, api_name: 'CLT' },
  5: { api_id: 5, api_name: 'CA' },
  6: { api_id: 6, api_name: 'CAV' },
  7: { api_id: 7, api_name: 'CVL' },
  8: { api_id: 8, api_name: 'BB' },
}

// Equipment master data, keyed by api_slotitem_id.
export const tableMstEquips = {
  100: { api_name: '12cm Single Gun', api_type: [1, 1, 3, 1] },
  101: { api_name: 'Type 22 Radar', api_type: [5, 8, 12, 5] },
  102: { api_name: 'Type 0 Recon', api_type: [5, 7, 10, 5] },
}

// Equipment instances owned by ships, keyed by the slot's instance id.
export const tableEquips = {
  7: { api_alv: 5, api_id: 7, api_level: 2, api_slotitem_id: 100 },
  8: { api_id: 8, api_level: 0, api_slotitem_id: 101 },
  9: { api_alv: 3, api_id: 9, api_level: 4, api_slotitem_id: 102 },
}

// db powers daihatsu-equippability and the raw-value level interpolation.
export const tableDb = {
  item_types: [
    {
      equipable_extra_ship: [1],
      equipable_on_type: [],
      id_ingame: 24,
    },
    {
      equipable_extra_ship: [],
      equipable_on_type: [],
      id_ingame: 46,
    },
  ],
  ships: {
    1: {
      stat: {
        asw: 20,
        asw_max: 60,
        evasion: 40,
        evasion_max: 80,
        los: 10,
        los_max: 30,
      },
      type: 2,
    },
    2: { stat: { asw: 20, asw_max: 60, evasion: 50, evasion_max: 90 }, type: 2 },
    3: { stat: { asw: 30, asw_max: 70, evasion: 30, evasion_max: 70 }, type: 3 },
    4: { stat: { asw: 40, asw_max: 80, evasion: 25, evasion_max: 65 }, type: 5 },
    5: { stat: { asw: 10, asw_max: 40, evasion: 20, evasion_max: 50 }, type: 8 },
    6: { stat: { asw: 10, asw_max: 40, evasion: 20, evasion_max: 50 }, type: 8 },
    7: { stat: { asw: 30, asw_max: 70, evasion: 30, evasion_max: 70 }, type: 3 },
    8: { stat: { asw: 20, asw_max: 60, evasion: 50, evasion_max: 90 }, type: 2 },
  },
}

export const tableFcd = {
  shipavatar: { marginMagics: {} },
  shiptag: {
    color: ['#ff0000', '#00ff00'],
    fleetname: { 'en-US': ['Fleet A', 'Fleet B'] },
    mapname: ['E1', 'E2'],
  },
}

// fleets drive the fleet icon and the in-fleet / expedition filters.
export const tableFleets = [[1, 2], [3], [], []]
export const tableExpedition = [0]
export const tableRepairs = [5]

const rawShips: Record<number, Record<string, any>> = {
  1: {
    api_cond: 60,
    api_id: 1,
    api_kyouka: [10, 10, 10, 10, 0],
    api_locked: 0,
    api_lv: 50,
    api_ndock_time: 0,
    api_sally_area: 0,
    api_slot: [7, 0, 0, 0],
    api_slot_ex: 8,
  },
  2: {
    api_cond: 30,
    api_id: 2,
    api_locked: 1,
    api_lv: 10,
    api_sally_area: 1,
    api_slot: [0, 0, 0, 0],
    api_slot_ex: 9,
  },
  3: {
    api_cond: 40,
    api_id: 3,
    api_kyouka: [10, 10, 10, 10, 0],
    api_lv: 150,
    api_ndock_time: 65000,
    api_sally_area: 0,
    api_slot: [0, 0, 0, 0],
    api_slot_ex: 0,
  },
  4: {
    api_cond: 20,
    api_id: 4,
    api_locked: 1,
    api_lv: 100,
    api_sally_area: 2,
    api_slot: [0, 0, 0, 0],
    api_slot_ex: 0,
  },
  5: {
    api_cond: 50,
    api_id: 5,
    api_kyouka: [10, 10, 10, 10, 0],
    api_lv: 1,
    api_ndock_time: 30000,
    api_sally_area: 0,
    api_slot: [0, 0, 0, 0],
    api_slot_ex: 0,
  },
  6: {
    api_cond: 10,
    api_id: 6,
    api_lv: 200,
    api_sally_area: 1,
    api_slot: [0, 0, 0, 0],
    api_slot_ex: 0,
  },
  7: {
    api_cond: 50,
    api_id: 7,
    api_kyouka: [10, 10, 10, 10, 0],
    api_locked: 1,
    api_lv: 80,
    api_sally_area: 2,
    api_slot: [0, 0, 0, 0],
    api_slot_ex: 0,
  },
  8: {
    api_cond: 80,
    api_id: 8,
    api_lv: 5,
    api_sally_area: 0,
    api_slot: [0, 0, 0, 0],
    api_slot_ex: 0,
  },
}

const rawMstShips: Record<number, Record<string, any>> = {
  1: { api_aftershipid: '0', api_id: 1, api_name: 'Alpha', api_stype: 2 },
  2: { api_aftershipid: '3', api_id: 2, api_name: 'Beta', api_stype: 2 },
  3: { api_aftershipid: '0', api_id: 3, api_name: 'Gamma', api_stype: 3 },
  4: { api_aftershipid: '5', api_id: 4, api_name: 'Delta', api_stype: 5 },
  5: { api_aftershipid: '0', api_id: 5, api_name: 'Epsilon', api_stype: 8 },
  6: { api_aftershipid: '0', api_id: 6, api_name: 'Zeta', api_stype: 8 },
  7: { api_aftershipid: '9', api_id: 7, api_name: 'Eta', api_stype: 3 },
  8: { api_aftershipid: '0', api_id: 8, api_name: 'Theta', api_stype: 2 },
}

const yomi: Record<number, string> = {
  1: 'アルファ',
  2: 'ベータ',
  3: 'ガンマ',
  4: 'デルタ',
  5: 'イプシロン',
  6: 'ゼータ',
  7: 'イータ',
  8: 'シータ',
}

export const tableShips = Object.fromEntries(
  Object.entries(rawShips).map(([id, over]) => [id, mkShip(over)]),
)

export const tableMstShips = Object.fromEntries(
  Object.entries(rawMstShips).map(([id, over]) => [
    id,
    mst({
      api_sortno: +id * 10,
      api_yomi: yomi[+id],
      ...over,
    }),
  ]),
)

const baseState = () => ({
  config: {
    plugin: { ShipInfo: {} },
    poi: { appearance: { avatar: false } },
  },
  const: {
    $equips: tableMstEquips,
    $shipgraph: [],
    $ships: tableMstShips,
    $shipTypes: tableShipTypes,
  },
  db: tableDb,
  expedition: [...tableExpedition],
  fcd: tableFcd,
  fleets: tableFleets.map((fleet) => [...fleet]),
  info: { equips: tableEquips, server: { ip: '1.2.3.4' }, ships: tableShips },
  repairs: [...tableRepairs],
  [PLUGIN_KEY]: { ready: true },
})

export const tableState = (over: Record<string, any> = {}) => ({
  ...baseState(),
  ...over,
})

const VIRTUAL_SHIP_COUNT = 40
const VIRTUAL_ROW = 35

export const virtualShipCount = VIRTUAL_SHIP_COUNT
export const virtualRowHeight = VIRTUAL_ROW

export const virtualShips = Object.fromEntries(
  Array.from({ length: VIRTUAL_SHIP_COUNT }, (_, i) => {
    const id = i + 1
    return [
      id,
      mkShip({ api_id: id, api_lv: id, api_sally_area: id % 2 }),
    ]
  }),
)

export const virtualMstShips = Object.fromEntries(
  Array.from({ length: VIRTUAL_SHIP_COUNT }, (_, i) => {
    const id = i + 1
    return [
      id,
      mst({
        api_id: id,
        api_name: `Ship ${id}`,
        api_sortno: id,
        api_stype: 2,
        api_yomi: `シップ${id}`,
      }),
    ]
  }),
)

export const virtualTableState = (over: Record<string, any> = {}) =>
  tableState({
    const: {
      $equips: tableMstEquips,
      $shipgraph: [],
      $ships: virtualMstShips,
      $shipTypes: tableShipTypes,
    },
    info: {
      equips: tableEquips,
      server: { ip: '1.2.3.4' },
      ships: virtualShips,
    },
    ...over,
  })

export const emptyTableState = (over: Record<string, any> = {}) =>
  tableState({
    const: {
      $equips: {},
      $shipgraph: [],
      $ships: {},
      $shipTypes: tableShipTypes,
    },
    info: { equips: {}, server: { ip: '1.2.3.4' }, ships: {} },
    ...over,
  })
