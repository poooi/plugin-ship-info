import { set as setPath } from 'lodash'
import React from 'react'
import { Provider as ReduxProvider } from 'react-redux'
import { I18nextProvider } from 'react-i18next'
import { createStore as createJotaiStore, Provider as JotaiProvider } from 'jotai'
import { applyMiddleware, legacy_createStore } from 'redux'
import { ThemeProvider } from 'styled-components'

import i18next from 'views/env-parts/i18next'
import { WindowEnv } from 'views/components/etc/window-env'

// Shared Redux/Jotai/i18n/theme/WindowEnv environment. Free of
// testing-library/react and vitest so Storybook and real Chromium tests can
// reuse it; the jsdom render adapter in harness.tsx layers on top.

const PLUGIN_KEY = 'poi-plugin-ship-info'

// The plugin reads these tokens off the poi theme.
export const defaultTheme = {
  BLUE1: '#106ba3',
  BLUE2: '#0e5a8a',
  BLUE3: '#0a4c76',
  BLUE4: '#084161',
  BLUE5: '#2b95d6',
  COBALT3: '#4c90f0',
  DARK_GRAY1: '#111418',
  DARK_GRAY2: '#1c2127',
  DARK_GRAY3: '#383e47',
  DARK_GRAY4: '#404854',
  DARK_GRAY5: '#1c2127',
  GRAY1: '#5f6b7c',
  GRAY2: '#738091',
  GRAY3: '#8f99a8',
  GRAY4: '#abb3bf',
  GRAY5: '#c5cbd3',
  GREEN1: '#0f9960',
  GREEN2: '#15b371',
  GREEN3: '#3dcc91',
  GREEN4: '#43bf74',
  GREEN5: '#76c576',
  INDIGO3: '#4c90f0',
  LIGHT_GRAY1: '#d3d8de',
  LIGHT_GRAY2: '#dce0e5',
  LIGHT_GRAY3: '#e5e8eb',
  LIGHT_GRAY4: '#edeff2',
  LIGHT_GRAY5: '#f6f7f9',
  LIME3: '#9bb50d',
  ORANGE1: '#c87619',
  ORANGE2: '#de7300',
  ORANGE3: '#c87619',
  ORANGE4: '#bb6b00',
  ORANGE5: '#b15b00',
  RED1: '#cd4246',
  RED2: '#ac2f33',
  RED3: '#cd4246',
  RED4: '#e76a6e',
  RED5: '#fa999c',
  TEXT_PRIMARY: '#f6f7f9',
  TEXT_SECONDARY: '#abb3bf',
  variant: 'dark' as 'light' | 'dark',
}

export const theme = defaultTheme

export const getTheme = (variant: 'light' | 'dark') =>
  variant === 'dark'
    ? defaultTheme
    : { ...defaultTheme, variant: 'light' as const }

export interface Environment {
  configCalls: [string, any][]
  jotaiStore: ReturnType<typeof createJotaiStore>
  setConfig: (path: string, value: any) => void
  store: any
  windowObj: any
}

export interface EnvironmentOptions {
  isMain?: boolean
  language?: string
  middleware?: any[]
  /** Ship Info plugin reducer (registered under its plugin key). */
  pluginReducer?: (state: any, action: any) => any
  /** Additional plugin reducers, keyed by their plugin key. */
  pluginReducers?: Record<string, (state: any, action: any) => any>
}

export const createEnvironment = (
  initialState: any,
  options: EnvironmentOptions = {},
): Environment => {
  const configCalls: [string, any][] = []
  const {
    isMain = false,
    language = 'en-US',
    middleware = [],
    pluginReducer,
    pluginReducers = {},
  } = options

  const reducers: Record<string, (state: any, action: any) => any> = {
    ...(pluginReducer ? { [PLUGIN_KEY]: pluginReducer } : {}),
    ...pluginReducers,
  }

  const reducer = (state = initialState, action: any) => {
    if (action.type === 'TEST/SET_CONFIG') {
      const config = structuredClone(state.config)
      setPath(config, action.path, action.value)
      return { ...state, config }
    }
    if (action.type === 'TEST/REPLACE') {
      return { ...state, ...action.state }
    }
    let changed = false
    const next: any = { ...state }
    for (const [key, pluginReducerFor] of Object.entries(reducers)) {
      const nextPlugin = pluginReducerFor(state[key], action)
      if (nextPlugin !== state[key]) {
        next[key] = nextPlugin
        changed = true
      }
    }
    return changed ? next : state
  }

  const store =
    middleware.length > 0
      ? legacy_createStore(reducer, applyMiddleware(...middleware))
      : legacy_createStore(reducer)
  const jotaiStore = createJotaiStore()

  const setConfig = (path: string, value: any) => {
    configCalls.push([path, value])
    store.dispatch({ type: 'TEST/SET_CONFIG', path, value })
  }

  const windowObj: any = {
    APPDATA_PATH: (window as any).APPDATA_PATH,
    ROOT: (window as any).ROOT,
    config: {
      get: (path: string, fallback: any) =>
        path
          .split('.')
          .reduce((acc: any, key) => (acc == null ? acc : acc[key]), store.getState().config) ??
        fallback,
      set: setConfig,
    },
    getStore: () => store.getState(),
    isMain,
    language,
  }

  // Production callbacks (sort saving, CSV export) read the global `window`
  // config/store, not the WindowEnv context, so point both at this environment.
  Object.assign(window, {
    config: windowObj.config,
    getStore: windowObj.getStore,
    isMain: windowObj.isMain,
    language: windowObj.language,
  })

  return { configCalls, jotaiStore, setConfig, store, windowObj }
}

export interface ProvidersProps {
  children: React.ReactNode
  environment: Environment
  theme?: typeof defaultTheme
}

export const Providers = ({
  children,
  environment,
  theme: themeOverride = defaultTheme,
}: ProvidersProps) => (
  <ReduxProvider store={environment.store}>
    <JotaiProvider store={environment.jotaiStore}>
      <I18nextProvider i18n={i18next}>
        <ThemeProvider theme={themeOverride}>
          <WindowEnv.Provider value={{ window: environment.windowObj }}>
            {children}
          </WindowEnv.Provider>
        </ThemeProvider>
      </I18nextProvider>
    </JotaiProvider>
  </ReduxProvider>
)
