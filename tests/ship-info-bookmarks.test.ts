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

  it('migrates authentic legacy level and yes/no radio snapshots', () => {
    const settings = readSettings({
      daihatsuRadio: 2,
      exSlotRadio: 1,
      expeditionRadio: 2,
      inFleetRadio: 1,
      lockedRadio: 1,
      lvRadio: 3,
      modernizationRadio: 2,
      remodelRadio: 1,
      sparkleRadio: 2,
    })

    expect(settings.filters).toEqual({ minLevel: 100 })
    expect(settings.locked).toEqual([true, false])
    expect(settings.expedition).toEqual([false, true])
    expect(settings.inFleet).toEqual([true, false])
    expect(settings.modernization).toEqual([false, true])
    expect(settings.remodel).toEqual([true, false])
    expect(settings.sparkle).toEqual([false, true])
    expect(settings.exSlot).toEqual([true, false])
    expect(settings.daihatsu).toEqual([false, true])
  })

  it('keeps the exact legacy level bounds', () => {
    expect(readSettings({ lvRadio: 0 }).filters).toEqual({
      minLevel: 0,
    })
    expect(readSettings({ lvRadio: 1 }).filters).toEqual({
      maxLevel: 1,
      minLevel: 1,
    })
    expect(readSettings({ lvRadio: 2 }).filters).toEqual({
      minLevel: 2,
    })
    expect(readSettings({ lvRadio: 3 }).filters).toEqual({
      minLevel: 100,
    })
  })

  it('reads the legacy unrestricted maximum as an absent upper bound', () => {
    expect(
      readSettings({ filters: { maxLevel: 450, minLevel: 80 } }).filters,
    ).toEqual({ minLevel: 80 })
    expect(
      readSettings({ filters: { maxLevel: 60, minLevel: 5 } }).filters,
    ).toEqual({ maxLevel: 60, minLevel: 5 })
  })

  it('prefers saved current fields over legacy radios', () => {
    const settings = readSettings({
      filters: { maxLevel: 60, minLevel: 5 },
      locked: [false, true],
      lockedRadio: 1,
      lvRadio: 3,
    })

    expect(settings.filters).toEqual({ maxLevel: 60, minLevel: 5 })
    expect(settings.locked).toEqual([false, true])
  })


  it('migrates legacy type bits and leaves partial level bounds unbounded', () => {
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
    expect(settings.filters).toEqual({ minLevel: 80 })
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

    expect(config.filters).toEqual({ minLevel: 80 })
    expect(config.locked).toEqual([true, true])
    expect(config.columnVisibility).toEqual({ type: false })
    expect(config).not.toHaveProperty('shipTypeChecked')
  })

  it('clears an existing upper bound when applying an unrestricted preset', () => {
    let config: Record<string, any> = {
      filters: { maxLevel: 200, minLevel: 100 },
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

    expect(config.filters).toEqual({ minLevel: 80 })
  })

  it('reconciles saved event tag masks with the current map count', () => {
    let config: Record<string, any> = {
      columnVisibility: { type: false },
    }
    window.config = {
      get: <T,>(path: string, fallback: T) =>
        path === 'plugin.ShipInfo' ? (config as T) : fallback,
      set: (path, value) => {
        expect(path).toBe('plugin.ShipInfo')
        config = value
      },
    }

    applySettings(
      {
        sallyAreaChecked: [true, false, true, false],
      },
      3,
    )
    expect(config.sallyAreaChecked).toEqual([true, true, true])
    expect(config.columnVisibility).toEqual({ type: false })

    applySettings(
      {
        sallyAreaChecked: [true, false, true],
      },
      3,
    )
    expect(config.sallyAreaChecked).toEqual([true, false, true])
  })


  it('falls back to defaults for malformed records', () => {
    expect(readSettings(null).filters).toEqual({ minLevel: 0 })
    expect(readSettings('broken').sortName).toBe('lv')
  })
})
