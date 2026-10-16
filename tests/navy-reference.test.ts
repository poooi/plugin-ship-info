import { brotliCompressSync } from 'node:zlib'

import { describe, expect, it } from 'vitest'

import {
  decodeReference,
  encodeReference,
  isNavyReferenceError,
  REFERENCE_LIMITS,
  type NavyReferenceErrorCode,
} from '../packages/navy-staff/src/views/reference/codec'
import {
  projectReference,
  resolveShip,
  UNKNOWN_SHIP_NAME,
  type MasterCatalog,
} from '../packages/navy-staff/src/views/reference/catalog'
import type { DecodedReference } from '../packages/navy-staff/src/views/reference/types'

// Test-only poi master fixtures. The runtime bundles no catalog; the caller
// supplies the current masters (built from the poi Redux store at view time).
const masters: MasterCatalog = new Map([
  [1, { name: '睦月', type: '駆逐艦' }],
  [2, { name: '如月', type: '駆逐艦' }],
])

const sampleReference = (): DecodedReference => ({
  schemaVersion: 1,
  title: 'Example plan',
  captureTime: '2026-10-16T00:00:00Z',
  exportTime: '2026-10-17T00:00:00Z',
  locale: 'zh-CN',
  groups: [
    {
      label: 'Group label',
      color: '#6699cc',
      ships: [
        // Two identical [1, 99] rows are distinct occurrences.
        { masterId: 1, level: 99 },
        { masterId: 1, level: 99 },
        { masterId: null, level: null },
      ],
    },
    { label: 'Second group', color: '#f3f3f3', ships: [{ masterId: 999999, level: 50 }] },
  ],
})

const codeFromObject = (value: unknown, letter = 'b'): string => {
  const json = new Uint8Array(Buffer.from(JSON.stringify(value), 'utf8'))
  const compressed = brotliCompressSync(json)
  return `ns1:${letter}:${compressed.toString('base64url')}`
}

const payloadOf = (code: string): string => code.split(':').slice(2).join(':')

const reject = (input: string, code: NavyReferenceErrorCode): void => {
  try {
    decodeReference(input)
    throw new Error('expected decodeReference to reject')
  } catch (error) {
    expect(isNavyReferenceError(error)).toBe(true)
    expect((error as { code: NavyReferenceErrorCode }).code).toBe(code)
  }
}

describe('reference codec core', () => {
  it('rejects sparse groups and ship arrays before emitting a code', () => {
    const groups = sampleReference() as unknown as { groups: unknown[] }
    groups.groups = new Array(1)
    expect(() => encodeReference(groups as unknown as DecodedReference)).toThrow(/each group/)
    const ships = sampleReference() as unknown as { groups: { ships: unknown[] }[] }
    ships.groups[0].ships = new Array(1)
    expect(() => encodeReference(ships as unknown as DecodedReference)).toThrow(/each row/)
  })

  it('round-trips through Brotli preserving order and duplicates', () => {
    const reference = sampleReference()
    const code = encodeReference(reference)
    expect(code).toMatch(/^ns1:b:[A-Za-z0-9_-]+$/u)
    expect(decodeReference(code)).toEqual(reference)
    expect(decodeReference(code).groups[0].ships).toEqual([
      { masterId: 1, level: 99 },
      { masterId: 1, level: 99 },
      { masterId: null, level: null },
    ])
  })

  it('accepts the full viewer URL and inserted whitespace', () => {
    const reference = sampleReference()
    const url = `https://fleet.poi.moe/#${encodeReference(reference)}`
    expect(url.startsWith('https://fleet.poi.moe/#ns1:b:')).toBe(true)
    expect(decodeReference(url)).toEqual(reference)
    expect(decodeReference(url.replace(/(.{40})/gu, '$1\n  '))).toEqual(reference)
  })

  it('accepts only the exact current protocol version', () => {
    reject(codeFromObject({ v: 0, t: 't', c: 'c', e: 'e', l: 'l', g: [] }), 'UNSUPPORTED_SCHEMA_VERSION')
    reject(codeFromObject({ v: 2, t: 't', c: 'c', e: 'e', l: 'l', g: [] }), 'UNSUPPORTED_SCHEMA_VERSION')
    // A missing version is malformed.
    reject(codeFromObject({ t: 't', c: 'c', e: 'e', l: 'l', g: [] }), 'INVALID_SCHEMA')
  })

  it('rejects unsupported share versions and codecs; no gzip fallback', () => {
    reject('ns2:b:AAAA', 'UNSUPPORTED_VERSION')
    reject('ns1:z:AAAA', 'UNSUPPORTED_CODEC')
    reject('ns1:g:AAAA', 'UNSUPPORTED_CODEC')
  })

  it('projects supplied poi masters and shows ??? for missing metadata', () => {
    const decoded = decodeReference(encodeReference(sampleReference()))
    expect(resolveShip(1, masters)).toMatchObject({ known: true, name: '睦月', type: '駆逐艦' })
    expect(resolveShip(999999, masters)).toMatchObject({ known: false, name: '???', type: null })
    expect(resolveShip(null, masters)).toMatchObject({ known: false, name: UNKNOWN_SHIP_NAME })
    expect(UNKNOWN_SHIP_NAME).toBe('???')

    const projected = projectReference(decoded, masters)
    expect(projected.shipCount).toBe(4)
    expect(projected.knownShipCount).toBe(2)
    expect(projected.unknownShipCount).toBe(2)
    expect(projected.groupCount).toBe(2)
    // Occurrences preserved; missing metadata keeps ID and level.
    expect(projected.groups[0].ships).toHaveLength(3)
    expect(projected.groups[1].ships[0]).toMatchObject({
      masterId: 999999,
      level: 50,
      name: '???',
      known: false,
    })
  })

  it('rejects malformed, truncated, and non-canonical payloads', () => {
    reject('', 'EMPTY_INPUT')
    reject('not-a-share-code', 'INVALID_FORMAT')
    reject('ns1:b', 'INVALID_FORMAT')
    reject('ns1:b:', 'INVALID_BASE64')
    reject('ns1:b:!!!!', 'INVALID_BASE64')
    reject('ns1:b:AAAAA', 'NON_CANONICAL_BASE64')
    reject('ns1:b:AAB', 'NON_CANONICAL_BASE64')
    reject('ns1:b:AAAA=', 'INVALID_BASE64')
    const valid = payloadOf(encodeReference(sampleReference()))
    reject(`ns1:b:${valid.slice(0, -1)}`, 'DECOMPRESSION_FAILED')
  })

  it('rejects other URL origins without fetching', () => {
    const payload = payloadOf(encodeReference(sampleReference()))
    reject(`https://evil.example/#ns1:b:${payload}`, 'UNSUPPORTED_URL_ORIGIN')
    reject(`http://fleet.poi.moe/#ns1:b:${payload}`, 'UNSUPPORTED_URL_ORIGIN')
  })

  it('bounds input, compressed, and decompressed sizes', () => {
    reject(`ns1:b:${'A'.repeat(REFERENCE_LIMITS.maxInputChars)}`, 'INPUT_TOO_LARGE')

    const incompressible = new Uint8Array(REFERENCE_LIMITS.maxCompressedBytes + 1024)
    for (let i = 0; i < incompressible.length; i += 1) {
      incompressible[i] = (i * 31 + 7) & 0xff
    }
    reject(`ns1:b:${Buffer.from(incompressible).toString('base64url')}`, 'COMPRESSED_TOO_LARGE')

    const bomb = brotliCompressSync(
      new Uint8Array(Buffer.from('a'.repeat(REFERENCE_LIMITS.maxDecodedBytes + 4096), 'utf8')),
    )
    reject(`ns1:b:${bomb.toString('base64url')}`, 'DECOMPRESSED_TOO_LARGE')
  })

  it('rejects unexpected fields and never emits owner/path data', () => {
    const reference = sampleReference()
    const wire = {
      v: 1,
      t: reference.title,
      c: reference.captureTime,
      e: reference.exportTime,
      l: reference.locale,
      g: reference.groups.map((group) => [
        group.label,
        group.color,
        group.ships.map((ship) => [ship.masterId, ship.level]),
      ]),
    }
    reject(codeFromObject({ ...wire, ownerMemberId: 'SECRET' }), 'UNEXPECTED_FIELD')
    reject(codeFromObject({ ...wire, path: 'C:/Users/me' }), 'UNEXPECTED_FIELD')

    const augmented = { ...reference, ownerMemberId: 'SECRET', path: 'C:/secret' } as DecodedReference
    const code = encodeReference(augmented)
    expect(decodeReference(code)).toEqual(reference)
    expect(code).toBe(encodeReference(reference))
  })
})
