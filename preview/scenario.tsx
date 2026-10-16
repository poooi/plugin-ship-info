import './bootstrap'

import { thunk } from 'redux-thunk'

import {
  createEnvironment,
  type Environment,
} from '../tests/ui/environment'
import { tableState } from '../tests/ui/fixtures'
import { reducer as pluginReducer } from '../views/redux'
import { setCreateStore } from './adapters/create-store'
import {
  resetHostState,
  setFileWriteFailure,
  setInitialFiles,
  setSaveDialogResult,
  type SaveDialogResult,
} from './adapters/logs'
import { setLanguage, type Language } from './i18n'

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

export const getEnvironment = (): Environment => {
  if (!current) throw new Error('No ship-info browser scenario is active')
  return current
}

export const createScenarioEnvironment = ({
  language,
  parameters = {},
}: ScenarioInput): Environment => {
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
  current = environment
  return environment
}
