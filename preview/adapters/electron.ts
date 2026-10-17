import { host } from './logs'

// In-memory Electron boundary: Clipboard, dialogs and the capture download
// channel record their calls instead of touching a real desktop.

export const clipboard = {
  writeText: (text: string) => {
    host.log.clipboardWrites.push(text)
  },
}

export const remote = {
  // The real @electron/remote exposes an async clipboard; Share awaits it and
  // catches a rejected promise. Recorded in the same host log as the renderer
  // clipboard so existing assertions keep working.
  clipboard: {
    writeText: async (text: string) => {
      host.log.clipboardWrites.push(text)
    },
  },
  dialog: {
    showSaveDialog: async (browserWindow?: unknown, options?: unknown) => {
      const result = { ...host.saveDialog }
      host.log.saveDialogCalls.push({
        options: options ?? browserWindow,
        result,
      })
      return result
    },
  },
  getCurrentWindow: () => ({ isMainWindow: () => true }),
  getCurrentWebContents: () => ({
    downloadURL: (url: string) => {
      host.log.downloads.push(url)
    },
  }),
}
