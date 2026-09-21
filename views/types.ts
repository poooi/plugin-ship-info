import { APISlotItem } from 'kcsapi/api_get_member/require_info/response'
import { APIShip } from 'kcsapi/api_port/port/response'
import { APIMstShip, APIMstSlotitem } from 'kcsapi/api_start2/getData/response'

export interface IShip {
  id: number
  typeId: number
  fleetId: number
  type: string
  name: string
  yomi: string
  sortno: number
  lv: number
  cond: number
  karyoku: number
  houg: number[]
  raisou: number
  raig: number[]
  taiku: number
  tyku: number[]
  soukou: number
  souk: number[]
  lucky: number
  luck: number[]
  kyouka: number[]
  kaihi: number
  taisen: number
  sakuteki: number
  slot: number[]
  exslot: number
  locked: number
  nowhp: number
  maxhp: number
  losshp: number
  repairtime: number
  after: number
  sallyArea: number
  soku: number
  karyokuNow: number
  karyokuMax: number
  raisouNow: number
  raisouMax: number
  taikuNow: number
  taikuMax: number
  soukouNow: number
  soukouMax: number
  luckyNow: number
  luckyMax: number
  isCompleted: boolean
  daihatsu: boolean
  shipId: number
  inDock: boolean
  _karyoku: number
  _taiku: number
  _raisou: number
  _soukou: number
  _lucky: number
  taik: number[]
}

export interface IShipRawData {
  ship: APIShip
  $ship: APIMstShip
  equips: Record<number, APISlotItem>
  $shipTypes: Record<number, APIMstSlotitem>
  fleetIdMap: Record<number, number>
  rawValue: boolean
  repairs: number[]
  db: any
}
