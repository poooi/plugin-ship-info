import React, { createElement } from 'react'
import { vi } from 'vitest'

// Concrete stand-ins for the poi host boundaries the vite.config.ts test-only
// plugin resolves to empty virtual modules. Each test file passes these to
// vi.mock so the plugin's own modules stay real.

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
  equipDataSelectorFactory: (id: number) => (s: any) => [
    s.info.equips[id],
    (s.const.$equips || {})[id],
  ],
  extensionSelectorFactory: (key: string) => (s: any) => s[key],
  fcdSelector: (s: any) => s.fcd,
  fleetInExpeditionSelectorFactory: (id: number) => (s: any) =>
    (s.expedition || []).includes(id),
  fleetShipsIdSelectorFactory: (id: number) => (s: any) =>
    (s.fleets || [])[id] || [],
  inRepairShipsIdSelector: (s: any) => s.repairs || [],
  shipDataSelectorFactory: (id: number) => (s: any) => [
    s.info.ships[id],
    s.const.$ships[id],
  ],
  shipEquipDataSelectorFactory: (id: number) => (s: any) =>
    s.info.equips[id] || {},
  shipsSelector: (s: any) => s.info.ships,
  stateSelector: (s: any) => s,
  wctfSelector: (s: any) => s.db,
}

export const overlay = {
  Dialog: ({ isOpen, children }: any) =>
    isOpen ? createElement(React.Fragment, null, children) : null,
  Popover: ({ content, children }: any) =>
    createElement(React.Fragment, null, children, content),
  Tooltip: ({ children }: any) => createElement(React.Fragment, null, children),
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

export const createElectronModule = () => ({
  clipboard: { writeText: vi.fn() },
  remote: {
    dialog: { showSaveDialog: vi.fn(async () => ({ canceled: true })) },
    getCurrentWindow: () => ({}),
  },
})
