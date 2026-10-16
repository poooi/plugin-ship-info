import { host } from './logs'

// In-memory Electron boundary: Clipboard, dialogs and the capture download
// channel record their calls instead of touching a real desktop.

export const clipboard = {
  writeText: (text: string) => {
    host.log.clipboardWrites.push(text)
  },
}

export const remote = {
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
