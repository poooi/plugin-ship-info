import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import enUS from '../packages/ship-info/i18n/en-US.json'
import jaJP from '../packages/ship-info/i18n/ja-JP.json'
import koKR from '../packages/ship-info/i18n/ko-KR.json'
import zhCN from '../packages/ship-info/i18n/zh-CN.json'
import zhTW from '../packages/ship-info/i18n/zh-TW.json'
import {
  applySettings,
  readSettings,
} from '../packages/ship-info/src/views/sidebar/filter/settings'

const originalConfig = window.config

const locales = [enUS, jaJP, koKR, zhCN, zhTW]
const bookmarkKeys = [
  'Bookmark name',
  'Save',
  'Overwrite',
  'Delete bookmark',
  'Bookmarks',
]

describe('ship-info bookmark settings', () => {
  beforeEach(() => {
    window.config = originalConfig
  })

  afterEach(() => {
    window.config = originalConfig
  })

  it('localizes the bookmark UI in every locale', () => {
    for (const locale of locales) {
      for (const key of bookmarkKeys) {
        expect(typeof locale[key as keyof typeof locale]).toBe('string')
        expect(locale[key as keyof typeof locale]).not.toBe('')
      }
    }
  })

  it('migrates legacy type bits and fills partial level bounds', () => {
    const settings = readSettings({
      filters: { minLevel: 80 },
      shipTypeChecked: [
        true,
        true,
        false,
        false,
        false,
        false,
        false,
        false,
      ],
    })

    expect(settings.shipTypes).toBe(448)
    expect(settings.filters).toEqual({ maxLevel: 450, minLevel: 80 })
    expect(settings.locked).toEqual([true, true])
  })

  it('applies defaults without touching unrelated preferences', () => {
    let config: Record<string, any> = {
      columnVisibility: { type: false },
      filters: { maxLevel: 200, minLevel: 100 },
      locked: [false, false],
      shipTypeChecked: [true],
    }
    window.config = {
      get: <T,>(path: string, fallback: T) =>
        path === 'plugin.ShipInfo' ? (config as T) : fallback,
      set: (path, value) => {
        expect(path).toBe('plugin.ShipInfo')
        config = value
      },
    }

    applySettings({ filters: { minLevel: 80 } })

    expect(config.filters).toEqual({ maxLevel: 450, minLevel: 80 })
    expect(config.locked).toEqual([true, true])
    expect(config.columnVisibility).toEqual({ type: false })
    expect(config).not.toHaveProperty('shipTypeChecked')
  })

  it('falls back to defaults for malformed records', () => {
    expect(readSettings(null).filters).toEqual({ maxLevel: 450, minLevel: 0 })
    expect(readSettings('broken').sortName).toBe('lv')
  })
})
