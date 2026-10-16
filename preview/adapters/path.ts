// Minimal POSIX path shim for the browser bundle. Only the operations the
// plugin graph touches (join, dirname, basename, extname, resolve) are needed.

const normalize = (parts: string[]) =>
  parts
    .filter(Boolean)
    .join('/')
    .replace(/\/+/g, '/')

export const join = (...parts: string[]) => normalize(parts)

export const resolve = (...parts: string[]) => normalize(parts)

export const dirname = (input: string) =>
  input.split('/').slice(0, -1).join('/') || '.'

export const basename = (input: string) => input.split('/').pop() ?? ''

export const extname = (input: string) => {
  const base = basename(input)
  const index = base.lastIndexOf('.')
  return index > 0 ? base.slice(index) : ''
}

export const sep = '/'

export const posix = { join }

export default { basename, dirname, extname, join, posix, resolve, sep }
