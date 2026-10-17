// Shared planner view types and display helpers.

export interface AreaChoice {
  id: string
  label: string
  color: string
}

export interface DisplayableArea {
  label: string
  fleetLabels: Record<string, string>
}

/**
 * Resolves the label to show for a captured area. "Show fleet name" switches to
 * the captured localized fleet label when present, falling back to the captured
 * map label; identity and area count never change.
 */
export const resolveAreaLabel = (
  area: DisplayableArea,
  displayFleetName: boolean,
): string => {
  if (!displayFleetName) return area.label
  const localized = area.fleetLabels[window.language]
  return localized && localized.length > 0 ? localized : area.label
}
