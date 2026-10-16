import { host } from './logs'

// In-memory filesystem boundary. Reads come from a seeded file map; writes are
// recorded so stories can assert the real CSV/JSON payload.

export const readJson = async (filePath: string) => {
  if (!(filePath in host.log.files)) {
    const error: NodeJS.ErrnoException = new Error(
      `ENOENT: no such file or directory, open '${filePath}'`,
    )
    error.code = 'ENOENT'
    throw error
  }
  return structuredClone(host.log.files[filePath])
}

export const outputJson = async (filePath: string, data: unknown) => {
  const stored = structuredClone(data)
  host.log.files[filePath] = stored
  host.log.writtenFiles.push({ data: stored, path: filePath })
}

export const outputFile = async (filePath: string, data: unknown) => {
  host.log.files[filePath] = data
  host.log.writtenFiles.push({ data, path: filePath })
}
