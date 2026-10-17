import { describe, expect, it } from 'vitest'

import { poiSelectors } from './ui/host'

// The host factories must mirror poi's contract closely enough that the real
// consumers (which wrap them in reselect) see stable references for unchanged
// state, refreshed values for changed state, and equipment slots resolved to
// equipment instances rather than ship ids.

const masterShips = {
  100: { api_id: 100, api_name: 'Alpha' },
}

const masters = {
  500: { api_id: 500, api_name: 'Gun' },
  501: { api_id: 501, api_name: 'Radar' },
  502: { api_id: 502, api_name: 'Plane' },
  503: { api_id: 503, api_name: 'Extra' },
}

const equips = {
  // A ship-id-shaped key proves slots never resolve against the ship id.
  1: { api_id: 1, api_slotitem_id: 999 },
  11: { api_id: 11, api_slotitem_id: 500 },
  12: { api_id: 12, api_slotitem_id: 501 },
  13: { api_id: 13, api_slotitem_id: 502 },
  15: { api_id: 15, api_slotitem_id: 503 },
}

const ships = {
  1: {
    api_id: 1,
    api_onslot: [5, 6, 0, 0],
    api_ship_id: 100,
    api_slot: [11, 12, -1, -1],
    api_slot_ex: 13,
    api_slotnum: 2,
  },
  // More slots than slotnum exposes, plus a missing equipment instance (40).
  2: {
    api_id: 2,
    api_onslot: [1, 2, 3, 4],
    api_ship_id: 100,
    api_slot: [11, 12, 13, 14],
    api_slot_ex: 15,
    api_slotnum: 2,
  },
  3: {
    api_id: 3,
    api_onslot: [1, 2, 3, 4],
    api_ship_id: 100,
    api_slot: [11, 40, -1, -1],
    api_slot_ex: 0,
    api_slotnum: 4,
  },
}

const baseState = () => ({
  const: { $equips: masters, $ships: masterShips },
  expedition: [1],
  fleets: [[1, 2], []],
  info: { equips, repairs: [], ships },
})

describe('host selector mocks', () => {
  it('returns a stable ship tuple for unchanged state and undefined for an unknown ship', () => {
    const state = baseState()
    const select = poiSelectors.shipDataSelectorFactory(1)

    const first = select(state)!
    expect(select(state)).toBe(first)
    expect(first[0]).toBe(state.info.ships[1])
    expect(first[1]).toBe(state.const.$ships[100])

    expect(poiSelectors.shipDataSelectorFactory(99)(state)).toBeUndefined()
  })

  it('refreshes a ship tuple when the ship or master data changes', () => {
    const state = baseState()
    const next = {
      ...state,
      const: { ...state.const, $ships: { 100: { api_id: 100, api_name: 'Alpha Kai' } } },
    }
    const select = poiSelectors.shipDataSelectorFactory(1)

    expect(select(state)![1].api_name).toBe('Alpha')
    expect(select(next)![1].api_name).toBe('Alpha Kai')
  })

  it('preserves result identity across unrelated root updates', () => {
    const state = baseState()
    const unrelated = { ...state, info: { ...state.info, repairs: [9] } }
    const ship = poiSelectors.shipDataSelectorFactory(1)
    const shipEquips = poiSelectors.shipEquipDataSelectorFactory(1)
    const equip = poiSelectors.equipDataSelectorFactory(11)

    const shipFirst = ship(state)
    const equipsFirst = shipEquips(state)
    const equipFirst = equip(state)

    expect(ship(unrelated)).toBe(shipFirst)
    expect(shipEquips(unrelated)).toBe(equipsFirst)
    expect(equip(unrelated)).toBe(equipFirst)
  })

  it('resolves ship equipment slots to equipment instances, not the ship id', () => {
    const state = baseState()
    const select = poiSelectors.shipEquipDataSelectorFactory(1)

    const entries = select(state) as any[]
    expect(select(state)).toBe(entries)
    // Two real slots plus the external slot; the extra api_slot entries are dropped.
    expect(entries).toHaveLength(3)
    expect(entries[0][0]).toBe(state.info.equips[11])
    expect(entries[1][0]).toBe(state.info.equips[12])
    expect(entries[2][0]).toBe(state.info.equips[13])
    // The ship-id-keyed equipment (api_id 1) is never consulted.
    expect(entries[0][0]).not.toBe(state.info.equips[1])
    // Onslot counts ride along, with the external slot assumed empty.
    expect(entries.map((entry: any[]) => entry[2])).toEqual([5, 6, 0])
  })

  it('drops slots the slot count no longer exposes and pads missing ones', () => {
    const state = baseState()

    const extra = poiSelectors.shipEquipDataSelectorFactory(2)(state) as any[]
    expect(extra.map((entry: any[]) => entry?.[0]?.api_id)).toEqual([11, 12, 15])

    const missing = poiSelectors.shipEquipDataSelectorFactory(3)(state) as any[]
    expect(missing).toHaveLength(5)
    expect(missing[0][0]).toBe(state.info.equips[11])
    expect(missing[1]).toBeUndefined()
    expect(missing[2]).toBeUndefined()
    expect(missing[4]).toBeUndefined()
  })

  it('refreshes ship, slot equipment, master equipment and onslot data on change', () => {
    const state = baseState()
    const select = poiSelectors.shipEquipDataSelectorFactory(1)
    const first = select(state) as any[]
    expect(first.map((entry: any[]) => [entry?.[0]?.api_id, entry?.[2]])).toEqual([
      [11, 5],
      [12, 6],
      [13, 0],
    ])

    // Changed ship slot/onslot data and a changed slotted equipment instance.
    const changed = {
      ...state,
      info: {
        ...state.info,
        equips: {
          ...state.info.equips,
          12: { api_id: 12, api_level: 5, api_slotitem_id: 501 },
        },
        ships: {
          ...state.info.ships,
          1: { ...state.info.ships[1], api_onslot: [1, 9, 0, 0] },
        },
      },
    }
    const second = select(changed) as any[]
    expect(select(changed)).toBe(second)
    expect(second).not.toBe(first)
    expect(second[0][0].api_id).toBe(11)
    expect(second[1][0].api_level).toBe(5)
    expect(second[1][2]).toBe(9)

    // A changed master equipment refreshes the $equip side of the tuple.
    const changedMaster = {
      ...changed,
      const: {
        ...state.const,
        $equips: { ...state.const.$equips, 500: { api_id: 500, api_name: 'Gun Kai' } },
      },
    }
    const third = select(changedMaster) as any[]
    expect(third).not.toBe(second)
    expect(third[0][1].api_name).toBe('Gun Kai')
  })

  it('returns a stable equipment tuple and undefined for an unknown equipment', () => {
    const state = baseState()
    const select = poiSelectors.equipDataSelectorFactory(11)

    expect(select(state)![0]).toBe(state.info.equips[11])
    expect(select(state)).toBe(select(state))
    expect(poiSelectors.equipDataSelectorFactory(999)(state)).toBeUndefined()
  })

  it('keeps fleet, expedition and repair inputs stable when data is absent', () => {
    const state = baseState()
    const present = poiSelectors.fleetShipsIdSelectorFactory(0)
    expect(present(state)).toBe(state.fleets[0])
    expect(present(state)).toBe(present(state))

    const absent = poiSelectors.fleetShipsIdSelectorFactory(9)
    expect(absent(state)).toBe(absent(state))

    const expedition = poiSelectors.fleetInExpeditionSelectorFactory(1)
    expect(expedition(state)).toBe(true)
    expect(expedition({ ...state, expedition: [] })).toBe(false)

    expect(poiSelectors.inRepairShipsIdSelector(state)).toBe(
      poiSelectors.inRepairShipsIdSelector(state),
    )
  })
})
