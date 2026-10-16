import { Classes } from '@blueprintjs/core'
import React, { useEffect, useMemo } from 'react'
import type { Decorator } from '@storybook/react-vite'

import { getTheme, Providers } from '../tests/ui/environment'
import { isLanguage, type Language } from './i18n'
import { createScenarioEnvironment, type ShipInfoParameters } from './scenario'

const readVariant = (value: unknown): 'light' | 'dark' =>
  value === 'light' ? 'light' : 'dark'

const readLanguage = (value: unknown): Language =>
  isLanguage(value) ? value : 'en-US'

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

  const environment = useMemo(
    () =>
      createScenarioEnvironment({ language, parameters, theme }),
    // Recreate only when the story or the toolbar/pinned scenario changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scenarioKey, parameters.state],
  )

  // Blueprint portals attach to <body>, so the dark class has to live there to
  // theme portaled overlays too. It is removed again for light.
  useEffect(() => {
    document.body.classList.toggle(Classes.DARK, theme === 'dark')
    return () => document.body.classList.remove(Classes.DARK)
  }, [theme])

  return (
    <Providers environment={environment} theme={getTheme(theme)}>
      <div
        data-ship-info-scenario=""
        dir={direction}
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
  )
}
