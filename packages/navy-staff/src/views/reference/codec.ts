// Navy Staff reference codec: framing, size limits, Base64url, native Brotli,
// schema validation, and encode/decode.
//
// Wire path: DecodedReference -> compact JSON -> native Node Brotli q11
// (generic, size hint) -> unpadded Base64url -> ns1:b:PAYLOAD.
//
// One exact current schema version covers both the format and master-ID meaning:
// older or newer versions are rejected, there is no compatibility path, and
// there is no gzip or alternative-codec decode. The exact
// `https://fleet.poi.moe/#ns1:b:...` viewer URL is parsed locally without
// fetching; other origins are rejected. Everything below is private except the
// error type, limits, and encodeReference/decodeReference.

import {
  brotliCompressSync,
  brotliDecompressSync,
  constants as zlibConstants,
} from 'node:zlib'

import {
  REFERENCE_SCHEMA_VERSION,
  type DecodedReference,
  type SerializedReferenceV1,
} from './types.ts'

// --- Size limits -------------------------------------------------------------

// Documented bounds for untrusted input, well above the measured 480-ship/
// 20-group corpus (under ~30 KiB JSON, ~2 KiB compressed). They protect against
// decompression bombs without rejecting real plans.
export const REFERENCE_LIMITS = {
  /** Maximum compressed payload bytes accepted after Base64url decoding. */
  maxCompressedBytes: 64 * 1024,
  /** Maximum decoded JSON bytes; also passed as `maxOutputLength` to node:zlib. */
  maxDecodedBytes: 1024 * 1024,
  /** Maximum raw share text characters (before whitespace stripping). */
  maxInputChars: 128 * 1024,
} as const

// --- Errors ------------------------------------------------------------------

/** Stable codes for rejected external input; UI localizes the copy. */
export type NavyReferenceErrorCode =
  | 'EMPTY_INPUT'
  | 'INVALID_FORMAT'
  | 'UNSUPPORTED_VERSION'
  | 'UNSUPPORTED_CODEC'
  | 'UNSUPPORTED_URL_ORIGIN'
  | 'INPUT_TOO_LARGE'
  | 'COMPRESSED_TOO_LARGE'
  | 'DECOMPRESSED_TOO_LARGE'
  | 'INVALID_BASE64'
  | 'NON_CANONICAL_BASE64'
  | 'DECOMPRESSION_FAILED'
  | 'INVALID_UTF8'
  | 'INVALID_JSON'
  | 'UNSUPPORTED_SCHEMA_VERSION'
  | 'INVALID_SCHEMA'
  | 'UNEXPECTED_FIELD'
  | 'INVALID_FIELD'
  | 'INVALID_COLOR'

/** Typed transport for every rejection raised by this module. */
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

// --- Share locator framing ---------------------------------------------------

const SHARE_KIND = 'ns1'
const SHARE_CODEC = 'b'
const SHARE_URL_ORIGIN = 'https://fleet.poi.moe'
const SCHEME = /^[a-z][a-z0-9+.-]*:\/\//iu
const VERSION_LIKE = /^ns\d+$/u
const BASE64URL_ALPHABET = /^[A-Za-z0-9_-]+$/u

const stripInsignificantWhitespace = (text: string): string =>
  text.replace(/\s+/gu, '')

// Splits a raw `ns1:b:...` code or the exact `fleet.poi.moe` URL into its
// payload, tolerating inserted whitespace and an optional leading `#`. Any other
// codec letter is rejected; gzip is not accepted.
const parseShareLocator = (input: string): string => {
  const text = stripInsignificantWhitespace(input)
  if (text.length === 0) {
    throw new NavyReferenceError('EMPTY_INPUT', 'no share text provided')
  }

  let fragment = text.startsWith('#') ? text.slice(1) : text
  if (SCHEME.test(text)) {
    let url: URL
    try {
      url = new URL(text)
    } catch {
      throw new NavyReferenceError('INVALID_FORMAT', 'malformed viewer URL')
    }
    if (url.origin !== SHARE_URL_ORIGIN) {
      throw new NavyReferenceError(
        'UNSUPPORTED_URL_ORIGIN',
        `unsupported viewer origin ${url.origin}`,
      )
    }
    fragment = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash
  }

  const parts = fragment.split(':')
  const kind = parts[0]
  if (kind !== SHARE_KIND) {
    if (VERSION_LIKE.test(kind)) {
      throw new NavyReferenceError(
        'UNSUPPORTED_VERSION',
        `unsupported share version ${JSON.stringify(kind)}`,
      )
    }
    throw new NavyReferenceError('INVALID_FORMAT', 'missing ns1 share prefix')
  }
  if (parts.length < 3) {
    throw new NavyReferenceError('INVALID_FORMAT', 'incomplete share locator')
  }
  if (parts[1] !== SHARE_CODEC) {
    throw new NavyReferenceError(
      'UNSUPPORTED_CODEC',
      `unsupported codec letter ${JSON.stringify(parts[1])}`,
    )
  }
  const payload = parts.slice(2).join(':')
  if (payload.length === 0) {
    throw new NavyReferenceError('INVALID_BASE64', 'empty Base64url payload')
  }
  return payload
}

// --- Base64url ---------------------------------------------------------------

// Only the Base64url alphabet is accepted. The canonical re-encode check
// rejects padding, truncation, and non-canonical trailing bits.
const decodeBase64Url = (text: string): Buffer => {
  if (text.length === 0 || !BASE64URL_ALPHABET.test(text)) {
    throw new NavyReferenceError('INVALID_BASE64', 'invalid Base64url payload')
  }
  const bytes = Buffer.from(text, 'base64url')
  if (bytes.length === 0 || bytes.toString('base64url') !== text) {
    throw new NavyReferenceError(
      'NON_CANONICAL_BASE64',
      'non-canonical or truncated Base64url payload',
    )
  }
  return bytes
}

// --- Compression -------------------------------------------------------------

const compressPayload = (bytes: Buffer): Buffer => {
  // `new Uint8Array` is a plain typed-array view that older @types/node
  // versions accept for zlib input; Buffer itself trips a generic-typed-array
  // variance mismatch there.
  const input = new Uint8Array(bytes)
  return brotliCompressSync(input, {
    params: {
      [zlibConstants.BROTLI_PARAM_MODE]: zlibConstants.BROTLI_MODE_GENERIC,
      [zlibConstants.BROTLI_PARAM_QUALITY]: 11,
      [zlibConstants.BROTLI_PARAM_SIZE_HINT]: input.length,
    },
  })
}

const decompressPayload = (compressed: Buffer): Buffer => {
  const input = new Uint8Array(compressed)
  try {
    return brotliDecompressSync(input, {
      maxOutputLength: REFERENCE_LIMITS.maxDecodedBytes,
    })
  } catch (error) {
    if ((error as { code?: string }).code === 'ERR_BUFFER_TOO_LARGE') {
      throw new NavyReferenceError(
        'DECOMPRESSED_TOO_LARGE',
        'decompressed payload exceeds the decoded-size limit',
      )
    }
    throw new NavyReferenceError('DECOMPRESSION_FAILED', 'decompression failed')
  }
}

// --- Schema validation -------------------------------------------------------

const ROOT_KEYS: readonly string[] = ['v', 't', 'c', 'e', 'l', 'g']
const COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/u

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const requireString = (value: unknown, field: string): string => {
  if (typeof value !== 'string') {
    throw new NavyReferenceError('INVALID_FIELD', `${field} must be a string`)
  }
  return value
}

const requireIntegerOrNull = (
  value: unknown,
  field: string,
  minimum: number,
): number | null => {
  if (value === null) return null
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < minimum
  ) {
    throw new NavyReferenceError(
      'INVALID_FIELD',
      `${field} must be null or an integer >= ${minimum}`,
    )
  }
  return value
}

const parseShip = (value: unknown): DecodedReference['groups'][number]['ships'][number] => {
  if (!Array.isArray(value) || value.length !== 2) {
    throw new NavyReferenceError(
      'INVALID_SCHEMA',
      'each row must be a [masterId, level] pair',
    )
  }
  return {
    masterId: requireIntegerOrNull(value[0], 'masterId', 1),
    level: requireIntegerOrNull(value[1], 'level', 0),
  }
}

const parseGroup = (value: unknown): DecodedReference['groups'][number] => {
  if (!Array.isArray(value) || value.length !== 3) {
    throw new NavyReferenceError(
      'INVALID_SCHEMA',
      'each group must be a [label, color, rows] tuple',
    )
  }
  const label = requireString(value[0], 'group label')
  const color = requireString(value[1], 'group color')
  if (!COLOR_PATTERN.test(color)) {
    throw new NavyReferenceError('INVALID_COLOR', 'group color must be #RRGGBB')
  }
  if (!Array.isArray(value[2])) {
    throw new NavyReferenceError('INVALID_SCHEMA', 'group rows must be an array')
  }
  return { label, color, ships: Array.from(value[2], parseShip) }
}

// Strict validation rejects unknown root fields so a payload cannot smuggle
// owner IDs, paths, or history, and rejects any version but the current one.
// All strings are returned as opaque text.
const assertCurrentReference = (value: unknown): DecodedReference => {
  if (!isPlainObject(value)) {
    throw new NavyReferenceError('INVALID_SCHEMA', 'reference must be an object')
  }
  for (const key of Object.keys(value)) {
    if (!ROOT_KEYS.includes(key)) {
      throw new NavyReferenceError(
        'UNEXPECTED_FIELD',
        `unexpected reference field ${JSON.stringify(key)}`,
      )
    }
  }
  if (!Object.prototype.hasOwnProperty.call(value, 'v')) {
    throw new NavyReferenceError('INVALID_SCHEMA', 'missing schema version')
  }
  if (value.v !== REFERENCE_SCHEMA_VERSION) {
    throw new NavyReferenceError(
      'UNSUPPORTED_SCHEMA_VERSION',
      `unsupported reference schema version ${JSON.stringify(value.v)}`,
    )
  }
  for (const key of ROOT_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) {
      throw new NavyReferenceError(
        'INVALID_SCHEMA',
        `missing reference field ${JSON.stringify(key)}`,
      )
    }
  }
  if (!Array.isArray(value.g)) {
    throw new NavyReferenceError('INVALID_SCHEMA', 'groups must be an array')
  }
  return {
    schemaVersion: REFERENCE_SCHEMA_VERSION,
    title: requireString(value.t, 'title'),
    captureTime: requireString(value.c, 'capture time'),
    exportTime: requireString(value.e, 'export time'),
    locale: requireString(value.l, 'locale'),
    groups: Array.from(value.g, parseGroup),
  }
}

// --- Public encode/decode ----------------------------------------------------

/**
 * Decodes a raw `ns1:b:` share code or the exact `https://fleet.poi.moe/#ns1:b:`
 * viewer URL into typed reference data. Never fetches, never writes, and never
 * returns an editable workspace shape.
 *
 * @throws NavyReferenceError with a stable code.
 */
export const decodeReference = (input: string): DecodedReference => {
  if (typeof input !== 'string') {
    throw new NavyReferenceError('INVALID_FORMAT', 'reference input must be text')
  }
  if (input.length > REFERENCE_LIMITS.maxInputChars) {
    throw new NavyReferenceError(
      'INPUT_TOO_LARGE',
      'share text exceeds the input-length limit',
    )
  }

  const payload = parseShareLocator(input)
  const compressed = decodeBase64Url(payload)
  if (compressed.length > REFERENCE_LIMITS.maxCompressedBytes) {
    throw new NavyReferenceError(
      'COMPRESSED_TOO_LARGE',
      'compressed payload exceeds the size limit',
    )
  }

  const decoded = decompressPayload(compressed)
  if (decoded.length > REFERENCE_LIMITS.maxDecodedBytes) {
    throw new NavyReferenceError(
      'DECOMPRESSED_TOO_LARGE',
      'decompressed payload exceeds the decoded-size limit',
    )
  }

  let text: string
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(
      new Uint8Array(decoded),
    )
  } catch {
    throw new NavyReferenceError('INVALID_UTF8', 'payload is not valid UTF-8')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new NavyReferenceError('INVALID_JSON', 'payload is not valid JSON')
  }

  return assertCurrentReference(parsed)
}

// Builds and re-validates the compact wire object, so the encoder can never
// emit a payload the strict decoder would reject or that carries extra fields.
const serializedFromDecoded = (
  reference: DecodedReference,
): SerializedReferenceV1 => {
  const candidate: SerializedReferenceV1 = {
    v: REFERENCE_SCHEMA_VERSION,
    t: reference.title,
    c: reference.captureTime,
    e: reference.exportTime,
    l: reference.locale,
    g: reference.groups.map(
      (group) =>
        [
          group.label,
          group.color,
          group.ships.map((ship) => [ship.masterId, ship.level]),
        ] as const,
    ),
  }
  assertCurrentReference(candidate)
  return candidate
}

/**
 * Encodes typed reference data to a raw `ns1:b:PAYLOAD` share code using
 * Brotli q11.
 *
 * @throws NavyReferenceError if the reference is invalid or too large.
 */
export const encodeReference = (reference: DecodedReference): string => {
  const serialized = serializedFromDecoded(reference)
  const json = Buffer.from(JSON.stringify(serialized), 'utf8')
  if (json.length > REFERENCE_LIMITS.maxDecodedBytes) {
    throw new NavyReferenceError(
      'DECOMPRESSED_TOO_LARGE',
      'reference JSON exceeds the decoded-size limit',
    )
  }
  const compressed = compressPayload(json)
  if (compressed.length > REFERENCE_LIMITS.maxCompressedBytes) {
    throw new NavyReferenceError(
      'COMPRESSED_TOO_LARGE',
      'compressed reference exceeds the size limit',
    )
  }
  return `${SHARE_KIND}:${SHARE_CODEC}:${compressed.toString('base64url')}`
}
