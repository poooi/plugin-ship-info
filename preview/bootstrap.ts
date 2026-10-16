// Browser host globals must exist before any plugin module is evaluated:
// views/redux.ts reads window.APPDATA_PATH at module scope and several modules
// read window.config/getStore. Imported first by the preview and the scenario
// factory so the plugin graph can initialise in a plain browser.
const browserWindow = window as any

if (!browserWindow.APPDATA_PATH) browserWindow.APPDATA_PATH = '/poi-appdata'
if (!browserWindow.ROOT) browserWindow.ROOT = '/poi'
if (!browserWindow.language) browserWindow.language = 'en-US'
if (typeof browserWindow.isMain !== 'boolean') browserWindow.isMain = true

if (!browserWindow.config) {
  browserWindow.config = {
    get: (_path: string, fallback: unknown) => fallback,
    set: () => undefined,
  }
}
if (!browserWindow.getStore) browserWindow.getStore = () => ({})

export {}
