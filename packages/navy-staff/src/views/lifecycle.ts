import { store } from 'views/create-store'
import i18next from 'views/env-parts/i18next'

import FileWriter from '@poi-plugins/shared/file-writer'
import {
  PersistedDataError,
  type PersistenceWriter,
} from '@poi-plugins/shared/persistence'
import { createAccountSupervisor } from './account-supervisor'

// Navy Staff owns its initialization and persistence independently of Ship Info.
// The shared FileWriter is injected per plugin, keyed by its own symbol, so a
// plugin module reload cannot let an old queued save overwrite a newer edit.
// Each account (teitoku member id) gets its own file; see ./account-supervisor.

const __ = i18next.getFixedT(null, ['poi-plugin-navy-staff', 'resources'])

const WRITER_SYMBOL = Symbol.for('poi-plugin-navy-staff@file-writer')

const getHostWriter = (): PersistenceWriter => {
  const host: Window & { [WRITER_SYMBOL]?: PersistenceWriter } = window
  const existing = host[WRITER_SYMBOL]
  if (existing) {
    return existing
  }
  const writer = new FileWriter()
  host[WRITER_SYMBOL] = writer
  return writer
}

const notifyLoadError = (error: PersistedDataError): void => {
  console.error(error.stack ?? error.message)
  if (typeof window.toast === 'function') {
    window.toast(__('loadError'), { type: 'error' })
  }
}

const notifyWriteError = (error: PersistedDataError): void => {
  console.error(error.stack ?? error.message)
  if (typeof window.toast === 'function') {
    window.toast(__('saveError'), { type: 'error' })
  }
}

const supervisor = createAccountSupervisor({
  store,
  writer: getHostWriter(),
  onError: notifyLoadError,
  onWriteError: notifyWriteError,
})

export const pluginDidLoad = (): void => {
  supervisor.start()
}

export const pluginWillUnload = (): void => {
  supervisor.stop()
}
