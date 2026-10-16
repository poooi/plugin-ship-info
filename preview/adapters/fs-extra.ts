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
  if (host.failFileWrites) {
    host.log.writeErrors.push({ data, path: filePath })
    throw new Error(`EACCES: permission denied, open '${filePath}'`)
  }
  const stored = structuredClone(data)
  host.log.files[filePath] = stored
  host.log.writtenFiles.push({ data: stored, path: filePath })
}

export const outputFile = async (filePath: string, data: unknown) => {
  if (host.failFileWrites) {
    host.log.writeErrors.push({ data, path: filePath })
    throw new Error(`EACCES: permission denied, open '${filePath}'`)
  }
  host.log.files[filePath] = data
  host.log.writtenFiles.push({ data, path: filePath })
}
