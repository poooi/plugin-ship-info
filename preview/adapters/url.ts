// Minimal `url` shim covering url.format for file:// URLs.

export const format = (input: {
  host?: string
  pathname?: string
  protocol?: string
  slashes?: boolean
}) => {
  const protocol = input.protocol ? `${input.protocol}:` : ''
  const slashes = input.slashes ? '//' : ''
  const host = input.host ?? ''
  const pathname = input.pathname ?? ''
  return `${protocol}${slashes}${host}${pathname}`
}

export default { format }
