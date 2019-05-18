interface IConfig {
  get: <T = any>(path: string, defaultValue: T) => T
  set: (path: string) => void
}

declare namespace NodeJS {
  interface Global {
    config: IConfig
  }
}


interface Window {
  ROOT: string
  APPDATA_PATH: string
  config: IConfig
  language: string
}
