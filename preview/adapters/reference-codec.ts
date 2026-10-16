// Browser mock for the reference codec boundary
// (packages/navy-staff/src/views/reference/codec.ts).
//
// The preview cannot load `node:zlib`, so `poiHostResolver` maps the reference
// module's `./codec.ts` import to this session-local fake. It is NOT a real
// codec: it keeps a registry of encoded references and returns opaque tokens,
// which is enough to exercise export, paste/file import, decode errors, and
// read-only rendering. It is never used by the plugin runtime.

import type { DecodedReference } from '../../packages/navy-staff/src/views/reference/types'

export const REFERENCE_LIMITS = {
  maxCompressedBytes: 64 * 1024,
  maxDecodedBytes: 1024 * 1024,
  maxInputChars: 128 * 1024,
} as const

export type NavyReferenceErrorCode = string

export class NavyReferenceError extends Error {
  readonly code: NavyReferenceErrorCode

  constructor(code: NavyReferenceErrorCode, message: string) {
    super(message)
    this.name = 'NavyReferenceError'
    this.code = code
  }
}

export const isNavyReferenceError = (
  error: unknown,
): error is NavyReferenceError => error instanceof NavyReferenceError

const registry = new Map<string, DecodedReference>()
let counter = 0

export const encodeReference = (reference: DecodedReference): string => {
  counter += 1
  const token = `mock-${counter}`
  registry.set(token, structuredClone(reference))
  return `ns1:b:${token}`
}

export const decodeReference = (input: string): DecodedReference => {
  const match = /^ns1:b:(mock-\d+)$/u.exec(input.trim())
  const found = match ? registry.get(match[1]) : undefined
  if (!found) {
    throw new NavyReferenceError(
      'DECOMPRESSION_FAILED',
      'mock codec cannot decode this payload',
    )
  }
  return structuredClone(found)
}

export const resetMockCodec = (): void => {
  registry.clear()
  counter = 0
}
