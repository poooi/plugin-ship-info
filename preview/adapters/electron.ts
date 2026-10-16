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
    showSaveDialog: async () => {
      const result = { ...host.saveDialog }
      host.log.saveDialogCalls.push(result)
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
