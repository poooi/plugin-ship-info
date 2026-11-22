import { describe, expect, it } from 'vitest'

import enUS from '../packages/ship-info/i18n/en-US.json'
import jaJP from '../packages/ship-info/i18n/ja-JP.json'
import koKR from '../packages/ship-info/i18n/ko-KR.json'
import zhCN from '../packages/ship-info/i18n/zh-CN.json'
import zhTW from '../packages/ship-info/i18n/zh-TW.json'

const keys = [
  'Ship types',
  'Level',
  'Sally Area',
  'Status',
  'Value Type',
  'Modified',
  'Reset filters and sorting',
  'Filter sections',
  'Filter',
]

describe('ship-info compact filter locales', () => {
  it('provides every navigation label in all five locales', () => {
    for (const locale of [enUS, jaJP, koKR, zhCN, zhTW]) {
      for (const key of keys) {
        const value = locale[key as keyof typeof locale]
        expect(typeof value).toBe('string')
        expect(value).not.toBe('')
      }
    }
  })
})
