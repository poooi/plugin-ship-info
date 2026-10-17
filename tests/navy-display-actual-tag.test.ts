import { describe, expect, it, vi } from 'vitest'

vi.mock('views/utils/selectors', async () => {
  const host = await import('./ui/host')
  return { ...host.poiSelectors }
})

import { buildDisplayContent } from '../packages/navy-staff/src/views/workspace/display'
import type { NavyWorkspaceContent } from '../packages/navy-staff/src/views/workspace/types'

const area = (id: string, label: string, color: string, tagSlot: number) => ({
  capturedAt: '2026-01-01T00:00:00.000Z',
  color,
  fleetLabels: {},
  id,
  label,
  tagSlot,
})

const content = (assignments: Record<string, number[]>): NavyWorkspaceContent => ({
  areas: [area('area-1', 'E1', '#ff0000', 0), area('area-2', 'E2', '#00ff00', 1)],
  assignments,
  name: 'Plan',
  ships: {},
})

const gridRow = (
  display: ReturnType<typeof buildDisplayContent>,
  ownedId: number,
) => display.gridShips.find((entry) => entry.ownedId === ownedId)!

describe('buildDisplayContent actual sortie tag', () => {
  it('projects the live tag independently of master metadata', () => {
    // No liveById overlay: the row is captured-only (no master lookup), yet the
    // raw roster tag still projects onto it.
    const display = buildDisplayContent(content({ 'area-1': [], 'area-2': [4] }), {
      allowLive: true,
      tagByOwnedId: { 4: 1 },
    })

    const entry = gridRow(display, 4)
    expect(entry.live).toBe(false)
    expect(entry.actualTag).toBe(1)
    // The planned assignment stays separate: E2's color, not the tag's area.
    expect(entry.assignedColor).toBe('#00ff00')
  })

  it('omits the tag for captured/history and untagged rows', () => {
    const history = buildDisplayContent(content({ 'area-2': [4] }), {
      allowLive: false,
      tagByOwnedId: { 4: 1 },
    })
    expect(gridRow(history, 4).actualTag).toBeNull()

    const untagged = buildDisplayContent(content({ 'area-2': [4] }), {
      allowLive: true,
      tagByOwnedId: {},
    })
    expect(gridRow(untagged, 4).actualTag).toBeNull()
  })

  it('keeps the game tag while the plan edit moves the ship', () => {
    const tagByOwnedId = { 4: 1 }
    const before = buildDisplayContent(content({ 'area-2': [4] }), {
      allowLive: true,
      tagByOwnedId,
    })
    const after = buildDisplayContent(content({ 'area-1': [4] }), {
      allowLive: true,
      tagByOwnedId,
    })

    expect(gridRow(before, 4).actualTag).toBe(1)
    expect(gridRow(before, 4).assignedColor).toBe('#00ff00')
    // Moving the ship to E1 only changes the plan; the game tag is untouched.
    expect(gridRow(after, 4).actualTag).toBe(1)
    expect(gridRow(after, 4).assignedColor).toBe('#ff0000')
    expect(tagByOwnedId).toEqual({ 4: 1 })
  })
})
