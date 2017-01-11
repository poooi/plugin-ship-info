// ship types dated 20170106, beginning with id=1
// const shipTypes = ["海防艦", "駆逐艦", "軽巡洋艦", "重雷装巡洋艦", 
// "重巡洋艦", "航空巡洋艦", "軽空母", "戦艦", "戦艦", "航空戦艦", "正規空母", 
// "超弩級戦艦", "潜水艦", "潜水空母", "補給艦", "水上機母艦", "揚陸艦", "装甲空母", 
// "工作艦", "潜水母艦", "練習巡洋艦", "補給艦"]
// attention, shipSuperTypeMap uses api_id

export const shipSuperTypeMap = [
  {
    "name": "DD",
    "id": [2],
  },
  {
    "name": "CL",
    "id": [3, 4, 21],
  },
  {
    "name": "CA",
    "id": [5, 6],
  },
  {
    "name": "BB",
    "id": [8, 9, 10, 12],
  },
  {
    "name": "CV",
    "id": [7, 11, 18],
  },
  {
    "name": "SS",
    "id": [13, 14],
  },
  {
    "name": "Others",
    "id": [1, 15, 16, 17, 19, 20, 22],
  },
]

export const lvOptions = {
  [0]: 'All',
  [1]: 'Lv.1',
  [2]: 'Lv.≥ 2',
  [3]: 'Lv.≥ 100',
}

export const lockedOptions = {
  [0]: 'All',
  [1]: 'Locked',
  [2]: 'Not Locked',
}

export const expeditionOptions = {
  [0]: 'All',
  [1]: 'Yes',
  [2]: 'No',  
}

export const modernizationOptions = {
  [0]: 'All',
  [1]: 'Completed',
  [2]: 'Incomplete',
}

export const remodelOptions = {
  [0]: 'All',
  [1]: 'Yes',
  [2]: 'No',
}

export const rawValueOptions = {
  [0]: 'Equip. Incl.',
  [1]: 'Raw Value',
}

export const pagedLayoutOptions = {
  [0]: 'No',
  [1]: 'Yes',
}

export const marriedOptions = {
  [0]: 'All',
  [1]: 'Yes',
  [2]: 'No',
}

export const inFleetOptions = {
  [0]: 'All',
  [1]: 'Yes',
  [2]: 'No',
}

export const sparkleOptions = {
  [0]: 'All',
  [1]: 'Yes',
  [2]: 'No',
}


export const exSlotOptions = {
  [0]: 'All',
  [1]: 'Yes',
  [2]: 'No',
}

export const repairFactor = {
  '1': { api_id: 1, api_name: '海防艦', factor: 0 },
  '2': { api_id: 2, api_name: '駆逐艦', factor: 1 },
  '3': { api_id: 3, api_name: '軽巡洋艦', factor: 1 },
  '4': { api_id: 4, api_name: '重雷装巡洋艦', factor: 1 },
  '5': { api_id: 5, api_name: '重巡洋艦', factor: 1.5 },
  '6': { api_id: 6, api_name: '航空巡洋艦', factor: 1.5 },
  '7': { api_id: 7, api_name: '軽空母', factor: 1.5 },
  '8': { api_id: 8, api_name: '戦艦', factor: 2 },
  '9': { api_id: 9, api_name: '戦艦', factor: 2 },
  '10': { api_id: 10, api_name: '航空戦艦', factor: 2 },
  '11': { api_id: 11, api_name: '正規空母', factor: 2 },
  '12': { api_id: 12, api_name: '超弩級戦艦', factor: 0 },
  '13': { api_id: 13, api_name: '潜水艦', factor: 0.5 },
  '14': { api_id: 14, api_name: '潜水空母', factor: 1 },
  '15': { api_id: 15, api_name: '補給艦', factor: 1 },
  '16': { api_id: 16, api_name: '水上機母艦', factor: 1 },
  '17': { api_id: 17, api_name: '揚陸艦', factor: 1 },
  '18': { api_id: 18, api_name: '装甲空母', factor: 2 },
  '19': { api_id: 19, api_name: '工作艦', factor: 2 },
  '20': { api_id: 20, api_name: '潜水母艦', factor: 1.5 },
  '21': { api_id: 21, api_name: '練習巡洋艦', factor: 1 },
  '22': { api_id: 22, api_name: '補給艦', factor: 1 },
}

export const sokuInterpretation = {
  [5]: 'Slow',
  [10]: 'Fast',
  [15]: 'Fast+',
  [20]: 'Fastest',
}

export const sokuStyles = {
  [15]: {color: '#1E88E5'},
  [20]: {color: '#64B5F6'},
}
