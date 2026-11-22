import { tableState } from '../preview/table-fixtures'

// Pinned from https://github.com/poooi/poi/blob/23275a5f013ddcb19722cac97d5cb135bdde3fd2/assets/data/fcd/shiptag.json
// FCD version 2026/07/29/04. The data object is copied unchanged (13 tags).
export const upstreamShiptag = {
  mapname: [
    '第三十一戦隊',
    '増強第三十一戦隊',
    '多号作戦部隊',
    '連合艦隊',
    'ウルシー攻撃部隊',
    '第六艦隊',
    '仏第3艦隊',
    '仏地中海艦隊',
    '2éme Escadre Légère',
    'イギリス救援艦隊',
    'Force de Raid',
    'Force H',
    '欧州連合艦隊',
  ],
  color: [
    '#f3f3f3',
    '#a5a5a5',
    '#f59e2b',
    '#58f97d',
    '#37d9f0',
    '#6eaad7',
    '#c2b9ad',
    '#e199be',
    '#b0f75f',
    '#fee75d',
    '#f4544c',
    '#c58bea',
    '#56d1b4',
  ],
  fleetname: {
    'zh-CN': [
      '第三十一战队',
      '增强第三十一战队',
      '多号作战部队',
      '连合舰队',
      '乌利西攻击部队',
      '第六舰队',
      '法国第3舰队',
      '法国地中海舰队',
      '2éme Escadre Légère',
      '英国救援舰队',
      'Force de Raid',
      'Force H',
      '欧洲联合舰队',
    ],
    'zh-TW': [
      '第三十一戰隊',
      '增強第三十一戰隊',
      '多號作戰部隊',
      '連合艦隊',
      '烏利西攻擊部隊',
      '第六艦隊',
      '法國第3艦隊',
      '法國地中海艦隊',
      '2éme Escadre Légère',
      '英國救援艦隊',
      'Force de Raid',
      'Force H',
      '歐洲聯合艦隊',
    ],
    'ja-JP': [
      '第三十一戦隊',
      '増強第三十一戦隊',
      '多号作戦部隊',
      '連合艦隊',
      'ウルシー攻撃部隊',
      '第六艦隊',
      '仏第3艦隊',
      '仏地中海艦隊',
      '2éme Escadre Légère',
      'イギリス救援艦隊',
      'Force de Raid',
      'Force H',
      '欧州連合艦隊',
    ],
    'en-US': [
      '31st Squadron',
      'Reinforced 31st Squadron',
      'Operation Ta-Go Force',
      'Combined Fleet',
      'Ulithi Attack Force',
      '6th Fleet',
      'French 3rd Fleet',
      'French Mediterranean Fleet',
      '2éme Escadre Légère',
      'British Relief Fleet',
      'Force de Raid',
      'Force H',
      'European Combined Fleet',
    ],
  },
}

// Pinned from https://github.com/Tibowl/api_start2/blob/6b89decb3a613f4bd89a2e93ea270000e5608e22/parsed/api_mst_stype.json
// Only api_id/api_name are projected. Used solely by realistic navigation previews.
export const upstreamShipTypes = Object.fromEntries(
  [
    [1, '海防艦'],
    [2, '駆逐艦'],
    [3, '軽巡洋艦'],
    [4, '重雷装巡洋艦'],
    [5, '重巡洋艦'],
    [6, '航空巡洋艦'],
    [7, '軽空母'],
    [8, '戦艦'],
    [9, '戦艦'],
    [10, '航空戦艦'],
    [11, '正規空母'],
    [12, '超弩級戦艦'],
    [13, '潜水艦'],
    [14, '潜水空母'],
    [15, '補給艦'],
    [16, '水上機母艦'],
    [17, '揚陸艦'],
    [18, '装甲空母'],
    [19, '工作艦'],
    [20, '潜水母艦'],
    [21, '練習巡洋艦'],
    [22, '補給艦'],
  ].map(([api_id, api_name]) => [api_id, { api_id, api_name }]),
)

/** Real FCD tag and master ship-type data, scoped to the wide/narrow filter preview stories. */
export const filterTagState = (over: Record<string, any> = {}) => {
  const state = tableState(over)
  return {
    ...state,
    const: {
      ...state.const,
      $shipTypes: upstreamShipTypes,
    },
    fcd: {
      ...state.fcd,
      shiptag: upstreamShiptag,
    },
  }
}
