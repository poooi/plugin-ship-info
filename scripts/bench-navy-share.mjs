#!/usr/bin/env node
// Standalone, reproducible Navy share-size benchmark.
//
// This is NOT plugin runtime functionality. It measures the wire size of several
// reference-snapshot encodings over deterministic, seeded plans built only from
// the checked-in fixture (copied public game data). It runs with built-in Node
// libraries only and never touches a live poi checkout at run time.
//
// Verification:  node scripts/bench-navy-share.mjs
// Outputs:       .cache/navy-share/report.json, report.md, and sample files.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { performance } from 'node:perf_hooks'
import { fileURLToPath } from 'node:url'
import { gzipSync, gunzipSync } from 'node:zlib'
import process from 'node:process'

// --- Fixed constants ---------------------------------------------------------

// Proposed 6-character fleet-themed CJK prefix. Counted on every CJK output.
// Its glyphs are illustrative only; no alphabet is finalized here.
const CJK_PREFIX = '舰队密电一：'
// Explicit ASCII version prefix for the Base64url form.
const BASE64_PREFIX = 'navy1:'
// Inner reference-schema version, distinct from the outer share prefix/format.
// Embedded and validated in every JSON variant; the binary pack has its own header.
const REFERENCE_SCHEMA_VERSION = 1
// Binary pack magic + format version.
const BIN_MAGIC = 0x4e53 // "NS"
const BIN_VERSION = 2

const FIXED_TITLE = '作战计划'
const FIXED_CAPTURED_AT = '2026-10-16T00:00:00Z'
const FIXED_TIME = '2026-10-17T00:00:00Z'
const FIXED_LOCALE = 'zh-CN'

const SAMPLE_COUNT = 30
const GZIP_LEVEL = 6
const TIMING_ITERS = 200
const TIMING_WARMUP = 20

const PLANS = [
  { name: '12x2', ships: 12, groups: 2 },
  { name: '36x6', ships: 36, groups: 6 },
  { name: '72x8', ships: 72, groups: 8 },
  { name: '120x12', ships: 120, groups: 12 },
  { name: '240x13', ships: 240, groups: 13 },
  { name: '480x20', ships: 480, groups: 20 },
]

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = dirname(__dirname)
const FIXTURE_PATH = join(__dirname, 'fixtures', 'navy-share-benchmark.json')
const OUT_DIR = join(REPO_ROOT, '.cache', 'navy-share')

// --- Small utilities ---------------------------------------------------------

// Deterministic 32-bit PRNG (mulberry32).
const mulberry32 = (seed) => {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const seedFor = (planIndex, sampleIndex) =>
  (0x9e3779b9 ^ ((planIndex + 1) * 0x51ed) ^ ((sampleIndex + 1) * 0x27d4eb2d)) >>> 0

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

const stats = (values) => ({
  min: Math.min(...values),
  median: median(values),
  max: Math.max(...values),
})

// Rough East Asian display-width estimate: wide/fullwidth code points count 2.
const isWideCodePoint = (cp) =>
  (cp >= 0x1100 && cp <= 0x115f) ||
  (cp >= 0x2e80 && cp <= 0xa4cf) ||
  (cp >= 0xac00 && cp <= 0xd7a3) ||
  (cp >= 0xf900 && cp <= 0xfaff) ||
  (cp >= 0xfe30 && cp <= 0xfe4f) ||
  (cp >= 0xff00 && cp <= 0xff60) ||
  (cp >= 0xffe0 && cp <= 0xffe6) ||
  (cp >= 0x20000 && cp <= 0x3fffd)

const columnWidth = (text) => {
  let width = 0
  for (const ch of text) width += isWideCodePoint(ch.codePointAt(0)) ? 2 : 1
  return width
}

const utf8Bytes = (text) => Buffer.byteLength(text, 'utf8')

// --- Catalog / area ----------------------------------------------------------

const fixture = JSON.parse(readFileSync(FIXTURE_PATH, 'utf8'))
const { labels: AREA_LABELS, colors: AREA_COLORS, locale: AREA_LOCALE } = fixture.area
if (fixture.area.locale !== FIXED_LOCALE) {
  throw new Error(`fixture locale ${fixture.area.locale} != ${FIXED_LOCALE}`)
}

/** @type {Map<number, {id:number,name:string,stype:number,type:string|null}>} */
const catalog = new Map(fixture.catalog.map((entry) => [entry.id, entry]))
const catalogIds = fixture.catalog.map((entry) => entry.id)

const resolveName = (masterId) => catalog.get(masterId)?.name ?? null
const resolveType = (masterId) => catalog.get(masterId)?.type ?? null
// Placeholder for IDs missing from the bundled catalog. Never invent a label.
const placeholder = (masterId) => `#${masterId}`

// Distinct basic Han characters (U+4E00..U+9FFF) present in catalog names.
// A 256-character curated alphabet needs at least this many suitable glyphs;
// presence is necessary but not sufficient (curation, theme and readability
// constraints may still reject many).
const distinctBasicHan = (() => {
  const set = new Set()
  for (const entry of fixture.catalog) {
    for (const ch of entry.name) {
      const cp = ch.codePointAt(0)
      if (cp >= 0x4e00 && cp <= 0x9fff) set.add(ch)
    }
  }
  return set.size
})()

// --- Plan generation ---------------------------------------------------------

const groupLabel = (index) => {
  const cycle = Math.floor(index / AREA_LABELS.length)
  const base = AREA_LABELS[index % AREA_LABELS.length]
  return cycle === 0 ? base : `${base}#${cycle + 1}`
}
const groupColor = (index) => AREA_COLORS[index % AREA_COLORS.length]

// Nonuniform assignment: each ship picks a group by a random weight, empty
// groups steal a ship from the largest group, and the first two entries are
// forced into one group as a same-master same-level duplicate.
const makePlan = (plan, seed) => {
  const rng = mulberry32(seed)
  const n = plan.ships
  const g = plan.groups

  const weights = Array.from({ length: g }, () => 0.4 + rng() * 2.6)
  const total = weights.reduce((a, b) => a + b, 0)

  const groupOf = []
  const masterIds = []
  const levels = []
  for (let i = 0; i < n; i += 1) {
    let r = rng() * total
    let gi = 0
    while (gi < g - 1 && r > weights[gi]) {
      r -= weights[gi]
      gi += 1
    }
    groupOf.push(gi)
    masterIds.push(catalogIds[Math.floor(rng() * catalogIds.length)])
    levels.push(50 + Math.floor(rng() * 126)) // 50..175 inclusive
  }

  // Force a same-master, same-level duplicate inside group 0.
  groupOf[1] = groupOf[0]
  masterIds[1] = masterIds[0]
  levels[1] = levels[0]

  // Guarantee every group is non-empty. Move a ship (index >= 2, so the
  // duplicate pair stays together in group 0) from the largest group.
  for (let gi = 0; gi < g; gi += 1) {
    if (groupOf.includes(gi)) continue
    const counts = Array.from({ length: g }, (_, k) =>
      groupOf.filter((x) => x === k).length,
    )
    let largest = 0
    for (let k = 1; k < g; k += 1) if (counts[k] > counts[largest]) largest = k
    const moveIndex = groupOf.findIndex((x, idx) => x === largest && idx >= 2)
    groupOf[moveIndex] = gi
  }

  const groups = []
  for (let gi = 0; gi < g; gi += 1) {
    const entries = []
    for (let i = 0; i < n; i += 1) {
      if (groupOf[i] === gi) entries.push({ masterId: masterIds[i], level: levels[i] })
    }
    groups.push({ label: groupLabel(gi), color: groupColor(gi), entries })
  }

  return {
    title: FIXED_TITLE,
    capturedAt: FIXED_CAPTURED_AT,
    time: FIXED_TIME,
    locale: FIXED_LOCALE,
    groups,
  }
}

// --- Canonical model helpers -------------------------------------------------

// Canonical comparison used for round-trip equivalence. Name/type come from the
// variant's own inline fields when present (so a corrupt inline label fails),
// otherwise they are resolved against the bundled fixture catalog snapshot.
// Equivalence for catalog-based variants is conditional on that exact snapshot.
const fingerprint = (model, withLevels) =>
  JSON.stringify({
    title: model.title,
    capturedAt: model.capturedAt,
    time: model.time,
    locale: model.locale,
    groups: model.groups.map((grp) => ({
      label: grp.label,
      color: grp.color,
      entries: grp.entries.map((e) => {
        const row = [e.masterId]
        if (withLevels) row.push(e.level)
        row.push(e.name !== undefined ? e.name : resolveName(e.masterId))
        row.push(e.type !== undefined ? e.type : resolveType(e.masterId))
        return row
      }),
    })),
  })

// Per-row inline label check for variants that carry their own name/type.
const validateInlineLabels = (decoded) => {
  const problems = []
  for (const grp of decoded.groups) {
    for (const e of grp.entries) {
      if (e.name !== resolveName(e.masterId) || e.type !== resolveType(e.masterId)) {
        problems.push(`inline label mismatch for master ${e.masterId}`)
      }
    }
  }
  return problems
}

const occurrenceCounts = (model, withLevels) => {
  const map = new Map()
  for (const grp of model.groups) {
    for (const e of grp.entries) {
      const key = withLevels ? `${e.masterId}:${e.level}` : `${e.masterId}`
      map.set(key, (map.get(key) ?? 0) + 1)
    }
  }
  return map
}

const sameOccurrences = (a, b, withLevels) => {
  const ca = occurrenceCounts(a, withLevels)
  const cb = occurrenceCounts(b, withLevels)
  if (ca.size !== cb.size) return false
  for (const [key, count] of ca) if (cb.get(key) !== count) return false
  return true
}

// --- Binary varint pack (variant 5, v3 semantics) ----------------------------

const writeVarint = (value, out) => {
  let v = value >>> 0
  // ids/levels and lengths are < 2^32; use up to 5 groups of 7 bits.
  while (v >= 0x80) {
    out.push((v & 0x7f) | 0x80)
    v >>>= 7
  }
  out.push(v)
}

const writeString = (text, out) => {
  const bytes = Buffer.from(text, 'utf8')
  writeVarint(bytes.length, out)
  for (const b of bytes) out.push(b)
}

const readVarint = (buf, pos) => {
  let result = 0
  let shift = 0
  let p = pos
  for (;;) {
    const byte = buf[p]
    if (byte === undefined) throw new Error('truncated varint')
    p += 1
    result += (byte & 0x7f) * 2 ** shift
    if ((byte & 0x80) === 0) break
    shift += 7
    if (shift > 28) throw new Error('varint too long')
  }
  return [result, p]
}

const readString = (buf, pos) => {
  const [len, p] = readVarint(buf, pos)
  const end = p + len
  if (end > buf.length) throw new Error('truncated string')
  return [buf.toString('utf8', p, end), end]
}

const packBinary = (model) => {
  const out = [0x4e, 0x53]
  writeVarint(BIN_VERSION, out)
  writeString(model.title, out)
  writeString(model.capturedAt, out)
  writeString(model.time, out)
  writeString(model.locale, out)
  writeVarint(model.groups.length, out)
  for (const grp of model.groups) {
    writeString(grp.label, out)
    writeString(grp.color, out)
    writeVarint(grp.entries.length, out)
    for (const e of grp.entries) {
      writeVarint(e.masterId, out)
      writeVarint(e.level, out)
    }
  }
  return Buffer.from(out)
}

const unpackBinary = (buf) => {
  if (buf[0] !== 0x4e || buf[1] !== 0x53) throw new Error('bad binary magic')
  let pos = 2
  let version
  ;[version, pos] = readVarint(buf, pos)
  if (version !== BIN_VERSION) throw new Error(`unsupported binary version ${version}`)
  let title
  let capturedAt
  let time
  let locale
  ;[title, pos] = readString(buf, pos)
  ;[capturedAt, pos] = readString(buf, pos)
  ;[time, pos] = readString(buf, pos)
  ;[locale, pos] = readString(buf, pos)
  let groupCount
  ;[groupCount, pos] = readVarint(buf, pos)
  const groups = []
  for (let gi = 0; gi < groupCount; gi += 1) {
    let label
    let color
    ;[label, pos] = readString(buf, pos)
    ;[color, pos] = readString(buf, pos)
    let entryCount
    ;[entryCount, pos] = readVarint(buf, pos)
    const entries = []
    for (let ei = 0; ei < entryCount; ei += 1) {
      let masterId
      let level
      ;[masterId, pos] = readVarint(buf, pos)
      ;[level, pos] = readVarint(buf, pos)
      entries.push({ masterId, level })
    }
    groups.push({ label, color, entries })
  }
  if (pos !== buf.length) throw new Error('trailing bytes in binary payload')
  return { title, capturedAt, time, locale, groups }
}

// --- Variants ----------------------------------------------------------------

const jsonBuffer = (obj) => Buffer.from(JSON.stringify(obj), 'utf8')

const VARIANTS = [
  {
    id: 'v1-descriptive',
    needsCatalog: false,
    retainsLevels: true,
    inlineNameType: true,
    notes: 'Human-readable keys with inline `version: 1`; inline name/type/level. Self-contained.',
    serialize: (m) =>
      jsonBuffer({
        version: REFERENCE_SCHEMA_VERSION,
        workspace: m.title,
        capturedAt: m.capturedAt,
        exportedAt: m.time,
        locale: m.locale,
        groups: m.groups.map((grp) => ({
          label: grp.label,
          color: grp.color,
          ships: grp.entries.map((e) => ({
            masterId: e.masterId,
            name: resolveName(e.masterId),
            type: resolveType(e.masterId),
            level: e.level,
          })),
        })),
      }),
    deserialize: (buf) => {
      const o = JSON.parse(buf.toString('utf8'))
      if (o.version !== REFERENCE_SCHEMA_VERSION) {
        throw new Error(`v1-descriptive unsupported schema version ${o.version}`)
      }
      return {
        title: o.workspace,
        capturedAt: o.capturedAt,
        time: o.exportedAt,
        locale: o.locale,
        groups: o.groups.map((grp) => ({
          label: grp.label,
          color: grp.color,
          entries: grp.ships.map((s) => ({
            masterId: s.masterId,
            name: s.name,
            type: s.type,
            level: s.level,
          })),
        })),
      }
    },
  },
  {
    id: 'v2-id-keyed',
    needsCatalog: true,
    retainsLevels: true,
    inlineNameType: false,
    notes: 'Same keys with inline `version: 1`; name/type resolved from catalog, level retained.',
    serialize: (m) =>
      jsonBuffer({
        version: REFERENCE_SCHEMA_VERSION,
        workspace: m.title,
        capturedAt: m.capturedAt,
        exportedAt: m.time,
        locale: m.locale,
        groups: m.groups.map((grp) => ({
          label: grp.label,
          color: grp.color,
          ships: grp.entries.map((e) => ({ masterId: e.masterId, level: e.level })),
        })),
      }),
    deserialize: (buf) => {
      const o = JSON.parse(buf.toString('utf8'))
      if (o.version !== REFERENCE_SCHEMA_VERSION) {
        throw new Error(`v2-id-keyed unsupported schema version ${o.version}`)
      }
      return {
        title: o.workspace,
        capturedAt: o.capturedAt,
        time: o.exportedAt,
        locale: o.locale,
        groups: o.groups.map((grp) => ({
          label: grp.label,
          color: grp.color,
          entries: grp.ships.map((s) => ({ masterId: s.masterId, level: s.level })),
        })),
      }
    },
  },
  {
    id: 'v3-tuple-level',
    needsCatalog: true,
    retainsLevels: true,
    inlineNameType: false,
    notes: 'Short keys with inline `v: 1`; [masterId, level] tuples, order is reference-local identity.',
    serialize: (m) =>
      jsonBuffer({
        v: REFERENCE_SCHEMA_VERSION,
        t: m.title,
        c: m.capturedAt,
        e: m.time,
        l: m.locale,
        g: m.groups.map((grp) => [
          grp.label,
          grp.color,
          grp.entries.map((en) => [en.masterId, en.level]),
        ]),
      }),
    deserialize: (buf) => {
      const o = JSON.parse(buf.toString('utf8'))
      if (o.v !== REFERENCE_SCHEMA_VERSION) {
        throw new Error(`v3-tuple-level unsupported schema version ${o.v}`)
      }
      return {
        title: o.t,
        capturedAt: o.c,
        time: o.e,
        locale: o.l,
        groups: o.g.map(([label, color, entries]) => ({
          label,
          color,
          entries: entries.map(([masterId, level]) => ({ masterId, level })),
        })),
      }
    },
  },
  {
    id: 'v4-tuple-id-only',
    needsCatalog: true,
    retainsLevels: false,
    inlineNameType: false,
    notes: 'Tuple of masterId only with inline `v: 1`. Lower information: levels are lost.',
    serialize: (m) =>
      jsonBuffer({
        v: REFERENCE_SCHEMA_VERSION,
        t: m.title,
        c: m.capturedAt,
        e: m.time,
        l: m.locale,
        g: m.groups.map((grp) => [
          grp.label,
          grp.color,
          grp.entries.map((en) => en.masterId),
        ]),
      }),
    deserialize: (buf) => {
      const o = JSON.parse(buf.toString('utf8'))
      if (o.v !== REFERENCE_SCHEMA_VERSION) {
        throw new Error(`v4-tuple-id-only unsupported schema version ${o.v}`)
      }
      return {
        title: o.t,
        capturedAt: o.c,
        time: o.e,
        locale: o.l,
        groups: o.g.map(([label, color, entries]) => ({
          label,
          color,
          entries: entries.map((masterId) => ({ masterId, level: null })),
        })),
      }
    },
  },
  {
    id: 'v5-binary-varint',
    needsCatalog: true,
    retainsLevels: true,
    inlineNameType: false,
    notes: 'Varint binary pack of v3 semantics; preserves title/capturedAt/time/locale/labels/order.',
    serialize: (m) => packBinary(m),
    deserialize: (buf) => unpackBinary(buf),
  },
]

// --- Encoding pipeline -------------------------------------------------------

const base64urlShare = (gzipBuf) => `${BASE64_PREFIX}${gzipBuf.toString('base64url')}`
const stripBase64Prefix = (text) => {
  if (!text.startsWith(BASE64_PREFIX)) throw new Error('missing base64 prefix')
  return text.slice(BASE64_PREFIX.length)
}

// Byte sizes and share-string metrics for one serialized payload.
const measure = (variant, buf) => {
  const gz = gzipSync(buf, { level: GZIP_LEVEL })
  const gzipBytes = gz.length
  const b64 = gz.toString('base64url')
  const cjk256Chars = CJK_PREFIX.length + gzipBytes
  const cjk128Chars = CJK_PREFIX.length + Math.ceil((gzipBytes * 8) / 7)
  const text = buf.toString('utf8')
  return {
    uncompressedBytes: buf.length,
    gzipBytes,
    base64urlPayloadChars: b64.length,
    base64urlShareChars: BASE64_PREFIX.length + b64.length,
    base64urlShareUtf8Bytes: utf8Bytes(BASE64_PREFIX) + b64.length,
    base64urlColumns: BASE64_PREFIX.length + b64.length,
    cjk256Chars,
    cjk128Chars,
    cjk256Utf8Bytes: (CJK_PREFIX.length + gzipBytes) * 3,
    cjk256Columns: (CJK_PREFIX.length + gzipBytes) * 2,
    jsonUtf8Bytes: buf.length,
    jsonColumns: columnWidth(text),
  }
}

// --- Timing ------------------------------------------------------------------

const timeAvg = (fn) => {
  for (let i = 0; i < TIMING_WARMUP; i += 1) fn()
  const start = performance.now()
  for (let i = 0; i < TIMING_ITERS; i += 1) fn()
  return (performance.now() - start) / TIMING_ITERS
}

const timeVariant = (variant, model) => {
  const buf = variant.serialize(model)
  const share = base64urlShare(gzipSync(buf, { level: GZIP_LEVEL }))
  const encode = timeAvg(() => base64urlShare(gzipSync(variant.serialize(model), { level: GZIP_LEVEL })))
  const decode = timeAvg(() =>
    variant.deserialize(gunzipSync(Buffer.from(stripBase64Prefix(share), 'base64url'))),
  )
  return { encodeMs: encode, decodeMs: decode }
}

// --- Compression comparison mode --------------------------------------------
// Must stay before the report runner so the original command is unchanged.
// Builds the corpus with the existing generator/serializers, delegates to the
// small helper, then exits.
if (process.argv.includes('--compression')) {
  const { runCompressionBenchmark } = await import('./navy-compression-benchmark.mjs')
  const payloadTypes = {
    'v3-json': VARIANTS.find((v) => v.id === 'v3-tuple-level'),
    'v5-binary': VARIANTS.find((v) => v.id === 'v5-binary-varint'),
  }
  const corpus = PLANS.map((plan, pi) => {
    const models = []
    const payloads = { 'v3-json': [], 'v5-binary': [] }
    for (let si = 0; si < SAMPLE_COUNT; si += 1) {
      const model = makePlan(plan, seedFor(pi, si))
      models.push(model)
      payloads['v3-json'].push(payloadTypes['v3-json'].serialize(model))
      payloads['v5-binary'].push(payloadTypes['v5-binary'].serialize(model))
    }
    return { scale: plan.name, ships: plan.ships, groups: plan.groups, models, payloads }
  })
  const decode = {
    'v3-json': (buf) => payloadTypes['v3-json'].deserialize(buf),
    'v5-binary': (buf) => payloadTypes['v5-binary'].deserialize(buf),
  }
  const summary = runCompressionBenchmark({
    corpus,
    decode,
    fingerprint,
    outDir: OUT_DIR,
    fixed: { title: FIXED_TITLE, capturedAt: FIXED_CAPTURED_AT, time: FIXED_TIME, locale: FIXED_LOCALE },
  })
  console.log(
    `navy compression benchmark: Node ${process.version}; ` +
      `${summary.verification.compressedPayloads} payloads verified, ${summary.verification.failures.length} failures`,
  )
  console.log(`wrote ${summary.jsonPath} and ${summary.mdPath}`)
  console.log(`saved ${summary.samples.length} compressed samples under .cache/navy-share/compressed/`)
  process.exit(summary.failures.length > 0 ? 1 : 0)
}

// --- URL + QR proof of concept mode -----------------------------------------
// Also stays before the report runner. Reuses the exact generator and the v3
// compact serializer (masterId + level mandatory), delegates to the helper.
if (process.argv.includes('--url-qr')) {
  const { runUrlQrPoc } = await import('./navy-url-qr-poc.mjs')
  const v3 = VARIANTS.find((v) => v.id === 'v3-tuple-level')
  const baseUrlFlagIndex = process.argv.indexOf('--base-url')
  const baseUrl =
    baseUrlFlagIndex >= 0 && process.argv[baseUrlFlagIndex + 1]
      ? process.argv[baseUrlFlagIndex + 1]
      : undefined
  const corpus = PLANS.map((plan, pi) => {
    const entries = []
    for (let si = 0; si < SAMPLE_COUNT; si += 1) {
      const model = makePlan(plan, seedFor(pi, si))
      entries.push({ model, json: v3.serialize(model) })
    }
    return { scale: plan.name, ships: plan.ships, groups: plan.groups, entries }
  })
  const summary = runUrlQrPoc({
    corpus,
    deserialize: (buf) => v3.deserialize(buf),
    fingerprint,
    outDir: OUT_DIR,
    baseUrl,
    fixed: { title: FIXED_TITLE, capturedAt: FIXED_CAPTURED_AT, time: FIXED_TIME, locale: FIXED_LOCALE },
    serve: process.argv.includes('--serve'),
    port: Number(process.env.NAVY_URL_QR_PORT || 8123),
  })
  console.log(
    `navy url-qr poc: Node ${process.version}; ${summary.verification.nodeRoundTrips} node round trips, ` +
      `${summary.qr.fit} QR fit / ${summary.qr.overflow} overflow, ${summary.qr.decodedExact} decoded exact, ` +
      `${summary.failures.length} failures`,
  )
  console.log(`wrote ${summary.jsonPath} and ${summary.mdPath}`)
  console.log(`gallery ${summary.galleryPath}; ${summary.samples.length} seed0 URL/JSON samples`)
  if (summary.server) {
    console.log(`serving on ${summary.server.url} (Ctrl+C to stop)`)
    // Keep the process alive so the original benchmark runner never executes.
    await new Promise(() => {})
  } else if (summary.failures.length > 0) {
    process.exit(1)
  } else {
    process.exit(0)
  }
}

// --- Run ---------------------------------------------------------------------

const planResults = []
const perVariantTotals = new Map(VARIANTS.map((v) => [v.id, []]))
const verification = { roundTrips: 0, duplicateChecks: 0, inlineLabelChecks: 0, failures: [] }

for (let pi = 0; pi < PLANS.length; pi += 1) {
  const plan = PLANS[pi]
  const variantStats = new Map(VARIANTS.map((v) => [v.id, []]))
  let timing = {}

  for (let si = 0; si < SAMPLE_COUNT; si += 1) {
    const model = makePlan(plan, seedFor(pi, si))

    for (const variant of VARIANTS) {
      const buf = variant.serialize(model)
      const decoded = variant.deserialize(buf)
      const withLevels = variant.retainsLevels

      // Semantic equality. Name/type resolve from inline fields when the variant
      // carries them (v1) or from the bundled catalog otherwise.
      if (fingerprint(model, withLevels) !== fingerprint(decoded, withLevels)) {
        verification.failures.push(`${plan.name}/${variant.id} semantic mismatch`)
      }
      // Duplicate occurrences must survive (same master, same level when kept).
      if (!sameOccurrences(model, decoded, withLevels)) {
        verification.failures.push(`${plan.name}/${variant.id} duplicate loss`)
      }
      // Inline labels must match the fixture catalog row for row (v1 only).
      if (variant.inlineNameType) {
        const problems = validateInlineLabels(decoded)
        verification.inlineLabelChecks += decoded.groups.reduce(
          (sum, grp) => sum + grp.entries.length,
          0,
        )
        if (problems.length > 0) {
          verification.failures.push(`${plan.name}/${variant.id} ${problems[0]}`)
        }
      }
      verification.roundTrips += 1
      verification.duplicateChecks += 1

      // Also verify the gzip + base64url share round trip for the text forms.
      const share = base64urlShare(gzipSync(buf, { level: GZIP_LEVEL }))
      const viaShare = variant.deserialize(
        gunzipSync(Buffer.from(stripBase64Prefix(share), 'base64url')),
      )
      if (fingerprint(model, withLevels) !== fingerprint(viaShare, withLevels)) {
        verification.failures.push(`${plan.name}/${variant.id} base64 round-trip mismatch`)
      }
      if (variant.inlineNameType) {
        const problems = validateInlineLabels(viaShare)
        if (problems.length > 0) {
          verification.failures.push(`${plan.name}/${variant.id} gzip ${problems[0]}`)
        }
      }
    }
  }

  // Full per-sample measurement for statistics (all 30 samples).
  const metricsFor = (variant, si) => {
    const model = makePlan(plan, seedFor(pi, si))
    return measure(variant, variant.serialize(model))
  }

  for (const variant of VARIANTS) {
    const values = []
    for (let si = 0; si < SAMPLE_COUNT; si += 1) values.push(metricsFor(variant, si))
    variantStats.set(variant.id, values)
    timing[variant.id] = timeVariant(variant, makePlan(plan, seedFor(pi, 0)))
  }

  const planEntry = { name: plan.name, ships: plan.ships, groups: plan.groups, variants: {} }
  for (const variant of VARIANTS) {
    const values = variantStats.get(variant.id)
    const collect = (key) => stats(values.map((m) => m[key]))
    planEntry.variants[variant.id] = {
      uncompressedBytes: collect('uncompressedBytes'),
      gzipBytes: collect('gzipBytes'),
      base64urlPayloadChars: collect('base64urlPayloadChars'),
      base64urlShareChars: collect('base64urlShareChars'),
      cjk256Chars: collect('cjk256Chars'),
      cjk128Chars: collect('cjk128Chars'),
      cjk256Utf8Bytes: collect('cjk256Utf8Bytes'),
      cjk256Columns: collect('cjk256Columns'),
      jsonColumns: collect('jsonColumns'),
      encodeMs: timing[variant.id].encodeMs,
      decodeMs: timing[variant.id].decodeMs,
    }
    perVariantTotals.get(variant.id).push(...values)
  }
  planResults.push(planEntry)
}

// --- Targeted corruption assertion -------------------------------------------
// Mutating an inline name must be caught by both the per-row label check and the
// fingerprint comparison; otherwise v1 labels could silently pass.
const corruptionProbe = (() => {
  const model = makePlan(PLANS[0], seedFor(0, 0))
  const v1 = VARIANTS.find((v) => v.id === 'v1-descriptive')
  const obj = JSON.parse(v1.serialize(model).toString('utf8'))
  obj.groups[0].ships[0].name = 'CORRUPTED'
  const corruptDecoded = v1.deserialize(Buffer.from(JSON.stringify(obj), 'utf8'))
  const inlineProblems = validateInlineLabels(corruptDecoded)
  const fingerprintMismatch = fingerprint(model, true) !== fingerprint(corruptDecoded, true)
  const detected = inlineProblems.length > 0 && fingerprintMismatch
  if (!detected) verification.failures.push('corrupt inline label was not detected')
  return { detected, inlineProblems, fingerprintMismatch }
})()

// --- Unknown master ID behavior ----------------------------------------------

const unknownModel = {
  title: FIXED_TITLE,
  capturedAt: FIXED_CAPTURED_AT,
  time: FIXED_TIME,
  locale: FIXED_LOCALE,
  groups: [
    {
      label: groupLabel(0),
      color: groupColor(0),
      entries: [
        { masterId: catalogIds[0], level: 99 },
        { masterId: 999999, level: 120 },
      ],
    },
  ],
}
const unknownVariant = VARIANTS.find((v) => v.id === 'v2-id-keyed')
const unknownDecoded = unknownVariant.deserialize(unknownVariant.serialize(unknownModel))
const unknownReport = unknownDecoded.groups[0].entries.map((e) => ({
  masterId: e.masterId,
  level: e.level,
  resolvedName: resolveName(e.masterId),
  resolvedType: resolveType(e.masterId),
  display: resolveName(e.masterId) ?? placeholder(e.masterId),
  unknown: !catalog.has(e.masterId),
}))

// Catalog resolution validation for known IDs.
let resolvedKnown = 0
let resolutionFailures = 0
for (const entry of fixture.catalog) {
  if (resolveName(entry.id) !== entry.name || resolveType(entry.id) !== entry.type) {
    resolutionFailures += 1
  } else {
    resolvedKnown += 1
  }
}

// --- Share samples (72x8) ----------------------------------------------------

const samplePlan = PLANS.find((p) => p.name === '72x8')
const sampleModel = makePlan(samplePlan, seedFor(PLANS.indexOf(samplePlan), 0))
const sampleV3 = VARIANTS.find((v) => v.id === 'v3-tuple-level')
const samplePayload = sampleV3.serialize(sampleModel)
const sampleShare = base64urlShare(gzipSync(samplePayload, { level: GZIP_LEVEL }))
mkdirSync(OUT_DIR, { recursive: true })
writeFileSync(join(OUT_DIR, 'sample-72x8.payload.v3.json'), samplePayload)
writeFileSync(join(OUT_DIR, 'sample-72x8.base64url.txt'), `${sampleShare}\n`, 'utf8')

// --- Catalog size ------------------------------------------------------------

const catalogJson = Buffer.from(JSON.stringify(fixture.catalog), 'utf8')
const catalogGzip = gzipSync(catalogJson, { level: GZIP_LEVEL })

// --- Report ------------------------------------------------------------------

const variantMeta = VARIANTS.map((v) => ({
  id: v.id,
  needsCatalog: v.needsCatalog,
  retainsLevels: v.retainsLevels,
  inlineNameType: v.inlineNameType,
  notes: v.notes,
}))

const runtime = {
  node: process.version,
  v8: process.versions.v8,
  zlib: process.versions.zlib,
  platform: `${process.platform} ${process.arch}`,
}

const report = {
  meta: {
    generatedAt: new Date().toISOString(),
    runtime,
    sampleCount: SAMPLE_COUNT,
    gzipLevel: GZIP_LEVEL,
    timingIters: TIMING_ITERS,
    fixed: { title: FIXED_TITLE, capturedAt: FIXED_CAPTURED_AT, time: FIXED_TIME, locale: FIXED_LOCALE },
    schemaVersion: {
      reference: REFERENCE_SCHEMA_VERSION,
      jsonField: { 'v1-descriptive': 'version', 'v2-id-keyed': 'version', 'v3-tuple-level': 'v', 'v4-tuple-id-only': 'v' },
      binary: `custom header (magic 0x4e53, version ${BIN_VERSION})`,
      note: 'Every JSON variant embeds and validates an inner reference-schema version, distinct from the outer share prefix/format.',
    },
    equivalenceNote:
      'Catalog-based variants resolve name/type against the exact bundled fixture catalog snapshot; equivalence is conditional on that snapshot. v1 carries inline labels, which are validated row for row.',
    prefixes: {
      cjk: CJK_PREFIX,
      cjkChars: CJK_PREFIX.length,
      cjkNote: 'Theoretical; exact conditional on 256 approved single BMP CJK chars. No alphabet is finalized and copying is not tested.',
      base64: BASE64_PREFIX,
      base64Chars: BASE64_PREFIX.length,
    },
    plans: PLANS,
  },
  catalog: {
    entries: fixture.catalog.length,
    jsonBytes: catalogJson.length,
    gzipBytes: catalogGzip.length,
    distinctBasicHanCharsInNames: distinctBasicHan,
    han256FeasibleNotAssured: true,
    hanNote:
      `Catalog names contain ${distinctBasicHan} distinct basic Han characters, so at least 256 suitable ` +
      'glyphs may exist, but approval depends on theme, readability and exclusion of obscure/negative/compatibility ' +
      'variants; a 256-character curated alphabet is therefore not assured. Omitted names/types require a bundled ' +
      'catalog in the plugin and in any future viewer.',
    resolutionFailures,
    resolvedKnown,
  },
  variants: variantMeta,
  plans: planResults,
  unknownMasterId: unknownReport,
  verification: {
    roundTrips: verification.roundTrips,
    duplicateChecks: verification.duplicateChecks,
    inlineLabelChecks: verification.inlineLabelChecks,
    corruptInlineLabelDetected: corruptionProbe.detected,
    failures: verification.failures,
  },
  samples: {
    dir: '.cache/navy-share',
    base64url: 'sample-72x8.base64url.txt',
    payload: 'sample-72x8.payload.v3.json',
    base64urlChars: sampleShare.length,
    prefix: BASE64_PREFIX,
  },
  caveats: [
    'Synthetic seeded plans from a checked-in fixture, not real user plans or frequency estimates.',
    'No real chat service, message-length limit, or copy/paste channel was tested.',
    'The CJK lengths are arithmetic projections, not a built codec: a 256-symbol alphabet carries 8 bits per symbol, a 128-symbol alphabet carries 7 bits per symbol (so 128 symbols need ceil(gzipBytes*8/7) characters), plus the fixed 6-character prefix.',
    'Minimal reference model only: a single fixed capturedAt earlier than exported time is included, but there are no per-ship observation timestamps and no per-field provenance. It does not benchmark the full earlier reference schema.',
    'Catalog-based variants require the bundled catalog snapshot to resolve names/types; equivalence is conditional on it.',
    'Gzip level 6 in this Node runtime; results may differ on other zlib builds.',
  ],
}

writeFileSync(join(OUT_DIR, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8')

// --- Markdown ----------------------------------------------------------------

const fmt = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1))
const cell = (s) => `${fmt(s.min)} / ${fmt(s.median)} / ${fmt(s.max)}`

const md = []
md.push('# Navy share-size benchmark')
md.push('')
md.push(`Runtime: Node ${runtime.node}, V8 ${runtime.v8}, zlib ${runtime.zlib}, ${runtime.platform}  `)
md.push(`Samples per plan: ${SAMPLE_COUNT}; gzip level ${GZIP_LEVEL}; deterministic seeds.  `)
md.push(`Fixed metadata: title \`${FIXED_TITLE}\`, capturedAt \`${FIXED_CAPTURED_AT}\`, exportedAt \`${FIXED_TIME}\`, locale \`${FIXED_LOCALE}\`.  `)
md.push(`CJK prefix: \`${CJK_PREFIX}\` (${CJK_PREFIX.length} chars); Base64url prefix: \`${BASE64_PREFIX}\` (${BASE64_PREFIX.length} chars).`)
md.push('')
md.push('Variants:')
for (const v of variantMeta) {
  md.push(`- \`${v.id}\`: ${v.notes} catalog=${v.needsCatalog} levels=${v.retainsLevels} inlineNameType=${v.inlineNameType}`)
}
md.push('')
md.push('Cells are min / median / max over the samples. Sizes in bytes unless noted.')
md.push('')
md.push('## Catalog')
md.push('')
md.push(
  `Entries ${report.catalog.entries}; JSON ${report.catalog.jsonBytes} B; gzip ${report.catalog.gzipBytes} B. ` +
    `Distinct basic Han chars in names: ${distinctBasicHan}. ${report.catalog.hanNote}`,
)
md.push('')

for (const planEntry of planResults) {
  md.push(`## Plan ${planEntry.name} (${planEntry.ships} ships / ${planEntry.groups} groups)`)
  md.push('')
  md.push('| variant | uncompressed | gzip | b64url chars | CJK256 chars | CJK128 chars | CJK256 utf8 B | CJK256 cols | encode ms | decode ms |')
  md.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |')
  for (const variant of VARIANTS) {
    const m = planEntry.variants[variant.id]
    md.push(
      `| ${variant.id} | ${cell(m.uncompressedBytes)} | ${cell(m.gzipBytes)} | ${cell(m.base64urlShareChars)} | ` +
        `${cell(m.cjk256Chars)} | ${cell(m.cjk128Chars)} | ${cell(m.cjk256Utf8Bytes)} | ${cell(m.cjk256Columns)} | ` +
        `${m.encodeMs.toFixed(3)} | ${m.decodeMs.toFixed(3)} |`,
    )
  }
  md.push('')
}

md.push('## Prefix accounting')
md.push('')
md.push(`- CJK: ${CJK_PREFIX.length}-char prefix \`${CJK_PREFIX}\` counted in every CJK256/CJK128 value above (${CJK_PREFIX.length * 3} UTF-8 bytes, ${CJK_PREFIX.length * 2} display columns).`)
md.push(`- Base64url: exact ASCII prefix \`${BASE64_PREFIX}\` (${BASE64_PREFIX.length} chars) included in \`b64url chars\`; payload chars = share chars - ${BASE64_PREFIX.length}.`)
md.push('')
md.push('## Semantic differences')
md.push('')
md.push('- v1 keeps inline name/type and needs no catalog (self-contained reference).')
md.push('- v2/v3/v5 omit name/type and require the bundled catalog; level is retained.')
md.push('- v4 omits level entirely: lower information; viewers cannot show levels.')
md.push('- v5 packs v3 semantics as varint binary; gzip of the binary is shown above.')
md.push(`- Every JSON variant embeds an inner reference-schema version (\`version: ${REFERENCE_SCHEMA_VERSION}\` for v1/v2, \`v: ${REFERENCE_SCHEMA_VERSION}\` for v3/v4) and rejects a mismatch; the binary form carries a header. The outer share prefix is a separate compatibility layer.`)
md.push('- All variants carry the fixed title, capturedAt and exportedAt, locale, per-group label/color, and ordered entries. Compact JSON uses `c` for capturedAt; binary packs it too.')
md.push('- Catalog-based variants need the bundled catalog snapshot to resolve names/types; equivalence is conditional on it. v1 labels are validated row for row against the fixture.')
md.push('')
md.push('## Unknown master ID')
md.push('')
md.push('```json')
md.push(JSON.stringify(unknownReport, null, 2))
md.push('```')
md.push('')
md.push('Unknown IDs resolve to a positional placeholder (`#<id>`); no name is invented and no live data is fetched.')
md.push('')
md.push('## Verification')
md.push('')
md.push(`Round trips: ${report.verification.roundTrips}; duplicate checks: ${report.verification.duplicateChecks}; inline label row checks: ${report.verification.inlineLabelChecks}; corrupt-inline-label detected: ${report.verification.corruptInlineLabelDetected}; failures: ${report.verification.failures.length}.`)
if (report.verification.failures.length > 0) {
  md.push('')
  md.push('Failures:')
  for (const f of report.verification.failures) md.push(`- ${f}`)
}
md.push('')
md.push('## Caveats')
md.push('')
for (const c of report.caveats) md.push(`- ${c}`)
md.push('')

writeFileSync(join(OUT_DIR, 'report.md'), md.join('\n'), 'utf8')

// --- Console summary ---------------------------------------------------------

console.log(`navy-share benchmark: Node ${runtime.node}, ${SAMPLE_COUNT} samples/plan, gzip ${GZIP_LEVEL}`)
console.log(`catalog: ${report.catalog.entries} entries, ${report.catalog.jsonBytes} B JSON, ${report.catalog.gzipBytes} B gzip, ${distinctBasicHan} distinct Han chars`)
console.log(`verification: ${report.verification.roundTrips} round trips, ${report.verification.failures.length} failures`)
for (const planEntry of planResults) {
  const v3 = planEntry.variants['v3-tuple-level']
  const v1 = planEntry.variants['v1-descriptive']
  console.log(
    `plan ${planEntry.name.padEnd(7)} gzip: v1 ${fmt(v1.gzipBytes.median)} -> v3 ${fmt(v3.gzipBytes.median)} B; ` +
      `CJK256 ${fmt(v3.cjk256Chars.median)} chars; CJK128 ${fmt(v3.cjk128Chars.median)} chars; b64 ${fmt(v3.base64urlShareChars.median)} chars`,
  )
}
console.log(`wrote ${join(OUT_DIR, 'report.json')} and report.md`)

if (report.verification.failures.length > 0) process.exitCode = 1
