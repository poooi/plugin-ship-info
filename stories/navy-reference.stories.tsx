import type { Meta, StoryObj } from '@storybook/react-vite'
import { remote } from 'electron'
import React from 'react'
import { expect, fireEvent, screen, userEvent, waitFor, within } from 'storybook/test'

import { reactClass as NavyStaff } from '../packages/navy-staff/src/views'
import type { DecodedReference } from '../packages/navy-staff/src/views/reference/types'
import { encodeReference } from '../preview/adapters/reference-codec'
import { host } from '../preview/adapters/logs'
import {
  NAVY_PLUGIN_KEY,
  navyAccountFile,
  persistedNavyFile,
  plannerOwnedShips,
  plannerScenarioState,
} from '../preview/planner-fixtures'
import { getEnvironment } from '../preview/scenario'
import i18n from '../preview/i18n'
import { mkShip } from '../tests/fixtures'

const Shell: React.FC = () => (
  <div style={{ display: 'flex', height: 760, width: 1200 }}>
    <NavyStaff />
  </div>
)

const meta = {
  title: 'NavyStaff/References',
  component: Shell,
  parameters: {
    shipInfo: { dimensions: { height: 760, width: 1240 }, plugin: 'navy-staff' as const },
  },
} satisfies Meta<typeof Shell>

export default meta
type Story = StoryObj<typeof meta>

const navy = () => (getEnvironment().store.getState() as any)[NAVY_PLUGIN_KEY].navy

const click = (name: string) =>
  userEvent.click(screen.getByRole('button', { name }))

const openPage = async (page: 'plan' | 'reference' | 'share') => {
  const names = { plan: 'Plan', reference: 'Reference', share: 'Share' }
  const navigation = await screen.findByRole('navigation')
  await userEvent.click(within(navigation).getByRole('button', {
    name: i18n.t(names[page], { ns: 'poi-plugin-navy-staff' }),
  }))
}
const openShare = () => openPage('share')
const openReference = () => openPage('reference')

const selectHistoryRevision = async (value: string) => {
  await openPage('plan')
  fireEvent.click(screen.getByRole('button', { name: 'History' }))
  fireEvent.change(screen.getByLabelText('History'), { target: { value } })
}

const exportCurrent = async (): Promise<string> => {
  await click('Generate share text')
  const share = (await screen.findByTestId('share-text')) as HTMLTextAreaElement
  return share.value
}

const importCode = async (code: string) => {
  await openReference()
  const t = i18n.getFixedT(null, 'poi-plugin-navy-staff')
  const reopen = screen.queryByRole('button', { name: t('Open another reference') })
  if (reopen) await userEvent.click(reopen)
  const textarea = screen.getByPlaceholderText(t('Paste a share code or open a text file'))
  fireEvent.change(textarea, { target: { value: code } })
  await click(t('Open'))
}

const activeReferenceView = async () => {
  let result: HTMLElement | undefined
  await waitFor(() => {
    result = screen.queryAllByTestId('reference-view').find(element => element.checkVisibility())
    expect(result).toBeTruthy()
  })
  return result!
}

const sampleDecoded = (): DecodedReference => ({
  captureTime: '2026-01-01T00:00:00.000Z',
  exportTime: '2026-01-02T00:00:00.000Z',
  groups: [
    {
      color: '#6699cc',
      label: 'E1',
      ships: [
        { level: 50, masterId: 999999 },
        { level: null, masterId: null },
      ],
    },
  ],
  locale: 'en-US',
  schemaVersion: 1,
  title: 'Imported reference',
})

const shipRecord = (level: number | null) => ({
  level,
  masterId: 1,
  name: 'Alpha',
  observedAt: '2026-01-01T00:00:00.000Z',
  ownedId: 1,
  typeId: 2,
  typeLabel: 'DD',
})

/** Replaces the single workspace with two revisions so history preview works. */
const withTwoRevisions = (
  state: any,
  content: any,
  cursor = 1,
): any => {
  const workspace = state[NAVY_PLUGIN_KEY].navy.workspaces[0]
  workspace.revisions = [
    { content, id: 'rev-1', op: { kind: 'initial' }, time: '2026-01-01T00:00:00.000Z' },
    { content, id: 'rev-2', op: { kind: 'initial' }, time: '2026-01-02T00:00:00.000Z' },
  ]
  workspace.cursor = cursor
  return state
}

const waitForReady = () =>
  waitFor(async () => {
    await expect((getEnvironment().store.getState() as any)[NAVY_PLUGIN_KEY].ready).toBe(true)
  })

const settle = () => new Promise((resolve) => setTimeout(resolve, 25))

/**
 * Run with the real account lifecycle and a pre-seeded account file, so a load
 * never writes and any later write is a genuine, observable regression.
 */
const seededParams = (
  options: Parameters<typeof plannerScenarioState>[0] = {},
) => {
  const state: any = plannerScenarioState(options)
  return {
    files: persistedNavyFile(state[NAVY_PLUGIN_KEY].navy),
    lifecycle: true,
    plugin: 'navy-staff' as const,
    state,
  }
}

export const ImportIsolation: Story = {
  name: 'Paste import opens read-only and never mutates workspace, cursor, or files',
  parameters: { shipInfo: seededParams({ current: [[1], [2], []] }) },
  play: async () => {
    await waitForReady()
    await settle()
    const filePath = navyAccountFile('123')
    const fileBefore = JSON.stringify(host.log.files[filePath])
    const writesBefore = host.log.writtenFiles.length
    const before = JSON.stringify(navy())
    const cursorBefore = navy().workspaces[0].cursor

    await openShare()
    const code = await exportCurrent()
    await openReference()
    await expect(within(screen.getByTestId('reference-tools')).queryByTestId('reference-view')).toBeNull()

    await importCode(code)
    await expect(await activeReferenceView()).toBeTruthy()
    await settle()

    await expect(JSON.stringify(host.log.files[filePath])).toBe(fileBefore)
    await expect(host.log.writtenFiles.length).toBe(writesBefore)
    await expect(JSON.stringify(navy())).toBe(before)
    await expect(navy().workspaces[0].cursor).toBe(cursorBefore)
  },
}

export const FileImportIsolation: Story = {
  name: 'File import opens read-only and never mutates workspace, cursor, or files',
  parameters: { shipInfo: seededParams({ current: [[1], [2], []] }) },
  play: async () => {
    await waitForReady()
    await settle()
    const filePath = navyAccountFile('123')
    const fileBefore = JSON.stringify(host.log.files[filePath])
    const writesBefore = host.log.writtenFiles.length
    const before = JSON.stringify(navy())
    const cursorBefore = navy().workspaces[0].cursor

    await openShare()
    const code = encodeReference(sampleDecoded())
    await openReference()
    const input = screen.getByTestId('reference-file-input')
    fireEvent.change(input, {
      target: { files: [new File([code], 'reference.txt', { type: 'text/plain' })] },
    })

    await expect(await activeReferenceView()).toBeTruthy()
    await settle()

    await expect(JSON.stringify(host.log.files[filePath])).toBe(fileBefore)
    await expect(host.log.writtenFiles.length).toBe(writesBefore)
    await expect(JSON.stringify(navy())).toBe(before)
    await expect(navy().workspaces[0].cursor).toBe(cursorBefore)
  },
}

export const ImportSurvivesTabChanges: Story = {
  name: 'Import draft and opened reference survive tab changes without durable writes',
  parameters: { shipInfo: seededParams({ current: [[1], [2], []] }) },
  play: async () => {
    await waitForReady()
    await settle()
    const filePath = navyAccountFile('123')
    const fileBefore = JSON.stringify(host.log.files[filePath])
    const writesBefore = host.log.writtenFiles.length

    await openShare()
    await openReference()
    const draft = screen.getByPlaceholderText(
      'Paste a share code or open a text file',
    ) as HTMLTextAreaElement
    const code = encodeReference(sampleDecoded())
    fireEvent.change(draft, { target: { value: code } })

    // Detour to Plan and back: the draft and the open import panel survive.
    await userEvent.click(screen.getByRole('button', { name: 'Plan' }))
    await openReference()
    await expect(
      (
        screen.getByPlaceholderText(
          'Paste a share code or open a text file',
        ) as HTMLTextAreaElement
      ).value,
    ).toBe(code)

    // Open the imported reference; it is labeled by its own title.
    await click('Open')
    const result = await screen.findByTestId('reference-result')
    await expect(
      within(result).getByText('Imported reference'),
    ).toBeTruthy()

    // Detour again: the opened reference survives.
    await userEvent.click(screen.getByRole('button', { name: 'Plan' }))
    await openReference()
    await expect(screen.getByTestId('reference-view')).toBeTruthy()

    // Read-only: no durable writes and the result title stays distinct from the
    // current workspace name.
    await settle()
    await expect(JSON.stringify(host.log.files[filePath])).toBe(fileBefore)
    await expect(host.log.writtenFiles.length).toBe(writesBefore)
    const workspace = navy().workspaces[0]
    const workspaceName = workspace.revisions[workspace.cursor].content.name
    await expect(workspaceName).not.toBe('Imported reference')
    await expect(
      within(screen.getByTestId('reference-result')).queryByText(workspaceName),
    ).toBeNull()
  },
}

export const CurrentVsHistoryLevel: Story = {
  name: 'Current export freezes the live level; history export keeps the captured level',
  parameters: {
    shipInfo: {
      lifecycle: false,
      plugin: 'navy-staff',
      state: (() => {
        const state = plannerScenarioState({ current: [[1], []] })
        return withTwoRevisions(state, {
          ...state[NAVY_PLUGIN_KEY].navy.workspaces[0].revisions[0].content,
          ships: { '1': shipRecord(10) },
        })
      })(),
    },
  },
  play: async () => {
    // Current revision (live overlay) exports the live level.
    await openShare()
    await importCode(await exportCurrent())
    const currentView = await activeReferenceView()
    await expect(within(currentView).getByText('Lv.50')).toBeTruthy()

    // Preview the older revision: the export uses the captured level only.
    await selectHistoryRevision('rev-1')
    await expect(await screen.findByText('History is read-only. Return to the current plan to edit.')).toBeTruthy()
    await click('Share this state')
    await importCode(await exportCurrent())
    const historyView = await activeReferenceView()
    await expect(within(historyView).getByText('Lv.10')).toBeTruthy()
    await expect(within(historyView).queryByText('Lv.50')).toBeNull()
  },
}

export const MissingMasterRawExport: Story = {
  name: 'Current export keeps a missing-master live ship raw id/level; history is captured only',
  parameters: {
    shipInfo: {
      lifecycle: false,
      plugin: 'navy-staff',
      state: (() => {
        const state = plannerScenarioState({
          current: [[9], []],
          ships: {
            ...plannerOwnedShips,
            9: mkShip({ api_id: 9, api_lv: 42, api_sally_area: 0, api_ship_id: 9999 }),
          },
        })
        return withTwoRevisions(state, {
          ...state[NAVY_PLUGIN_KEY].navy.workspaces[0].revisions[0].content,
          ships: {
            '9': {
              level: 7,
              masterId: 9999,
              name: null,
              observedAt: '2026-01-01T00:00:00.000Z',
              ownedId: 9,
              typeId: null,
              typeLabel: null,
            },
          },
        })
      })(),
    },
  },
  play: async () => {
    // Current export: the raw owned ship (api_ship_id/api_lv) is frozen even
    // though no master metadata exists for 9999.
    await openShare()
    await importCode(await exportCurrent())
    const currentView = await activeReferenceView()
    await expect(within(currentView).getByText('#9999')).toBeTruthy()
    await expect(within(currentView).getByText('Lv.42')).toBeTruthy()

    // Historical export: captured record only.
    await selectHistoryRevision('rev-1')
    await click('Share this state')
    await importCode(await exportCurrent())
    const historyView = await activeReferenceView()
    await expect(within(historyView).getByText('#9999')).toBeTruthy()
    await expect(within(historyView).getByText('Lv.7')).toBeTruthy()
  },
}

export const ImportWithoutMasters: Story = {
  name: 'Not-ready, no account, and no masters: export disabled but import works with ???',
  parameters: {
    shipInfo: {
      lifecycle: false,
      plugin: 'navy-staff',
      state: (() => {
        const state: any = plannerScenarioState({
          current: [[], [], []],
          mstShips: {},
          ships: {},
        })
        // No loaded account and no readiness: live data and export are
        // unavailable, but the reference tools stay mounted.
        state.info.basic.api_member_id = undefined
        state[NAVY_PLUGIN_KEY] = {
          account: null,
          error: null,
          navy: state[NAVY_PLUGIN_KEY].navy,
          ready: false,
        }
        return state
      })(),
    },
  },
  play: async () => {
    await openShare()
    const exportButton = screen.getByRole('button', { name: 'Generate share text' }) as HTMLButtonElement
    await expect(exportButton.disabled).toBe(true)

    await importCode(encodeReference(sampleDecoded()))
    const view = await activeReferenceView()
    await expect(within(view).getByText('Imported reference')).toBeTruthy()
    await expect(within(view).getAllByText('???')).toHaveLength(2)
    await expect(within(view).getByText('Lv.50')).toBeTruthy()
    await expect(within(view).getByText('Lv.?')).toBeTruthy()
    await expect(within(view).getByText('#999999')).toBeTruthy()

    // The produced output is labeled by the opened reference's own title, not
    // the current workspace ("Plan").
    const result = screen.getByTestId('reference-result')
    await expect(
      within(result).getByText('Imported reference'),
    ).toBeTruthy()
    await expect(within(result).queryByText('Plan')).toBeNull()
  },
}

export const DeferredFileSuperseded: Story = {
  name: 'An oversized second file invalidates a slower first file read',
  parameters: {
    shipInfo: { lifecycle: false, plugin: 'navy-staff', state: plannerScenarioState() },
  },
  play: async () => {
    const code = encodeReference(sampleDecoded())
    // Control the first file's read so it resolves only after B supersedes it.
    let resolveFirst: ((text: string) => void) | undefined
    const originalText = File.prototype.text
    File.prototype.text = function (this: File) {
      if (this.name === 'a.txt') {
        return new Promise<string>((resolve) => {
          resolveFirst = resolve
        })
      }
      return originalText.call(this)
    }

    try {
      await openShare()
      await openReference()
      const input = screen.getByTestId('reference-file-input')

      // Start a valid read (held open), then supersede it with an oversized file.
      fireEvent.change(input, {
        target: { files: [new File([code], 'a.txt', { type: 'text/plain' })] },
      })
      fireEvent.change(input, {
        target: { files: [new File([new Uint8Array(200000)], 'b.txt', { type: 'text/plain' })] },
      })

      const error = await screen.findByTestId('reference-error')
      await expect(error.textContent).toContain('This share text is too large to open.')

      // The deferred read capturing a resolver is a precondition, not an
      // optional path; resolve it and flush React updates before asserting.
      await expect(typeof resolveFirst).toBe('function')
      const resolve = resolveFirst as (text: string) => void
      await React.act(async () => {
        resolve(code)
      })
      await expect(error.textContent).toContain('This share text is too large to open.')
      await expect(screen.queryByTestId('reference-view')).toBeNull()
    } finally {
      File.prototype.text = originalText
    }
  },
}

export const EmptyGroupsAndGridArea: Story = {
  name: 'Empty captured groups stay visible and the grid shows assignment area',
  parameters: {
    shipInfo: { lifecycle: false, plugin: 'navy-staff', state: plannerScenarioState({ current: [[1], []] }) },
  },
  play: async () => {
    await openShare()
    await importCode(await exportCurrent())
    const view = await activeReferenceView()
    // Empty captured area stays visible with a zero count when not searching.
    await expect(within(view).getByText('E2')).toBeTruthy()

    await userEvent.click(within(view).getByRole('button', { name: 'Ship Grid' }))
    // The grid keeps the assigning area label for the row.
    await expect(within(view).getAllByText('E1').length).toBeGreaterThan(0)
  },
}

export const LocalizedFailures: Story = {
  name: 'Copy and save failures show localized errors',
  parameters: {
    shipInfo: {
      fileWriteError: true,
      lifecycle: false,
      plugin: 'navy-staff',
      saveDialog: { canceled: false, filePath: '/tmp/navy-reference.txt' },
      state: plannerScenarioState(),
    },
  },
  play: async () => {
    await openShare()
    await exportCurrent()

    // Force the clipboard boundary to throw for this case only.
    const original = remote.clipboard.writeText
    remote.clipboard.writeText = async () => {
      throw new Error('clipboard unavailable')
    }
    try {
      await click('Copy share text')
      const copyError = await screen.findByTestId('share-error')
      await expect(copyError.textContent).toContain('Could not copy the share text.')
    } finally {
      remote.clipboard.writeText = original
    }

    await click('Save share text')
    await waitFor(async () => {
      await expect(screen.getByTestId('share-error').textContent).toContain(
        'Could not save the share text.',
      )
     })
  },
}

const openGeneratedReference = async () => {
  await click(i18n.t('Generate share text', { ns: 'poi-plugin-navy-staff' }))
  const code = (screen.getByTestId('share-text') as HTMLTextAreaElement).value
  await importCode(code)
}

const localizedTypeSearchStory = (
  language: 'zh-CN' | 'ja-JP' | 'ko-KR',
  localizedType: string,
): Story => ({
  name: `Searching the visible localized type label matches rows (${language})`,
  parameters: {
    shipInfo: {
      language,
      lifecycle: false,
      plugin: 'navy-staff',
      state: plannerScenarioState({ current: [[1], []] }),
    },
  },
  play: async () => {
    await openShare()
    await openGeneratedReference()
    const view = await activeReferenceView()
    // The visible type is the localized label, not the raw key.
    await expect(within(view).getByText(localizedType)).toBeTruthy()

    const search = within(view).getByRole('textbox')

    // Searching the visible localized type matches the row.
    fireEvent.change(search, { target: { value: localizedType } })
    await expect(within(view).getByTestId('reference-ship')).toBeTruthy()

    // The raw type key still matches too.
    fireEvent.change(search, { target: { value: 'DD' } })
    await expect(within(view).getByTestId('reference-ship')).toBeTruthy()

    // A non-matching query hides every row.
    fireEvent.change(search, { target: { value: 'zzz-no-match' } })
    await expect(within(view).queryByTestId('reference-ship')).toBeNull()

    // Master-ID search is retained.
    fireEvent.change(search, { target: { value: '1' } })
    await expect(within(view).getByTestId('reference-ship')).toBeTruthy()
  },
})

export const SearchLocalizedTypeZhCN = localizedTypeSearchStory('zh-CN', '驱逐')
export const SearchLocalizedTypeJaJP = localizedTypeSearchStory('ja-JP', '驅逐')
export const SearchLocalizedTypeKoKR = localizedTypeSearchStory('ko-KR', '구축함')


export const ReferenceIndependentFromSharing: Story = {
  name: 'Sharing preserves the opened reference and query; later edits do not change generated text',
  parameters: { shipInfo: seededParams({ current: [[1], [2], []] }) },
  play: async () => {
    await waitForReady()
    await importCode(encodeReference(sampleDecoded()))
    const reference = await activeReferenceView()
    const query = within(reference).getByRole('textbox')
    fireEvent.change(query, { target: { value: '999999' } })
    const before = JSON.stringify(navy())
    await openShare()
    const text = await exportCurrent()
    expect(JSON.stringify(navy())).toBe(before)
    await openReference()
    expect(await activeReferenceView()).toBe(reference)
    expect((query as HTMLInputElement).value).toBe('999999')
    expect(within(reference).getByText('Imported reference')).toBeTruthy()

    await openPage('plan')
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'View' }), 'grid')
    await userEvent.selectOptions(screen.getByLabelText('Assign to'), 'area-2')
    await userEvent.click(screen.getByRole('button', { name: 'Alpha Lv.50' }))
    await waitFor(() => expect(JSON.stringify(navy())).not.toBe(before))
    await openShare()
    expect((screen.getByTestId('share-text') as HTMLTextAreaElement).value).toBe(text)
    await openReference()
    expect(await activeReferenceView()).toBe(reference)
  },
}


export const RemovedHistorySourceCannotShareCurrentSilently: Story = {
  name: 'A discarded historical source requires explicit reselection before sharing',
  parameters: {
    shipInfo: {
      lifecycle: false,
      plugin: 'navy-staff',
      state: (() => {
        const state = plannerScenarioState({ current: [[1], []] })
        return withTwoRevisions(state, state[NAVY_PLUGIN_KEY].navy.workspaces[0].revisions[0].content)
      })(),
    },
  },
  play: async () => {
    await selectHistoryRevision('rev-2')
    await click('Share this state')
    const frozen = await exportCurrent()
    await openPage('plan')
    await click('Undo')
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'View' }), 'grid')
    await userEvent.selectOptions(screen.getByLabelText('Assign to'), 'area-2')
    await userEvent.click(screen.getByRole('button', { name: 'Alpha Lv.50' }))
    await openShare()
    expect(screen.getByRole('button', { name: 'Generate share text' })).toBeDisabled()
    expect((screen.getByTestId('share-text') as HTMLTextAreaElement).value).toBe(frozen)
    await click('Use current plan')
    expect(screen.getByRole('button', { name: 'Generate share text' })).not.toBeDisabled()
  },
}
