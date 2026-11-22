import { z } from 'zod'
import { boolArrayToInt } from '../../utils'

const toggle = z.tuple([z.boolean(), z.boolean()]).catch([true, true])
const level = z.number().int().min(0).max(450)
const defaultFilters = { maxLevel: 450, minLevel: 0 }

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
      maxLevel: level.catch(defaultFilters.maxLevel),
      minLevel: level.catch(defaultFilters.minLevel),
    })
    .catch(defaultFilters),
  sortName: z.string().catch('lv'),
  sortOrder: z.union([z.literal(0), z.literal(1)]).catch(0),
  rawValue: z.union([z.literal(0), z.literal(1)]).catch(0),
})

const legacySchema = z.object({
  shipTypeChecked: z.array(z.boolean()),
  shipTypes: z.undefined().optional(),
})

const defaultSettings = settingsSchema.parse({})

export type BookmarkSettings = z.infer<typeof settingsSchema>

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

/** Read a bookmark snapshot, migrating the legacy bit-array shape. */
export function readSettings(value: unknown): BookmarkSettings {
  const legacy = legacySchema.safeParse(value)
  if (legacy.success && isRecord(value)) {
    return settingsSchema.parse({
      ...value,
      shipTypes: boolArrayToInt(legacy.data.shipTypeChecked),
    })
  }
  const parsed = settingsSchema.safeParse(value ?? {})
  return parsed.success ? parsed.data : defaultSettings
}

/** Replace bookmark-owned filter state while retaining unrelated preferences. */
export function applySettings(value: unknown) {
  const settings = readSettings(value)
  const current = window.config.get('plugin.ShipInfo', {})
  const { shipTypeChecked: _legacy, ...rest } = isRecord(current)
    ? current
    : {}
  const currentFilters = isRecord(rest.filters) ? rest.filters : {}

  window.config.set('plugin.ShipInfo', {
    ...rest,
    ...settings,
    filters: { ...currentFilters, ...settings.filters },
  })
}
