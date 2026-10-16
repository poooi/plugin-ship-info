import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('views/env-parts/i18next', () => ({
  default: { getFixedT: () => (key: string) => key },
}))
vi.mock('electron', () => ({ remote: {} }))

import { buildCsv } from '../packages/ship-info/src/views/sidebar/export/build-csv'
import { mkDb, mkMstShip, mkRow, mkShip } from './fixtures'

const COLUMNS = [
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
  'houg',
  'karyokuMax',
  '_raisou',
  'raisouNow',
  'raig',
  'raisouMax',
  '_taiku',
  'taikuNow',
  'tyku',
  'taikuMax',
  '_soukou',
  'soukouNow',
  'souk',
  'soukouMax',
  '_lucky',
  'luckyNow',
  'luck',
  'luckyMax',
  'kyouka0',
  'kyouka1',
  'kyouka2',
  'kyouka3',
  'kyouka4',
  'kaihi',
  'taisen',
  'sakuteki',
  'slot0',
  'slot0Alv',
  'slot0Level',
  'slot1',
  'slot1Alv',
  'slot1Level',
  'slot2',
  'slot2Alv',
  'slot2Level',
  'slot3',
  'slot3Alv',
  'slot3Level',
  'exslot',
  'exslotAlv',
  'exslotLevel',
  'locked',
  'nowhp',
  'maxhp',
  'losshp',
  'repairtime',
  'inDock',
  'after',
]

const storeState = {
  const: {
    $equips: {
      100: { api_name: '12cm Gun' },
      200: { api_name: 'Type 0' },
    },
    $ships: { 2: { api_name: 'Alpha Kai' } },
  },
  info: {
    equips: {
      7: { api_alv: 5, api_level: 2, api_slotitem_id: 100 },
      8: { api_slotitem_id: 200 },
    },
  },
}

const setStore = (over: any = {}) => {
  ;(window as any).getStore = () => ({ ...storeState, ...over })
}

const rowA = () =>
  mkRow({
    $ship: mkMstShip({
      api_aftershipid: '2',
      api_houg: [10, 20, 30],
      api_id: 1,
      api_luck: [6, 16, 99],
      api_name: 'Alpha',
      api_raig: [11, 21, 31],
      api_souk: [13, 23, 33],
      api_stype: 2,
      api_tyku: [12, 22, 32],
      api_yomi: 'アルファ',
    }),
    $shipTypes: { 2: { api_name: 'DD' } },
    db: mkDb(),
    fleetIdMap: { 1: 0 },
    repairs: [1],
    ship: mkShip({
      api_cond: 55,
      api_id: 1,
      api_kaihi: [40, 80],
      api_karyoku: [10, 20],
      api_kyouka: [1, 2, 3, 4, 5],
      api_locked: 1,
      api_lucky: [6, 16],
      api_lv: 42,
      api_maxhp: 30,
      api_ndock_time: 65000,
      api_nowhp: 20,
      api_raisou: [11, 21],
      api_saku: [10, 30],
      api_sakuteki: [10, 30],
      api_sally_area: 2,
      api_slot: [7, 0, 0, 0],
      api_slot_ex: 8,
      api_soku: 10,
      api_soukou: [13, 23],
      api_taiku: [12, 22],
      api_taisen: [20, 60],
    }),
  })

const parse = (csv: string, sep = ',', end = '\n') =>
  csv.split(end).map((line) => line.split(sep))

const toMap = (header: string[], values: string[]) =>
  Object.fromEntries(header.map((key, i) => [key, values[i]]))

describe('buildCsv', () => {
  beforeEach(() => setStore())

  it('emits the exact column order as the header row', () => {
    const [header] = parse(buildCsv([rowA()]))
    expect(header).toEqual(COLUMNS)
  })

  it('writes ship, computed and equipment values', () => {
    const [header, values] = parse(buildCsv([rowA()]))
    const row = toMap(header, values)

    expect(row).toMatchObject({
      _karyoku: '10',
      _lucky: '6',
      _raisou: '11',
      _soukou: '13',
      _taiku: '12',
      after: 'Alpha Kai',
      cond: '55',
      exslot: 'Type 0',
      fleetId: '0',
      houg: '10',
      id: '1',
      inDock: 'true',
      kaihi: '40',
      karyokuMax: '20',
      karyokuNow: '11',
      kyouka0: '1',
      kyouka4: '5',
      locked: '1',
      losshp: '10',
      lv: '42',
      luckyMax: '16',
      luckyNow: '11',
      maxhp: '30',
      name: 'Alpha',
      nowhp: '20',
      raisouMax: '21',
      raisouNow: '13',
      repairtime: '65',
      sakuteki: '10',
      sallyArea: '2',
      slot0: '12cm Gun',
      slot0Alv: '5',
      slot0Level: '2',
      soku: '10',
      soukouMax: '23',
      soukouNow: '17',
      taisen: '20',
      taikuMax: '22',
      taikuNow: '15',
      type: 'DD',
      yomi: 'アルファ',
    })
  })

  it('falls back to NA for missing equipment, type and remodel target', () => {
    const bare = mkRow({
      $ship: mkMstShip({ api_aftershipid: '0', api_id: 9, api_stype: 7 }),
      $shipTypes: {},
      ship: mkShip({ api_id: 9, api_lv: 5, api_slot: [0, 0, 0, 0] }),
    })
    const [header, values] = parse(buildCsv([bare]))
    const row = toMap(header, values)

    expect(row.type).toBe('NA')
    expect(row.after).toBe('NA')
    expect(row.slot0).toBe('NA')
    expect(row.slot0Alv).toBe('NA')
    expect(row.slot0Level).toBe('NA')
    expect(row.slot3).toBe('NA')
    expect(row.exslot).toBe('NA')
  })

  it('honours custom separators and line endings', () => {
    const csv = buildCsv([rowA()], ';', '\r\n')
    expect(csv).toContain('\r\n')
    expect(csv.split('\r\n')[0].split(';')).toEqual(COLUMNS)
  })

  it('preserves the input row order', () => {
    const first = mkRow({
      $ship: mkMstShip({ api_id: 1, api_name: 'First' }),
      ship: mkShip({ api_id: 1 }),
    })
    const second = mkRow({
      $ship: mkMstShip({ api_id: 2, api_name: 'Second' }),
      ship: mkShip({ api_id: 2 }),
    })

    const [, row1, row2] = parse(buildCsv([first, second]))
    expect(row1[1]).toBe('First')
    expect(row2[1]).toBe('Second')
  })
})
