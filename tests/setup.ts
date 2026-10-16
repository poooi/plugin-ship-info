import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterAll } from 'vitest'

// Tests never touch the user's real plugin data: every test file gets its own
// throwaway APPDATA directory under the OS temp dir. Node-environment tests get
// a minimal `window` stub; jsdom tests keep the real window and only receive
// the poi fields on top of it.
const appdataPath = fs.mkdtempSync(path.join(os.tmpdir(), 'ship-info-test-'))

const emptyStore = {}

const poiWindow = {
  APPDATA_PATH: appdataPath,
  ROOT: appdataPath,
  config: { get: () => undefined, set: () => undefined },
  getStore: () => emptyStore,
  isMain: false,
  language: 'en-US',
}

if (typeof window !== 'undefined' && typeof window.document !== 'undefined') {
  Object.assign(window, poiWindow)
} else {
  ;(globalThis as any).window = poiWindow

  ;(globalThis as any).localStorage = {
    clear: () => undefined,
    getItem: () => null,
    removeItem: () => undefined,
    setItem: () => undefined,
  }
}

afterAll(() => {
  fs.rmSync(appdataPath, { recursive: true, force: true })
})
