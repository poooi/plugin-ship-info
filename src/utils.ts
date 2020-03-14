export interface RepairFactor {
  [key: number]: {
    api_id: number
    api_name: string
    factor: number
  }
}

export const repairFactor: RepairFactor = {
  1: { api_id: 1, api_name: '海防艦', factor: 0.5 },
  2: { api_id: 2, api_name: '駆逐艦', factor: 1 },
  3: { api_id: 3, api_name: '軽巡洋艦', factor: 1 },
  4: { api_id: 4, api_name: '重雷装巡洋艦', factor: 1 },
  5: { api_id: 5, api_name: '重巡洋艦', factor: 1.5 },
  6: { api_id: 6, api_name: '航空巡洋艦', factor: 1.5 },
  7: { api_id: 7, api_name: '軽空母', factor: 1.5 },
  8: { api_id: 8, api_name: '戦艦', factor: 1.5 },
  9: { api_id: 9, api_name: '戦艦', factor: 2 },
  10: { api_id: 10, api_name: '航空戦艦', factor: 2 },
  11: { api_id: 11, api_name: '正規空母', factor: 2 },
  12: { api_id: 12, api_name: '超弩級戦艦', factor: 0 },
  13: { api_id: 13, api_name: '潜水艦', factor: 0.5 },
  14: { api_id: 14, api_name: '潜水空母', factor: 1 },
  15: { api_id: 15, api_name: '補給艦', factor: 1 },
  16: { api_id: 16, api_name: '水上機母艦', factor: 1 },
  17: { api_id: 17, api_name: '揚陸艦', factor: 1 },
  18: { api_id: 18, api_name: '装甲空母', factor: 2 },
  19: { api_id: 19, api_name: '工作艦', factor: 2 },
  20: { api_id: 20, api_name: '潜水母艦', factor: 1.5 },
  21: { api_id: 21, api_name: '練習巡洋艦', factor: 1 },
  22: { api_id: 22, api_name: '補給艦', factor: 1 },
}

/**
 * get repaire time for each hp
 * @param api_lv ship level
 * @param api_stype ship type
 * @returns seconds per hp
 */
export const getRepairTimePerHP = (api_lv = 1, api_stype = 1): number => {
  const factor = repairFactor[api_stype]?.factor || 0

  if (factor === 0) {
    return 0
  }

  if (api_lv < 12) {
    return api_lv * 10 * factor * 1000
  }

  return (
    (api_lv * 5 + (Math.floor(Math.sqrt(api_lv - 11)) * 10 + 50)) *
    factor *
    1000
  )
}
