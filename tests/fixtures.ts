import { IShipRawData } from '../packages/ship-info/src/views/types'

// Minimal but realistic raw API shapes. Only the fields the exercised code paths
// read are populated; everything else is left off on purpose.

export const mkShip = (over: Record<string, any> = {}): any => ({
  api_cond: 49,
  api_exp: [0, 0],
  api_id: 1,
  // Owned ships are keyed by instance id; master data is at `$ships[api_ship_id]`.
  // Default the master id to the instance id, matching these fixtures; override
  // to model a distinct instance/master pair.
  api_ship_id: over.api_id ?? 1,
  api_kaihi: [40, 80],
  api_karyoku: [10, 20],
  api_kyouka: [0, 0, 0, 0, 0],
  api_locked: 0,
  api_lucky: [5, 10],
  api_lv: 1,
  api_maxhp: 30,
  api_ndock_time: 0,
  api_nowhp: 30,
  api_raisou: [10, 20],
  api_saku: [10, 30],
  api_sakuteki: [10, 30],
  api_sally_area: 0,
  api_slot: [-1, -1, -1, -1],
  api_slot_ex: 0,
  api_soku: 10,
  api_soukou: [10, 20],
  api_taiku: [10, 20],
  api_taisen: [20, 60],
  ...over,
})

export const mkMstShip = (over: Record<string, any> = {}): any => ({
  api_aftershipid: '0',
  api_houg: [10, 20, 30],
  api_id: 1,
  api_luck: [5, 10, 99],
  api_name: 'Ship',
  api_raig: [10, 20, 30],
  api_sortno: 1,
  api_souk: [10, 20, 30],
  api_stype: 2,
  api_tyku: [10, 20, 30],
  api_yomi: 'シップ',
  ...over,
})

export const mkDb = (over: Record<string, any> = {}): any => ({
  item_types: [],
  ships: {},
  ...over,
})

export const mkRow = (over: Record<string, any> = {}): IShipRawData =>
  ({
    db: mkDb(),
    equips: {},
    fleetIdMap: {},
    rawValue: false,
    repairs: [],
    ship: mkShip(),
    $ship: mkMstShip(),
    $shipTypes: {},
    ...over,
  }) as IShipRawData
