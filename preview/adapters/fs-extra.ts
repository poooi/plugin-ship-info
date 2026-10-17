import path from 'path'

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

// Directory listing over the seeded file map. A directory with no entries is
// reported as absent (ENOENT), matching the account-file initialization path.
export const readdir = async (dir: string): Promise<string[]> => {
  const prefix = dir.endsWith(path.sep) ? dir : `${dir}${path.sep}`
  const names = new Set<string>()
  for (const filePath of Object.keys(host.log.files)) {
    if (!filePath.startsWith(prefix)) continue
    const first = filePath.slice(prefix.length).split(path.sep)[0]
    if (first) names.add(first)
  }
  if (names.size === 0) {
    const error: NodeJS.ErrnoException = new Error(
      `ENOENT: no such file or directory, scandir '${dir}'`,
    )
    error.code = 'ENOENT'
    throw error
  }
  return [...names]
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
