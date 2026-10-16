// ship types dated 20170106, beginning with id=1
// const shipTypes = ["海防艦", "駆逐艦", "軽巡洋艦", "重雷装巡洋艦",
// "重巡洋艦", "航空巡洋艦", "軽空母", "戦艦", "戦艦", "航空戦艦", "正規空母",
// "超弩級戦艦", "潜水艦", "潜水空母", "補給艦", "水上機母艦", "揚陸艦", "装甲空母",
// "工作艦", "潜水母艦", "練習巡洋艦", "補給艦"]
// attention, shipSuperTypeMap uses api_id

export interface IShipSuperType {
  id: number[]
  name: string
}

export const shipSuperTypeMap: IShipSuperType[] = [
  {
    id: [8, 9, 10, 12],
    name: 'BB',
  },
  {
    id: [7, 11, 18],
    name: 'CV',
  },
  {
    id: [5, 6],
    name: 'CA',
  },
  {
    id: [3, 4, 21],
    name: 'CL',
  },
  {
    id: [2],
    name: 'DD',
  },
  {
    id: [13, 14],
    name: 'SS',
  },
  {
    id: [1],
    name: 'DE',
  },
  {
    id: [15, 16, 17, 19, 20, 22],
    name: 'Auxiliary',
  },
]

// Ship type id (api_stype) to its translation key. Kept as keys rather than
// resolved strings so this module owns no plugin translation namespace; callers
// pass their own `t` function.
export const shipTypeLabelKeys: Record<number, string> = {
  1: 'DE',
  2: 'DD',
  3: 'CL',
  4: 'CLT',
  5: 'CA',
  6: 'CAV',
  7: 'CVL',
  8: 'FBB',
  9: 'BB',
  10: 'BBV',
  11: 'CV',
  12: 'BB',
  13: 'SS',
  14: 'SSV',
  15: 'AO',
  16: 'AV',
  17: 'LHA',
  18: 'CVB',
  19: 'AR',
  20: 'AS',
  21: 'CT',
  22: 'AO',
}

export const shipTypeLabel = (
  typeId: number,
  t: (key: string) => string,
): string => {
  const key = shipTypeLabelKeys[typeId]
  return key ? t(key) : ''
}
