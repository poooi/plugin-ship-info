import { store } from 'views/create-store'
import i18next from 'views/env-parts/i18next'

import FileWriter from './file-writer'
import {
  createPersistence,
  PersistedDataError,
  type PersistenceWriter,
} from './persistence'

// Plugin-owned initialization and persistence. poi registers the reducer before
// calling `pluginDidLoad` and calls `pluginWillUnload` before removing it, so
// this lifecycle can read/save independently of whether the UI is mounted.

const __ = i18next.getFixedT(null, ['poi-plugin-ship-info', 'resources'])

// poi clears the plugin's module cache on unload, so a reload evaluates a fresh
// module graph. A FileWriter created per module instance would let an old queued
// save overwrite a newer edit. Keep one writer per host window, keyed by a
// package-specific symbol, and inject it into every lifecycle instance so the
// serialized queue (and its drain) survives reloads.
const WRITER_SYMBOL = Symbol.for('poi-plugin-ship-info@file-writer')

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

// `isMain` is intentionally not captured here: it is read lazily from
// `window.isMain` when the load starts, so it cannot be undefined merely because
// the plugin module finished evaluating before poi set the global.
const persistence = createPersistence({
  onError: notifyLoadError,
  onWriteError: notifyWriteError,
  writer: getHostWriter(),
})

export const pluginDidLoad = (): void => {
  global.config.set('plugin.ShipInfo.shipTypeChecked')
  global.config.set('plugin.ShipInfo.bounds')
  persistence.start(store)
}

export const pluginWillUnload = (): void => {
  persistence.stop()
}
