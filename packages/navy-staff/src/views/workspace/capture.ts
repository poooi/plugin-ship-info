// Host capture helpers: build a workspace's area metadata and normalize the
// owning account identifier. These read host state but never mutate it.

import { get } from 'lodash'

import type { IState } from 'views/utils/selectors'

import { NAVY_DEFAULT_AREA_COLOR, newNavyId, type NavyArea } from './types'

/**
 * Normalizes a poi member identifier to a stable string. Missing identity is
 * `null` (unknown), never a stringified placeholder.
 */
export const normalizeMemberId = (value: unknown): string | null => {
  if (typeof value === 'number') {
    return Number.isFinite(value) && Number.isInteger(value) ? String(value) : null
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  }
  return null
}

/** The current host account id, or null when unknown. */
export const hostOwnerMemberId = (state: IState): string | null =>
  normalizeMemberId(get(state, 'info.basic.api_member_id'))

/**
 * Owner id for binding a fresh workspace: only from a verified loaded roster
 * (a member id plus at least one owned ship). An account id alone is not proof
 * that the roster is loaded and usable.
 */
export const verifiedOwnerMemberId = (state: IState): string | null => {
  const owner = hostOwnerMemberId(state)
  if (owner === null) return null
  const ships = get(state, 'info.ships')
  const count =
    ships && typeof ships === 'object' ? Object.keys(ships as object).length : 0
  return count > 0 ? owner : null
}

/** Captured host areas (labels, colors, tag slots). Empty when host data is absent. */
export const captureHostAreas = (state: IState, now: string): NavyArea[] => {
  const mapname: string[] = get(state, ['fcd', 'shiptag', 'mapname'], [])
  const fleetname: Record<string, string[]> = get(
    state,
    ['fcd', 'shiptag', 'fleetname'],
    {},
  )
  const color: string[] = get(state, 'fcd.shiptag.color', [])

  return mapname.map((label, index) => {
    const fleetLabels: Record<string, string> = {}
    for (const [locale, labels] of Object.entries(fleetname)) {
      const value = Array.isArray(labels) ? labels[index] : undefined
      if (typeof value === 'string' && value.length > 0) fleetLabels[locale] = value
    }
    return {
      capturedAt: now,
      color: color[index] ?? NAVY_DEFAULT_AREA_COLOR,
      fleetLabels,
      id: newNavyId('area'),
      label: label || `Area ${index + 1}`,
      tagSlot: index,
    }
  })
}

/**
 * A fresh workspace starts from captured host areas when available. Without host
 * data it still gets one neutral area so manual planning is possible.
 */
export const freshWorkspaceAreas = (state: IState, now: string): NavyArea[] => {
  const captured = captureHostAreas(state, now)
  if (captured.length > 0) return captured
  return [
    {
      capturedAt: now,
      color: NAVY_DEFAULT_AREA_COLOR,
      fleetLabels: {},
      id: newNavyId('area'),
      label: 'Area 1',
      tagSlot: -1,
    },
  ]
}
