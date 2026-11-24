import { describe, expect, it } from 'vitest'
import { shipStatValue } from '../packages/ship-info/src/views/table/ship-stat-value'
import { mkRow, mkShip } from './fixtures'

describe('equipment-free ship stats', () => {
  it('uses owned values for unequipped ships, including married ships and true zeros', () => {
    const row = mkRow({ rawValue: true, ship: mkShip({ api_lv: 124, api_taisen: [33, 28], api_slot_ex: -1, api_sakuteki: [0, 0] }) })
    expect(shipStatValue(row, 'api_taisen')).toBe(33)
    expect(shipStatValue(row, 'api_sakuteki')).toBe(0)
  })

  it('treats an occupied expansion slot as equipment and keeps display values available', () => {
    const ship = mkShip({ api_slot_ex: 7, api_kaihi: [81, 69] })
    expect(shipStatValue(mkRow({ ship, rawValue: true }), 'api_kaihi')).toBeUndefined()
    expect(shipStatValue(mkRow({ ship }), 'api_kaihi')).toBe(81)
  })

  it('includes ASW modernization once at level 99 and preserves a known zero', () => {
    const ship = mkShip({ api_lv: 99, api_slot: [42], api_taisen: [80, 64], api_kyouka: [0, 0, 0, 0, 0, 0, 2] })
    expect(shipStatValue(mkRow({ ship, rawValue: true }), 'api_taisen')).toBe(66)
    const noASW = mkShip({ api_slot: [42], api_lv: 120, api_taisen: [4, 0] })
    expect(shipStatValue(mkRow({ ship: noASW, rawValue: true }), 'api_taisen')).toBe(0)
  })
})
