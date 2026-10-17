import './bootstrap'

import { thunk } from 'redux-thunk'

import type { Persistence } from '../packages/shared/src/persistence'
import FileWriter from '../packages/shared/src/file-writer'
import {
  createAccountSupervisor,
  type AccountSupervisor,
} from '../packages/navy-staff/src/views/account-supervisor'
import { reducer as navyReducer } from '../packages/navy-staff/src/views/redux'
import { createPersistence as createShipInfoPersistence } from '../packages/ship-info/src/views/persistence'
import { reducer as shipInfoReducer } from '../packages/ship-info/src/views/redux'
import {
  createEnvironment,
  type Environment,
} from '../tests/ui/environment'
import { tableState } from '../tests/ui/fixtures'
import { setCreateStore } from './adapters/create-store'
import {
  host,
  resetHostState,
  setFileWriteFailure,
  setInitialFiles,
  setSaveDialogResult,
  type SaveDialogResult,
} from './adapters/logs'
import { i18n, type Language } from './i18n'

// Typed scenario surface for stories. Direct state is used to simulate incoming
// host updates; workflows use real user interactions and the real plugin
// reducer/thunk.

export type ScenarioPlugin = 'both' | 'navy-staff' | 'ship-info'

export interface ShipInfoParameters {
  /** Redux host state; defaults to the shared tableState() fixture. */
  state?: any
  /** Whether the story runs in poi's main window (affects e.g. capture UI). */
  isMain?: boolean
  /**
   * Which plugin(s) this scenario models. Controls which reducers are
   * registered and which persistence lifecycles are started.
   */
  plugin?: ScenarioPlugin
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
let currentPersistences: Persistence[] = []
let currentSupervisors: AccountSupervisor[] = []

export const getEnvironment = (): Environment => {
  if (!current) throw new Error('No ship-info browser scenario is active')
  return current
}

const toastError = (namespace: string) => () => {
  window.toast?.(i18n.t('loadError', { ns: namespace }), { type: 'error' })
}
const toastWriteError = (namespace: string) => () => {
  window.toast?.(i18n.t('saveError', { ns: namespace }), { type: 'error' })
}

export const createScenarioEnvironment = ({
  language,
  parameters = {},
}: ScenarioInput): Environment => {
  // The plugin lifecycle, not the mounted UI, owns loading and saving. Stop the
  // previous scenario's subscriptions: stop only unsubscribes and invalidates a
  // pending load, so already-queued saves still finish (the preview fs adapter
  // settles them synchronously).
  for (const persistence of currentPersistences) {
    persistence.stop()
  }
  currentPersistences = []
  for (const supervisor of currentSupervisors) {
    supervisor.stop()
  }
  currentSupervisors = []
  resetHostState()
  setInitialFiles(parameters.files)
  setSaveDialogResult(parameters.saveDialog)
  setFileWriteFailure(parameters.fileWriteError)

  const plugin = parameters.plugin ?? 'ship-info'
  const includeShipInfo = plugin === 'ship-info' || plugin === 'both'
  const includeNavy = plugin === 'navy-staff' || plugin === 'both'

  const environment = createEnvironment(parameters.state ?? tableState(), {
    isMain: parameters.isMain ?? true,
    language,
    middleware: [thunk],
    pluginReducer: includeShipInfo ? shipInfoReducer : undefined,
    pluginReducers: includeNavy
      ? { 'poi-plugin-navy-staff': navyReducer }
      : undefined,
  })

  setCreateStore(environment.store)

  // The host toast is a real poi global; record it (instead of ignoring it) so
  // a load failure stays observable in stories.
  window.toast = (content, options) => {
    host.log.toasts.push({ content, options })
  }

  if (parameters.lifecycle) {
    if (includeShipInfo) {
      const persistence = createShipInfoPersistence({
        isMain: environment.windowObj.isMain,
        onError: toastError('poi-plugin-ship-info'),
        onWriteError: toastWriteError('poi-plugin-ship-info'),
      })
      persistence.start(environment.store)
      currentPersistences.push(persistence)
    }
    if (includeNavy) {
      const supervisor = createAccountSupervisor({
        isMain: environment.windowObj.isMain,
        onError: toastError('poi-plugin-navy-staff'),
        onWriteError: toastWriteError('poi-plugin-navy-staff'),
        store: environment.store,
        writer: new FileWriter(),
      })
      supervisor.start()
      currentSupervisors.push(supervisor)
    }
  }

  current = environment
  return environment
}

/** Stops the active scenario's persistence when the owning surface unmounts. */
export const disposeScenario = (environment?: Environment): void => {
  if (environment && current !== environment) {
    return
  }
  for (const persistence of currentPersistences) {
    persistence.stop()
  }
  currentPersistences = []
  for (const supervisor of currentSupervisors) {
    supervisor.stop()
  }
  currentSupervisors = []
}
