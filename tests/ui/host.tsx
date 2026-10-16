import React, { createElement } from 'react'

// Pure stand-ins for the poi host boundaries that the vite.config.ts test-only
// plugin resolves to empty virtual modules. Kept free of vitest and of the
// jsdom-specific overlay semantics so browser consumers (Storybook, real
// Chromium tests) can import them directly. The jsdom test adapter in
// boundaries.tsx re-exports these and adds the vitest-backed pieces.

export const createI18n = async () => {
  const { default: i18next } = await import('i18next')
  const instance = i18next.createInstance()
  await instance.init({
    defaultNS: 'poi-plugin-ship-info',
    fallbackLng: 'en-US',
    interpolation: { escapeValue: false },
    lng: 'en-US',
    ns: ['poi-plugin-ship-info', 'resources'],
    resources: {},
  })
  return instance
}

export const poiSelectors = {
  configSelector: (s: any) => s.config,
  constSelector: (s: any) => s.const,
  equipDataSelectorFactory: (id: number) => (s: any) => {
    const equipment = s.info.equips[id]
    return [equipment, (s.const.$equips || {})[equipment?.api_slotitem_id]]
  },
  extensionSelectorFactory: (key: string) => (s: any) => s[key],
  fcdSelector: (s: any) => s.fcd,
  fleetInExpeditionSelectorFactory: (id: number) => (s: any) =>
    (s.expedition || []).includes(id),
  fleetShipsIdSelectorFactory: (id: number) => (s: any) =>
    (s.fleets || [])[id] || [],
  inRepairShipsIdSelector: (s: any) => s.repairs || [],
  shipDataSelectorFactory: (id: number) => (s: any) => [
    s.info.ships[id],
    (s.const.$ships || {})[s.info.ships[id]?.api_ship_id ?? -1],
  ],
  shipEquipDataSelectorFactory: (id: number) => (s: any) =>
    s.info.equips[id] || {},
  shipsSelector: (s: any) => s.info.ships,
  stateSelector: (s: any) => s,
  wctfSelector: (s: any) => s.db,
}

export const windowEnvModule = {
  WindowEnv: React.createContext<{ window: any }>({ window: undefined }),
}

export const fontawesomeModule = {
  default: ({ name }: any) => createElement('span', { 'data-fa': name }),
}

export const avatarModule = {
  Avatar: ({ mstId }: any) => createElement('span', { 'data-avatar': mstId }),
}

export const iconModule = {
  SlotitemIcon: ({ slotitemId }: any) =>
    createElement('span', { 'data-slotitem': slotitemId }),
}

export const toolsModule = { resolveTime: (time: number) => `${time}` }

export const shipImgModule = { getShipImgPath: () => 'ship.png' }

const romajiMap: Record<string, string> = {
  アルファ: 'arufa',
  ベータ: 'beeta',
  ガンマ: 'ganma',
  デルタ: 'deruta',
  イプシロン: 'ipushiron',
}

export const wanakanaModule = { toRomaji: (s: string) => romajiMap[s] ?? s }

export const reduxObserversModule = {
  observe: () => () => undefined,
  observer: () => ({}),
}
