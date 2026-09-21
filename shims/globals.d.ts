interface IConfig {
  get: <T = any>(path: string, defaultValue: T) => T
  set: (path: string, value?: any) => void
}

// `global` is typed as `typeof globalThis` by @types/node, so the config
// bridge has to live on the global object itself rather than on the retired
// `NodeJS.Global` interface.
declare var config: IConfig

interface Window {
  ROOT: string
  APPDATA_PATH: string
  config: IConfig
  language: string
  getStore: (path?: string) => any
  isMain: boolean
}
