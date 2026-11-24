import type { IShipRawData } from '../types'

export type LevelStat = 'api_kaihi' | 'api_taisen' | 'api_sakuteki'

export function shipStatValue(
  { ship, rawValue }: IShipRawData,
  stat: LevelStat,
): number | undefined {
  const [current, level99] = ship[stat]
  if (!rawValue) return current

  if (ship.api_slot_ex <= 0 && ship.api_slot.every((slot) => slot <= 0)) {
    return current
  }

  // The second API value is the natural stat at level 99. ASW modernization
  // is recorded separately and applies independently of equipment.
  if (level99 !== undefined && (ship.api_lv === 99 || level99 === 0)) {
    return level99 + (stat === 'api_taisen' ? ship.api_kyouka[6] ?? 0 : 0)
  }
  return undefined
}
