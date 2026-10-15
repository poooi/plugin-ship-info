import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterAll } from 'vitest'

// Tests never touch the user's real plugin data: every test file gets its own
// throwaway APPDATA directory under the OS temp dir.
const appdataPath = fs.mkdtempSync(path.join(os.tmpdir(), 'ship-info-test-'))

const emptyStore = {}

;(globalThis as any).window = {
  APPDATA_PATH: appdataPath,
  ROOT: appdataPath,
  config: { get: () => undefined, set: () => undefined },
  getStore: () => emptyStore,
  isMain: false,
  language: 'en-US',
}

;(globalThis as any).localStorage = {
  clear: () => undefined,
  getItem: () => null,
  removeItem: () => undefined,
  setItem: () => undefined,
}

afterAll(() => {
  fs.rmSync(appdataPath, { recursive: true, force: true })
})
