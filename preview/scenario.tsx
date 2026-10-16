import './bootstrap'

import { thunk } from 'redux-thunk'

import {
  createEnvironment,
  type Environment,
} from '../tests/ui/environment'
import { tableState } from '../tests/ui/fixtures'
import { createPersistence, type Persistence } from '../packages/ship-info/src/views/persistence'
import { reducer as pluginReducer } from '../packages/ship-info/src/views/redux'
import { setCreateStore } from './adapters/create-store'
import {
  host,
  resetHostState,
  setFileWriteFailure,
  setInitialFiles,
  setSaveDialogResult,
  type SaveDialogResult,
} from './adapters/logs'
import { i18n, setLanguage, type Language } from './i18n'

// Typed scenario surface for stories. Direct state is used to simulate incoming
// host updates; workflows use real user interactions and the real plugin
// reducer/thunk.

export interface ShipInfoParameters {
  /** Redux host state; defaults to the shared tableState() fixture. */
  state?: any
  /** Whether the story runs in poi's main window (affects e.g. capture UI). */
  isMain?: boolean
  /** Seed files for the in-memory fs boundary, keyed by absolute path. */
  files?: Record<string, unknown>
  /**
   * Start the real plugin persistence lifecycle (load seeded file, subscribe to
   * the store, write on change). Opt in only for integrated root/lifecycle
   * stories: component-only stories must not accidentally assert against
   * persistence writes.
   */
  lifecycle?: boolean
  /** Result returned by the in-memory save dialog. */
  saveDialog?: SaveDialogResult
  /** Make the in-memory file write reject (export failure path). */
  fileWriteError?: boolean
  /** Text direction for the scenario surface. */
  direction?: 'ltr' | 'rtl'
  /** Bounding box for the decorated story surface. */
  dimensions?: { width: number; height: number }
  /** Per-story theme override; falls back to the toolbar global. */
  theme?: 'light' | 'dark'
  /** Per-story language override; falls back to the toolbar global. */
  language?: Language
}

export interface ScenarioInput {
  language: Language
  parameters?: ShipInfoParameters
  theme: 'light' | 'dark'
}

let current: Environment | undefined
let currentPersistence: Persistence | undefined

export const getEnvironment = (): Environment => {
  if (!current) throw new Error('No ship-info browser scenario is active')
  return current
}

export const createScenarioEnvironment = ({
  language,
  parameters = {},
}: ScenarioInput): Environment => {
  // The plugin lifecycle, not the mounted UI, owns loading and saving. Stop the
  // previous scenario's subscription: stop only unsubscribes and invalidates a
  // pending load, so already-queued saves still finish (the preview fs adapter
  // settles them synchronously).
  currentPersistence?.stop()
  currentPersistence = undefined
  resetHostState()
  setInitialFiles(parameters.files)
  setSaveDialogResult(parameters.saveDialog)
  setFileWriteFailure(parameters.fileWriteError)
  setLanguage(language)

  const environment = createEnvironment(parameters.state ?? tableState(), {
    isMain: parameters.isMain ?? true,
    language,
    middleware: [thunk],
    pluginReducer,
  })

  setCreateStore(environment.store)

  // The host toast is a real poi global; record it (instead of ignoring it) so
  // a load failure stays observable in stories.
  window.toast = (content, options) => {
    host.log.toasts.push({ content, options })
  }

  if (parameters.lifecycle) {
    currentPersistence = createPersistence({
      isMain: environment.windowObj.isMain,
      onError: () => {
        window.toast?.(i18n.t('loadError'), { type: 'error' })
      },
      onWriteError: () => {
        window.toast?.(i18n.t('saveError'), { type: 'error' })
      },
    })
    currentPersistence.start(environment.store)
  }

  current = environment
  return environment
}

/** Stops the active scenario's persistence when the owning surface unmounts. */
export const disposeScenario = (environment?: Environment): void => {
  if (environment && current !== environment) {
    return
  }
  currentPersistence?.stop()
  currentPersistence = undefined
}
