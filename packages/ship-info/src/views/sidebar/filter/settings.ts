import { z } from 'zod'
import {
  defaultLevelFilters,
  levelValueSchema,
  normalizeLevelFilters,
} from '../../level-filter'
import { boolArrayToInt } from '../../utils'

const toggle = z.tuple([z.boolean(), z.boolean()]).catch([true, true])
const level = levelValueSchema

const settingsSchema = z.object({
  locked: toggle,
  expedition: toggle,
  inFleet: toggle,
  sparkle: toggle,
  exSlot: toggle,
  daihatsu: toggle,
  modernization: toggle,
  remodel: toggle,
  shipTypes: z.number().int().nonnegative().catch(0),
  sallyAreaChecked: z.array(z.boolean()).catch([]),
  filters: z
    .object({
      maxLevel: level.optional(),
      minLevel: level.catch(defaultLevelFilters.minLevel),
    })
    .catch(defaultLevelFilters),
  sortName: z.string().catch('lv'),
  sortOrder: z.union([z.literal(0), z.literal(1)]).catch(0),
  rawValue: z.union([z.literal(0), z.literal(1)]).catch(0),
})

const legacyToggles = [
  ['lockedRadio', 'locked'],
  ['expeditionRadio', 'expedition'],
  ['inFleetRadio', 'inFleet'],
  ['modernizationRadio', 'modernization'],
  ['remodelRadio', 'remodel'],
  ['sparkleRadio', 'sparkle'],
  ['exSlotRadio', 'exSlot'],
  ['daihatsuRadio', 'daihatsu'],
] as const

const defaultSettings = settingsSchema.parse({})

export type BookmarkSettings = z.infer<typeof settingsSchema>

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const isToggle = (value: unknown): value is boolean[] =>
  Array.isArray(value) &&
  value.length === 2 &&
  value.every((item) => typeof item === 'boolean')

const radioCode = (value: unknown): number | undefined => {
  const code =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim()
        ? Number(value)
        : NaN
  return Number.isInteger(code) ? code : undefined
}

const legacyToggle = (value: unknown): boolean[] | undefined => {
  switch (radioCode(value)) {
    case 0:
      return [true, true]
    case 1:
      return [true, false]
    case 2:
      return [false, true]
    default:
      return undefined
  }
}

// The pre-range level radio meant exactly Lv.1, at least Lv.2, or at least
// Lv.100. The current range leaves the upper bound absent for the "at least"
// choices so it keeps following the owned roster.
const legacyLevelFilters = (
  value: unknown,
): { maxLevel?: number; minLevel: number } | undefined => {
  switch (radioCode(value)) {
    case 1:
      return { maxLevel: 1, minLevel: 1 }
    case 2:
      return { minLevel: 2 }
    case 3:
      return { minLevel: 100 }
    case 0:
      return { ...defaultLevelFilters }
    default:
      return undefined
  }
}

const reconcileEventTags = (checked: boolean[], count?: number) =>
  count != null && checked.length !== count ? Array(count).fill(true) : checked

/** Read a bookmark snapshot, migrating the legacy shape where current fields are absent. */
export function readSettings(value: unknown): BookmarkSettings {
  const source = isRecord(value) ? value : {}
  const normalized: Record<string, unknown> = { ...source }

  for (const [legacyKey, currentKey] of legacyToggles) {
    if (!isToggle(source[currentKey])) {
      const migrated = legacyToggle(source[legacyKey])
      if (migrated) normalized[currentKey] = migrated
    }
  }

  if (!isRecord(source.filters)) {
    const migrated = legacyLevelFilters(source.lvRadio)
    if (migrated) normalized.filters = migrated
  }

  if (
    typeof source.shipTypes !== 'number' ||
    !Number.isInteger(source.shipTypes) ||
    source.shipTypes < 0
  ) {
    if (
      Array.isArray(source.shipTypeChecked) &&
      source.shipTypeChecked.every(
        (item: unknown) => typeof item === 'boolean',
      )
    ) {
      normalized.shipTypes = boolArrayToInt(source.shipTypeChecked)
    }
  }

  if (isRecord(normalized.filters)) {
    normalized.filters = normalizeLevelFilters(normalized.filters)
  }

  const parsed = settingsSchema.safeParse(normalized)
  return parsed.success ? parsed.data : defaultSettings
}

/** Replace bookmark-owned filter state while retaining unrelated preferences. */
export function applySettings(value: unknown, eventTagCount?: number) {
  const settings = readSettings(value)
  settings.sallyAreaChecked = reconcileEventTags(
    settings.sallyAreaChecked,
    eventTagCount,
  )

  const current = window.config.get('plugin.ShipInfo', {})
  const { shipTypeChecked: _legacy, ...rest } = isRecord(current)
    ? current
    : {}
  const { maxLevel: _currentMaxLevel, ...currentFilters } = isRecord(
    rest.filters,
  )
    ? rest.filters
    : {}

  window.config.set('plugin.ShipInfo', {
    ...rest,
    ...settings,
    filters: { ...currentFilters, ...settings.filters },
  })
}
