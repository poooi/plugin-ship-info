declare namespace NodeJS {
  interface Global {
    config: {
      get: <T = any>(path: string, defaultValue: T) => T
      set: (path: string) => void
    }
  }
}
