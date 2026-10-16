import i18next, { type i18n as I18nInstance } from 'i18next'

import enUS from '../packages/ship-info/i18n/en-US.json'
import jaJP from '../packages/ship-info/i18n/ja-JP.json'
import koKR from '../packages/ship-info/i18n/ko-KR.json'
import zhCN from '../packages/ship-info/i18n/zh-CN.json'
import zhTW from '../packages/ship-info/i18n/zh-TW.json'

// The real plugin translations, loaded for the browser preview so Storybook and
// the Chromium tests render actual copy instead of key fallbacks.

export const LANGUAGES = ['en-US', 'ja-JP', 'ko-KR', 'zh-CN', 'zh-TW'] as const

export type Language = (typeof LANGUAGES)[number]

export const isLanguage = (value: unknown): value is Language =>
  typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value)

const resources = {
  'en-US': { 'poi-plugin-ship-info': enUS },
  'ja-JP': { 'poi-plugin-ship-info': jaJP },
  'ko-KR': { 'poi-plugin-ship-info': koKR },
  'zh-CN': { 'poi-plugin-ship-info': zhCN },
  'zh-TW': { 'poi-plugin-ship-info': zhTW },
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
  ns: ['poi-plugin-ship-info', 'resources'],
  resources,
})

export const setLanguage = (language: Language) => {
  if (i18n.language !== language) i18n.changeLanguage(language)
}

export default i18n
