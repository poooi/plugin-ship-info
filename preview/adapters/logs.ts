// Resettable in-memory host state shared by the browser adapters. Every story
// run starts from resetHostState() so clipboard/file/dialog/capture call logs
// never leak between stories or manual reruns.

export interface SaveDialogResult {
  canceled: boolean
  filePath?: string
}

export interface SaveDialogCall {
  options: unknown
  result: SaveDialogResult
}

export interface WrittenFile {
  data: unknown
  path: string
}

export interface HostLog {
  clipboardWrites: string[]
  downloads: string[]
  files: Record<string, unknown>
  saveDialogCalls: SaveDialogCall[]
  writeErrors: WrittenFile[]
  writtenFiles: WrittenFile[]
}

const createLog = (): HostLog => ({
  clipboardWrites: [],
  downloads: [],
  files: {},
  saveDialogCalls: [],
  writeErrors: [],
  writtenFiles: [],
})

export const host = {
  failFileWrites: false,
  log: createLog(),
  saveDialog: { canceled: true } as SaveDialogResult,
}

export const resetHostState = () => {
  host.failFileWrites = false
  host.log = createLog()
  host.saveDialog = { canceled: true }
}

export const setInitialFiles = (files?: Record<string, unknown>) => {
  if (files) host.log.files = { ...files }
}

export const setSaveDialogResult = (result?: SaveDialogResult) => {
  host.saveDialog = result ?? { canceled: true }
}

export const setFileWriteFailure = (fail = false) => {
  host.failFileWrites = fail
}
