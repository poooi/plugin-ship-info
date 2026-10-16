import { Classes } from '@blueprintjs/core'
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { Decorator } from '@storybook/react-vite'

import { getTheme, Providers } from '../tests/ui/environment'
import { isLanguage, type Language } from './i18n'
import {
  createScenarioEnvironment,
  disposeScenario,
  type ShipInfoParameters,
} from './scenario'

const readVariant = (value: unknown): 'light' | 'dark' =>
  value === 'light' ? 'light' : 'dark'

const readLanguage = (value: unknown): Language =>
  isLanguage(value) ? value : 'en-US'

// The decorator owns the scenario environment, so a story can remount the real
// root on a fresh environment without building a second environment/provider
// pair that would shadow the toolbar globals. Resetting keeps the active
// theme/locale: the decorator recreates the environment from the same globals.
export const ScenarioResetContext = createContext<() => void>(() => {})

export const useScenarioReset = () => useContext(ScenarioResetContext)

// Wraps every story in the shared providers, a fresh per-story environment and
// a resettable host boundary. Theme/language come from the toolbar globals but
// can be pinned per story through parameters.shipInfo.
export const withShipInfo: Decorator = (Story, context) => {
  const parameters = (context.parameters.shipInfo ?? {}) as ShipInfoParameters
  const theme = readVariant(parameters.theme ?? context.globals.theme)
  const language = readLanguage(parameters.language ?? context.globals.locale)
  const dimensions = parameters.dimensions ?? { height: 640, width: 720 }
  const direction = parameters.direction ?? 'ltr'
  const scenarioKey = `${context.id}|${language}|${theme}`

  // Bumping generation recreates the environment (fresh store and host logs)
  // and remounts the story subtree below, so reset semantics are unchanged
  // while a single environment still powers the providers and globals.
  const [generation, setGeneration] = useState(0)
  const reset = useCallback(() => setGeneration(value => value + 1), [])

  const environment = useMemo(
    () =>
      createScenarioEnvironment({ language, parameters, theme }),
    // Recreate only when the story, the toolbar/pinned scenario or a reset
    // changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scenarioKey, parameters.state, generation],
  )

  // Dispose the lifecycle this surface owns when it unmounts. On a reset the
  // memo has already replaced `environment`, so the stale cleanup is a no-op.
  useEffect(() => () => disposeScenario(environment), [environment])

  // Blueprint portals attach to <body>, so the dark class has to live there to
  // theme portaled overlays too. It is removed again for light.
  useEffect(() => {
    document.body.classList.toggle(Classes.DARK, theme === 'dark')
    return () => document.body.classList.remove(Classes.DARK)
  }, [theme])

  return (
    <ScenarioResetContext.Provider value={reset}>
      <Providers environment={environment} theme={getTheme(theme)}>
        <div
          data-ship-info-scenario=""
          dir={direction}
          key={generation}
          style={{
            background: theme === 'dark' ? '#1c2127' : '#f6f7f9',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            height: dimensions.height,
            padding: 16,
            width: dimensions.width,
          }}
        >
          <Story />
        </div>
      </Providers>
    </ScenarioResetContext.Provider>
  )
}
