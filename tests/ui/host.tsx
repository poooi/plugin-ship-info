import { memoize } from 'lodash'
import React, { createElement } from 'react'
import { createSelector } from 'reselect'

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

// Real poi builds these with `memoize`/`createSelector`, so the same state
// yields the same references. The consumers feed the factories into reselect;
// returning a fresh array/object on every call trips reselect's input-stability
// check and warns. Only the contracts the consumers actually read are modelled:
// each factory reads the narrow slice it needs, so an unrelated root update
// keeps the previous result reference.

const stateSelector = (s: any) => s
const shipsSelector = (s: any) => s.info.ships
const constSelector = (s: any) => s.const
/** Stable stand-in for a missing fleet/expedition/repair list. */
const EMPTY_IDS: number[] = []

const shipDataSelectorFactory = memoize((shipId: number) =>
  createSelector(
    [(s: any) => s.info.ships?.[shipId], constSelector],
    (ship, constState) => {
      const { $ships } = constState ?? {}
      return $ships && typeof ship === 'object' && ship
        ? [ship, $ships[ship.api_ship_id ?? -1]]
        : undefined
    },
  ),
)

// Returns [_equip, $equip] or undefined, matching poi's equipDataSelectorFactory.
const equipDataSelectorFactory = memoize((equipId: number) =>
  createSelector(
    [(s: any) => s.info.equips?.[equipId], constSelector],
    (equip, constState) => {
      const { $equips } = constState ?? {}
      if (!equip || !$equips || equip.api_slotitem_id == null || !$equips[equip.api_slotitem_id]) {
        return undefined
      }
      return [equip, $equips[equip.api_slotitem_id]]
    },
  ),
)

// Returns one entry per equipment slot plus the external slot, each entry
// [_equip, $equip, onslot] or undefined, mirroring poi's
// shipEquipDataSelectorFactory. Equipment ids come from the ship's slot fields
// (never the ship id), and `effectiveEquips` drops an occupied slot that the
// ship's slot count no longer exposes.
const shipEquipDataSelectorFactory = memoize((shipId: number) =>
  createSelector(
    [(s: any) => s.info.ships?.[shipId], (s: any) => s.info.equips, constSelector],
    (ship, equips, constState) => {
      if (!ship || !Array.isArray(ship.api_slot)) return undefined
      const { $equips } = constState ?? {}
      const slotnum = Number.isInteger(ship.api_slotnum) ? ship.api_slotnum : 0
      const slotIds: unknown[] = Array.isArray(ship.api_slot) ? ship.api_slot : []
      const equipIds = [...slotIds, ship.api_slot_ex ?? -1].map((value) =>
        parseInt(String(value)),
      )
      const onslotValues: unknown[] = Array.isArray(ship.api_onslot)
        ? ship.api_onslot
        : []
      const onslots = [...onslotValues, 0].map((value) => Number(value))
      const entries = equipIds.map((equipId, index) => {
        if (!equipId || equipId <= 0) return undefined
        const equip = equips?.[equipId]
        if (!equip || !$equips || equip.api_slotitem_id == null || !$equips[equip.api_slotitem_id]) {
          return undefined
        }
        return [equip, $equips[equip.api_slotitem_id], onslots[index]]
      })
      return entries.length > slotnum
        ? [...entries.slice(0, slotnum), entries[entries.length - 1]]
        : entries
    },
  ),
)

// Reference selectors: return the state's own array (or a shared empty list),
// never a freshly built one, so the same state is reference-stable.
const fleetShipsIdSelectorFactory = (fleetId: number) => (s: any) =>
  (s.fleets ?? [])[fleetId] ?? EMPTY_IDS

const fleetInExpeditionSelectorFactory = (fleetId: number) => (s: any) =>
  (s.expedition ?? EMPTY_IDS).includes(fleetId)

const inRepairShipsIdSelector = (s: any) => s.repairs ?? EMPTY_IDS

export const poiSelectors = {
  configSelector: (s: any) => s.config,
  constSelector,
  equipDataSelectorFactory,
  extensionSelectorFactory: (key: string) => (s: any) => s[key],
  fcdSelector: (s: any) => s.fcd,
  fleetInExpeditionSelectorFactory,
  fleetShipsIdSelectorFactory,
  inRepairShipsIdSelector,
  shipDataSelectorFactory,
  shipEquipDataSelectorFactory,
  shipsSelector,
  stateSelector,
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

export const wanakanaModule = {
  toHiragana: (s: string) => s,
  toRomaji: (s: string) => romajiMap[s] ?? s,
}

export const reduxObserversModule = {
  observe: () => () => undefined,
  observer: () => ({}),
}
