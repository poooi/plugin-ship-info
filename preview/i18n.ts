import i18next, { type i18n as I18nInstance } from 'i18next'

import enUS from '../packages/ship-info/i18n/en-US.json'
import jaJP from '../packages/ship-info/i18n/ja-JP.json'
import koKR from '../packages/ship-info/i18n/ko-KR.json'
import zhCN from '../packages/ship-info/i18n/zh-CN.json'
import zhTW from '../packages/ship-info/i18n/zh-TW.json'
import navyEnUS from '../packages/navy-staff/i18n/en-US.json'
import navyJaJP from '../packages/navy-staff/i18n/ja-JP.json'
import navyKoKR from '../packages/navy-staff/i18n/ko-KR.json'
import navyZhCN from '../packages/navy-staff/i18n/zh-CN.json'
import navyZhTW from '../packages/navy-staff/i18n/zh-TW.json'

// The real plugin translations, loaded for the browser preview so Storybook and
// the Chromium tests render actual copy instead of key fallbacks. Each plugin
// keeps its own namespace; nothing is shared at runtime.

export const LANGUAGES = ['en-US', 'ja-JP', 'ko-KR', 'zh-CN', 'zh-TW'] as const

export type Language = (typeof LANGUAGES)[number]

export const isLanguage = (value: unknown): value is Language =>
  typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value)

const resources = {
  'en-US': {
    'poi-plugin-ship-info': enUS,
    'poi-plugin-navy-staff': navyEnUS,
  },
  'ja-JP': {
    'poi-plugin-ship-info': jaJP,
    'poi-plugin-navy-staff': navyJaJP,
  },
  'ko-KR': {
    'poi-plugin-ship-info': koKR,
    'poi-plugin-navy-staff': navyKoKR,
  },
  'zh-CN': {
    'poi-plugin-ship-info': zhCN,
    'poi-plugin-navy-staff': navyZhCN,
  },
  'zh-TW': {
    'poi-plugin-ship-info': zhTW,
    'poi-plugin-navy-staff': navyZhTW,
  },
}

export const i18n: I18nInstance = i18next.createInstance()

// initAsync:false avoids a readiness race: plugin modules such as
// views/selectors.ts call getFixedT at module scope.
i18n.init({
  defaultNS: 'poi-plugin-ship-info',
  fallbackLng: 'en-US',
  initAsync: false,
  interpolation: { escapeValue: false },
  lng: 'en-US',
  ns: ['poi-plugin-ship-info', 'poi-plugin-navy-staff', 'resources'],
  resources,
})

export const setLanguage = (language: Language) => {
  if (i18n.language !== language) i18n.changeLanguage(language)
}

// A Navy-only instance with `fallbackLng: false`. Used by a browser scenario to
// prove the Navy UI resolves its own namespace without borrowing Ship Info.
//
// The real poi host (views/utils/tools.ts `readI18nResources`) normalizes every
// resource key with `escapeI18nKey`, matching this exact transformation. This
// instance reproduces it so a sentence-style key that only survived in
// raw-resource Storybook is caught here. The shared `i18n` instance is left
// untouched.
const escapeI18nKey = (key: string): string =>
  key.replace(/\.\W/g, '').replace(/\.$/, '').replace(/:\s/g, '').replace(/:$/, '')

const normalizeResourceKeys = (
  resource: Record<string, string>,
): Record<string, string> => {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(resource)) {
    out[escapeI18nKey(key)] = value
  }
  return out
}

export const createNavyOnlyI18n = (lng: Language = 'en-US'): I18nInstance => {
  const instance = i18next.createInstance()
  instance.init({
    defaultNS: 'poi-plugin-navy-staff',
    fallbackLng: false,
    initAsync: false,
    interpolation: { escapeValue: false },
    lng,
    ns: ['poi-plugin-navy-staff'],
    resources: {
      'en-US': { 'poi-plugin-navy-staff': normalizeResourceKeys(navyEnUS) },
      'ja-JP': { 'poi-plugin-navy-staff': normalizeResourceKeys(navyJaJP) },
      'ko-KR': { 'poi-plugin-navy-staff': normalizeResourceKeys(navyKoKR) },
      'zh-CN': { 'poi-plugin-navy-staff': normalizeResourceKeys(navyZhCN) },
      'zh-TW': { 'poi-plugin-navy-staff': normalizeResourceKeys(navyZhTW) },
    },
  })
  return instance
}

export default i18n
