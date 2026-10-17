// Host capture helpers: build a workspace's area metadata and normalize the
// owning account identifier. These read host state but never mutate it.

import { get } from 'lodash'

import type { IState } from 'views/utils/selectors'

import { NAVY_DEFAULT_AREA_COLOR, newNavyId, type NavyArea } from './types'

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
