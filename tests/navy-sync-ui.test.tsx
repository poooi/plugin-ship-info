// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import i18next from 'i18next'
import React from 'react'
import { I18nextProvider } from 'react-i18next'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('views/utils/selectors', async () => (await import('./ui/host')).poiSelectors)
vi.mock('wanakana', async () => (await import('./ui/host')).wanakanaModule)

import type {
  RosterSample,
  SyncAcceptance,
  SyncSourceSnapshot,
  SyncWorkspaceSnapshot,
} from '../packages/navy-staff/src/views/sync/core'
import { acceptAreaSync, acceptTagSync } from '../packages/navy-staff/src/views/sync/core'
import { SyncTools } from '../packages/navy-staff/src/views/sync/SyncTools'

const i18n = i18next.createInstance()
i18n.init({
  defaultNS: 'poi-plugin-navy-staff',
  fallbackLng: false,
  initAsync: false,
  lng: 'en',
  ns: ['poi-plugin-navy-staff'],
  resources: { en: { 'poi-plugin-navy-staff': {} } },
})

const workspace = (over: Partial<SyncWorkspaceSnapshot> = {}): SyncWorkspaceSnapshot => ({
  accountId: 'acct-1',
  content: {
    areas: [
      { capturedAt: 't', color: '#111111', fleetLabels: {}, id: 'a1', label: 'E1 old', tagSlot: 0 },
      { capturedAt: 't', color: '#222222', fleetLabels: {}, id: 'a2', label: 'E2', tagSlot: 5 },
    ],
    assignments: { a1: [1], a2: [2] },
    name: 'Plan',
    ships: {},
  },
  revisionId: 'rev-1',
  workspaceId: 'ws-1',
  ...over,
})

const baseSource = (): SyncSourceSnapshot => ({
  areas: [{ color: '#333333', fleetLabels: {}, label: 'E1 new', slot: 0 }],
  sourceId: 's1',
})

const ship = (over: Record<string, unknown> = {}) => ({
  level: 99,
  masterId: 1,
  name: 'One',
  ownedId: 1,
  tagSlot: 0,
  typeId: 2,
  typeLabel: 'DD',
  ...over,
})

const roster = (
  ships: RosterSample['ships'] = [ship()],
  accountId = 'acct-1',
): RosterSample => ({ accountId, ships })

type Props = React.ComponentProps<typeof SyncTools>

const setup = (overrides: Partial<Props> = {}) => {
  let latest: { workspace: SyncWorkspaceSnapshot | null; source: SyncSourceSnapshot | null; roster: RosterSample | null } = {
    roster: overrides.roster ?? roster(),
    source: overrides.source ?? baseSource(),
    workspace: overrides.workspace ?? workspace(),
  }
  const onCommit = vi.fn(
    (prepared: any, mapping: any): SyncAcceptance => {
      if (!latest.source) return { apply: null, fresh: false, reasons: ['SOURCE_CHANGED'] }
      if (prepared.kind === 'areas') {
        return acceptAreaSync(prepared, { mapping, source: latest.source, workspace: latest.workspace! })
      }
      return latest.roster
        ? acceptTagSync(prepared, { mapping, roster: latest.roster, source: latest.source, workspace: latest.workspace! })
        : { apply: null, fresh: false, reasons: ['ROSTER_CHANGED'] }
    },
  )
  const props: Props = {
    createAreaId: () => 'area-new',
    historyPreview: false,
    onCommit,
    roster: latest.roster,
    source: latest.source,
    workspace: latest.workspace,
    ...overrides,
  }
  const view = render(
    <I18nextProvider i18n={i18n}>
      <SyncTools {...props} />
    </I18nextProvider>,
  )
  const rerender = (next: Partial<Props>) => {
    latest = {
      roster: next.roster ?? latest.roster,
      source: next.source ?? latest.source,
      workspace: next.workspace ?? latest.workspace,
    }
    view.rerender(
      <I18nextProvider i18n={i18n}>
        <SyncTools {...props} {...next} />
      </I18nextProvider>,
    )
  }
  return { onCommit, rerender, view }
}

const button = (name: string) =>
  screen.getByRole('button', { name }) as HTMLButtonElement

const openConfirmedPreview = (mode: string) => {
  fireEvent.click(button(mode))
  fireEvent.click(screen.getByRole('checkbox'))
  fireEvent.click(button('Preview changes'))
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('sync tools', () => {
  it('appends one area batch and retains absent groups', () => {
    const { onCommit } = setup()
    openConfirmedPreview('Update area information')
    expect(screen.getByTestId('sync-area-summary')).toBeTruthy()
    fireEvent.click(button('Accept'))
    expect(onCommit).toHaveBeenCalledTimes(1)
    const [content, operation] = onCommit.mock.results[0].value.apply
      ? [
          onCommit.mock.calls[0][0].nextContent,
          onCommit.mock.calls[0][0].operation,
        ]
      : []
    expect(operation.kind).toBe('update-areas')
    expect(content.assignments.a2).toEqual([2])
    expect(screen.queryByTestId('sync-preview')).toBeNull()
  })

  it('shows old -> new label, color, and fleet labels', () => {
    setup({
      workspace: workspace({
        content: {
          areas: [
            { capturedAt: 't', color: '#111111', fleetLabels: { 'zh-CN': '一' }, id: 'a1', label: 'E1 old', tagSlot: 0 },
          ],
          assignments: { a1: [1] },
          name: 'Plan',
          ships: {},
        },
      }),
      source: {
        areas: [{ color: '#333333', fleetLabels: { 'zh-CN': '新' }, label: 'E1 new', slot: 0 }],
        sourceId: 's1',
      },
    })
    openConfirmedPreview('Update area information')
    const diff = screen.getByTestId('sync-area-diff')
    expect(diff.textContent).toContain('E1 old')
    expect(diff.textContent).toContain('E1 new')
    expect(diff.textContent).toContain('Fleet labels zh-CN: 一 → 新')
  })

  it('offers an Ignore option for unmapped slots in tag sync', () => {
    setup()
    fireEvent.click(button('Apply actual sortie tags'))
    expect(screen.getByRole('option', { name: 'Ignore slot' })).toBeTruthy()
  })

  it('appends one tag batch with the specific ship move', () => {
    const { onCommit } = setup({
      roster: roster([ship({ tagSlot: 1 })]),
      source: {
        areas: [
          { color: '#111111', fleetLabels: {}, label: 'E1', slot: 0 },
          { color: '#222222', fleetLabels: {}, label: 'E2', slot: 1 },
        ],
        sourceId: 's1',
      },
      workspace: workspace({
        content: {
          areas: [
            { capturedAt: 't', color: '#111111', fleetLabels: {}, id: 'a1', label: 'E1', tagSlot: 0 },
            { capturedAt: 't', color: '#222222', fleetLabels: {}, id: 'a2', label: 'E2', tagSlot: 1 },
          ],
          assignments: { a1: [1], a2: [] },
          name: 'Plan',
          ships: {},
        },
      }),
    })
    openConfirmedPreview('Apply actual sortie tags')
    expect(screen.getByText(/#1: E1 → E2/u)).toBeTruthy()
    fireEvent.click(button('Accept'))
    expect(onCommit).toHaveBeenCalledTimes(1)
    expect(onCommit.mock.calls[0][0].operation.kind).toBe('apply-tags')
  })

  it('invalidates the pending batch when the mapping changes', () => {
    setup()
    openConfirmedPreview('Update area information')
    expect(screen.getByTestId('sync-preview')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Slot mapping: E1 new'), { target: { value: 'a2' } })
    expect(screen.queryByTestId('sync-preview')).toBeNull()
  })

  it('reports stale and does not commit when a candidate became tagged', () => {
    const { onCommit, rerender } = setup({ roster: roster([ship({ tagSlot: null })]) })
    openConfirmedPreview('Apply actual sortie tags')
    rerender({ roster: roster([ship({ tagSlot: 0 })]) })
    fireEvent.click(button('Accept'))
    expect(onCommit).toHaveBeenCalledTimes(1)
    expect(onCommit.mock.results[0].value.apply).toBeNull()
    expect(screen.getByText('staleRosterChanged')).toBeTruthy()
  })

  it('reports stale when the revision changes', () => {
    const { rerender } = setup()
    openConfirmedPreview('Update area information')
    rerender({ workspace: workspace({ revisionId: 'rev-2' }) })
    fireEvent.click(button('Accept'))
    expect(screen.getByText('staleRevisionChanged')).toBeTruthy()
  })

  it('closes the flow and drops the pending batch when the loaded account changes', () => {
    const { onCommit, rerender } = setup()
    openConfirmedPreview('Update area information')
    expect(screen.getByTestId('sync-preview')).toBeTruthy()
    rerender({ workspace: workspace({ accountId: 'acct-2' }) })
    expect(screen.queryByTestId('sync-preview')).toBeNull()
    expect(screen.queryByRole('checkbox')).toBeNull()
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('closes the flow when the source is unloaded', () => {
    const { onCommit, rerender } = setup()
    openConfirmedPreview('Update area information')
    rerender({ source: null })
    expect(screen.queryByTestId('sync-preview')).toBeNull()
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('is a no-op when nothing changed and cancel writes nothing', () => {
    const { onCommit } = setup({
      source: { areas: [{ color: '#111111', fleetLabels: {}, label: 'E1 old', slot: 0 }] },
      workspace: workspace({
        content: {
          areas: [{ capturedAt: 't', color: '#111111', fleetLabels: {}, id: 'a1', label: 'E1 old', tagSlot: 0 }],
          assignments: { a1: [1] },
          name: 'Plan',
          ships: {},
        },
      }),
    })
    fireEvent.click(button('Update area information'))
    fireEvent.click(button('Cancel'))
    expect(screen.queryByTestId('sync-preview')).toBeNull()

    openConfirmedPreview('Update area information')
    fireEvent.click(button('Accept'))
    expect(onCommit.mock.results[0].value.apply).toBeNull()
  })

  it('disables tag sync for a different account and during history preview', () => {
    setup({ roster: roster([ship()], 'acct-2') })
    expect(button('Apply actual sortie tags').disabled).toBe(true)
    cleanup()

    setup({ historyPreview: true })
    expect(button('Update area information').disabled).toBe(true)
    expect(button('Apply actual sortie tags').disabled).toBe(true)
  })

  it('closes an open flow and cannot accept when history preview starts', () => {
    const { onCommit, rerender } = setup()
    openConfirmedPreview('Update area information')
    expect(screen.getByTestId('sync-preview')).toBeTruthy()

    rerender({ historyPreview: true })
    // The panel is discarded; Accept is unavailable.
    expect(screen.queryByTestId('sync-preview')).toBeNull()
    expect(screen.queryByRole('checkbox')).toBeNull()
    expect(onCommit).not.toHaveBeenCalled()
  })
})
