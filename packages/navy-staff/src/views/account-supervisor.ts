import { get } from 'lodash'

import type {
  Persistence,
  PersistenceStore,
  PersistenceWriter,
} from '@poi-plugins/shared/persistence'
import { accountFilePath, normalizeMemberId } from './account'
import { ACTIONS } from './plugin-identity'
import { createPersistence, type NavyPersistenceOptions } from './persistence'

// Account-file supervisor: watches the host member id, resets readiness + the
// loaded-account marker atomically, and switches the active persistence engine.
// Reused by the plugin lifecycle and by the browser preview so account switching
// behaves identically. It is a small function, not a framework.

export interface AccountSupervisorOptions {
  store: PersistenceStore
  writer?: PersistenceWriter
  onError?: NavyPersistenceOptions['onError']
  onWriteError?: NavyPersistenceOptions['onWriteError']
  listAccountFiles?: NavyPersistenceOptions['listAccountFiles']
  legacyShipInfoDataPath?: string
  isMain?: boolean
}

export interface AccountSupervisor {
  readonly started: boolean
  start: () => void
  stop: () => void
}

export const createAccountSupervisor = (
  options: AccountSupervisorOptions,
): AccountSupervisor => {
  let activeEngine: Persistence | undefined
  let activeMemberId: string | null = null
  let unsubscribe: (() => void) | undefined
  let started = false

  const hostMemberId = (): string | null =>
    normalizeMemberId(get(options.store.getState(), 'info.basic.api_member_id'))

  const activate = (memberId: string | null): void => {
    if (activeEngine) {
      activeEngine.stop()
      activeEngine = undefined
    }
    // Set the active identity before dispatching so a reentrant store change
    // sees the new identity and does not switch again.
    activeMemberId = memberId
    // Reset readiness and the loaded-account marker atomically in one action.
    // The engine's own plain loadStart preserves the marker.
    options.store.dispatch({ type: ACTIONS.loadStart, account: memberId })

    if (memberId === null) return
    const dataPath = accountFilePath(memberId)
    if (dataPath === null) return

    const engine = createPersistence({
      dataPath,
      isMain: options.isMain,
      legacyShipInfoDataPath: options.legacyShipInfoDataPath,
      listAccountFiles: options.listAccountFiles,
      onError: options.onError,
      onWriteError: options.onWriteError,
      writer: options.writer,
    })
    activeEngine = engine
    engine.start(options.store)
  }

  const sync = (): void => {
    if (!started) return
    const next = hostMemberId()
    if (next === activeMemberId) return
    activate(next)
  }

  return {
    get started() {
      return started
    },
    start: () => {
      // Idempotent: a duplicate load must not add a second watcher.
      if (started) return
      if (!(options.isMain ?? window.isMain)) return
      started = true
      unsubscribe = options.store.subscribe(sync)
      activate(hostMemberId())
    },
    stop: () => {
      started = false
      unsubscribe?.()
      unsubscribe = undefined
      activeEngine?.stop()
      activeEngine = undefined
      activeMemberId = null
    },
  }
}
