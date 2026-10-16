import { store } from 'views/create-store'
import i18next from 'views/env-parts/i18next'

import FileWriter from '@poi-plugins/ship-info-shared/file-writer'
import {
  PersistedDataError,
  type PersistenceWriter,
} from '@poi-plugins/ship-info-shared/persistence'
import { createPersistence } from './persistence'

// Navy Staff owns its initialization and persistence independently of Ship Info.
// The shared FileWriter is injected per plugin, keyed by its own symbol, so a
// plugin module reload cannot let an old queued save overwrite a newer edit.

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
  if (typeof window.toast !== 'function') {
    return
  }
  if (error.reason === 'legacy') {
    window.toast(__('legacyReadError'), { type: 'error' })
    return
  }
  if (error.reason === 'migrate') {
    window.toast(__('saveError'), { type: 'error' })
    return
  }
  window.toast(__('loadError'), { type: 'error' })
}

const notifyWriteError = (error: PersistedDataError): void => {
  console.error(error.stack ?? error.message)
  if (typeof window.toast === 'function') {
    window.toast(__('saveError'), { type: 'error' })
  }
}

const notifyMigrationWarning = (): void => {
  if (typeof window.toast === 'function') {
    window.toast(__('migrationWarning'), { type: 'warning' })
  }
}

const persistence = createPersistence({
  onError: notifyLoadError,
  onMigrationWarning: notifyMigrationWarning,
  onWriteError: notifyWriteError,
  writer: getHostWriter(),
})

export const pluginDidLoad = (): void => {
  persistence.start(store)
}

export const pluginWillUnload = (): void => {
  persistence.stop()
}
