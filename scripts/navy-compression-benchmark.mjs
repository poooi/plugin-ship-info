// Small, bounded helper for the Navy share-size experiment's --compression mode.
// It compares native Node compression codecs over the exact v3 compact JSON and
// v5 binary payloads built by scripts/bench-navy-share.mjs. It is not a generic
// compression framework and is only invoked through that script.
//
// Browser/WASM measurements are separate; everything here is native Node timing.

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { performance } from 'node:perf_hooks'
import {
  brotliCompressSync,
  brotliDecompressSync,
  constants as zlibConstants,
  gzipSync,
  gunzipSync,
  zstdCompressSync,
  zstdDecompressSync,
} from 'node:zlib'
import process from 'node:process'

const C = zlibConstants

const settings = {
  gzip: [6, 9],
  brotli: [5, 9, 11],
  zstd: [3, 9, 19],
}

export function buildAlgorithms() {
  const algorithms = []
  for (const level of settings.gzip) {
    algorithms.push({
      id: `gzip-${level}`,
      family: 'gzip',
      highest: level === Math.max(...settings.gzip),
      setting: `level ${level}`,
      checksum: 'CRC32 (built into gzip)',
      params: { level },
      compress: (buf) => gzipSync(buf, { level }),
      decompress: (buf) => gunzipSync(buf),
    })
  }
  for (const quality of settings.brotli) {
    algorithms.push({
      id: `brotli-${quality}`,
      family: 'brotli',
      highest: quality === Math.max(...settings.brotli),
      setting: `quality ${quality}, mode generic, size hint`,
      checksum: 'none (Brotli has no built-in checksum)',
      params: {
        BROTLI_PARAM_MODE: 'BROTLI_MODE_GENERIC',
        BROTLI_PARAM_QUALITY: quality,
        BROTLI_PARAM_SIZE_HINT: 'input length',
      },
      compress: (buf) =>
        brotliCompressSync(buf, {
          params: {
            [C.BROTLI_PARAM_MODE]: C.BROTLI_MODE_GENERIC,
            [C.BROTLI_PARAM_QUALITY]: quality,
            [C.BROTLI_PARAM_SIZE_HINT]: buf.length,
          },
        }),
      decompress: (buf) => brotliDecompressSync(buf),
    })
  }
  for (const level of settings.zstd) {
    algorithms.push({
      id: `zstd-${level}`,
      family: 'zstd',
      highest: level === Math.max(...settings.zstd),
      setting: `level ${level}, checksumFlag=1`,
      checksum: 'ZSTD_c_checksumFlag=1 (4 bytes: low 32 bits of XXH64)',
      params: {
        ZSTD_c_compressionLevel: level,
        ZSTD_c_checksumFlag: 1,
      },
      compress: (buf) =>
        zstdCompressSync(buf, {
          params: {
            [C.ZSTD_c_compressionLevel]: level,
            [C.ZSTD_c_checksumFlag]: 1,
          },
        }),
      decompress: (buf) => zstdDecompressSync(buf),
    })
  }
  return algorithms
}

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

const runtimeVersions = () => ({
  node: process.version,
  v8: process.versions.v8,
  zlib: process.versions.zlib,
  zstd: process.versions.zstd,
  brotli: process.versions.brotli,
  platform: `${process.platform} ${process.arch}`,
})

/**
 * @param {object} options
 * @param {Array<{scale:string,ships:number,groups:number,models:any[],payloads:Record<string,Buffer[]>}>} options.corpus
 * @param {Record<string,(buf:Buffer)=>any>} options.decode
 * @param {(model:any, withLevels:boolean)=>string} options.fingerprint
 * @param {string} options.outDir
 * @param {object} options.fixed
 */
export function runCompressionBenchmark({ corpus, decode, fingerprint, outDir, fixed }) {
  const algorithms = buildAlgorithms()
  const payloadTypeIds = Object.keys(corpus[0].payloads)
  const timingIters = 25
  const timingWarmup = 3
  const representativeSeed = 0

  mkdirSync(outDir, { recursive: true })
  const sampleDir = join(outDir, 'compressed')
  mkdirSync(sampleDir, { recursive: true })

  const verification = { compressedPayloads: 0, byteIdentical: 0, deserializedOk: 0, failures: [] }
  const results = []

  for (const item of corpus) {
    const seedCount = item.payloads[payloadTypeIds[0]].length
    const scaleResult = { scale: item.scale, ships: item.ships, groups: item.groups, payloadTypes: {} }

    for (const payloadTypeId of payloadTypeIds) {
      const payloads = item.payloads[payloadTypeId]
      const uncompressedSizes = payloads.map((b) => b.length)
      const perAlgorithmSizes = new Map()
      for (const algo of algorithms) perAlgorithmSizes.set(algo.id, [])

      // Compress every seed, verify decompression, collect sizes.
      for (let si = 0; si < seedCount; si += 1) {
        const original = payloads[si]
        for (const algo of algorithms) {
          const compressed = algo.compress(original)
          perAlgorithmSizes.get(algo.id).push(compressed.length)
          verification.compressedPayloads += 1

          const restored = algo.decompress(compressed)
          if (!restored.equals(original)) {
            verification.failures.push(`${item.scale}/${payloadTypeId}/${algo.id}/seed${si} bytes differ`)
          } else {
            verification.byteIdentical += 1
          }
          try {
            const decoded = decode[payloadTypeId](restored)
            if (fingerprint(decoded, true) === fingerprint(item.models[si], true)) {
              verification.deserializedOk += 1
            } else {
              verification.failures.push(`${item.scale}/${payloadTypeId}/${algo.id}/seed${si} content mismatch`)
            }
          } catch (error) {
            verification.failures.push(`${item.scale}/${payloadTypeId}/${algo.id}/seed${si} decode: ${error.message}`)
          }
        }
      }

      const gzip6Sizes = perAlgorithmSizes.get('gzip-6')
      const algorithmResults = {}
      for (const algo of algorithms) {
        const sizes = perAlgorithmSizes.get(algo.id)
        const pairedBytes = []
        const pairedPercent = []
        for (let si = 0; si < seedCount; si += 1) {
          const diff = gzip6Sizes[si] - sizes[si]
          pairedBytes.push(diff)
          pairedPercent.push((diff / gzip6Sizes[si]) * 100)
        }

        // Native timing on one representative seed.
        const sample = payloads[representativeSeed]
        const compressFn = () => algo.compress(sample)
        const refCompressed = compressFn()
        const decompressFn = () => algo.decompress(refCompressed)
        for (let i = 0; i < timingWarmup; i += 1) {
          compressFn()
          decompressFn()
        }
        let t0 = performance.now()
        for (let i = 0; i < timingIters; i += 1) compressFn()
        const compressMs = (performance.now() - t0) / timingIters
        t0 = performance.now()
        for (let i = 0; i < timingIters; i += 1) decompressFn()
        const decompressMs = (performance.now() - t0) / timingIters

        algorithmResults[algo.id] = {
          compressed: stats(sizes),
          savingsVsGzip6Bytes: stats(pairedBytes),
          savingsVsGzip6Percent: stats(pairedPercent),
          compressMs,
          decompressMs,
        }
      }

      scaleResult.payloadTypes[payloadTypeId] = {
        seeds: seedCount,
        uncompressed: stats(uncompressedSizes),
        algorithms: algorithmResults,
      }
    }

    results.push(scaleResult)
  }

  // Save the highest tested compressed payload for requested scales/seed.
  const sampleScales = ['72x8', '120x12']
  const samples = []
  for (const scale of sampleScales) {
    const item = corpus.find((c) => c.scale === scale)
    if (!item) continue
    for (const payloadTypeId of payloadTypeIds) {
      const payload = item.payloads[payloadTypeId][representativeSeed]
      for (const algo of algorithms) {
        if (!algo.highest) continue
        const tag = `${algo.family}${settings[algo.family].at(-1)}`
        const name = `${scale}.${payloadTypeId}.${tag}.bin`
        const filePath = join(sampleDir, name)
        const compressed = algo.compress(payload)
        writeFileSync(filePath, compressed)
        samples.push({
          name,
          path: `.cache/navy-share/compressed/${name}`,
          scale,
          payloadType: payloadTypeId,
          algorithm: algo.id,
          seed: representativeSeed,
          bytes: compressed.length,
          uncompressedBytes: payload.length,
        })
      }
    }
  }

  const report = {
    meta: {
      generatedAt: new Date().toISOString(),
      runtime: runtimeVersions(),
      fixed,
      sampleCount: corpus[0].payloads[payloadTypeIds[0]].length,
      scales: corpus.map((c) => c.scale),
      settings,
      payloadTypes: payloadTypeIds,
      timing: { warmup: timingWarmup, iterations: timingIters, representativeSeed, note: 'Native Node timing only; not browser/WASM.' },
      checksumNotes: {
        gzip: 'CRC32 built in.',
        brotli: 'No built-in checksum; integrity relies on outer framing if any.',
        zstd: 'ZSTD_c_checksumFlag=1 adds a 4-byte checksum (low 32 bits of XXH64); sizes include this overhead.',
      },
      fairness: 'All algorithms compress the exact same input bytes for each seed; paired savings are computed per seed against gzip-6.',
      brotliMode: 'BROTLI_MODE_GENERIC for both payload types; no extra framing added.',
      dictionaries: 'None.',
    },
    algorithms: algorithms.map((a) => ({
      id: a.id,
      family: a.family,
      setting: a.setting,
      checksum: a.checksum,
      params: a.params,
    })),
    results,
    verification: {
      compressedPayloads: verification.compressedPayloads,
      byteIdentical: verification.byteIdentical,
      deserializedOk: verification.deserializedOk,
      failures: verification.failures,
    },
    samples,
  }

  writeFileSync(join(outDir, 'compression-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8')

  // --- Markdown --------------------------------------------------------------
  const fmt = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1))
  const cell = (s) => `${fmt(s.min)} / ${fmt(s.median)} / ${fmt(s.max)}`
  const md = []
  md.push('# Navy share compression benchmark (native Node)')
  md.push('')
  md.push(`Runtime: Node ${report.meta.runtime.node}, V8 ${report.meta.runtime.v8}, zlib ${report.meta.runtime.zlib}, zstd ${report.meta.runtime.zstd}, brotli ${report.meta.runtime.brotli}, ${report.meta.runtime.platform}  `)
  md.push(`Seeds per scale: ${report.meta.sampleCount}; scales: ${report.meta.scales.join(', ')}.  `)
  md.push(`Payloads: ${payloadTypeIds.join(', ')}. Brotli mode: generic. Dictionaries: none.  `)
  md.push('Native Node timing only; not browser/WASM. Compress/decompress ms are averages over one representative seed after warmup.')
  md.push('')
  md.push('Checksums: gzip CRC32 built in; zstd uses ZSTD_c_checksumFlag=1 (4 bytes: low 32 bits of XXH64); Brotli has no built-in checksum.')
  md.push('')
  md.push(`Verification: ${report.verification.compressedPayloads} compressed payloads, ${report.verification.byteIdentical} byte-identical, ${report.verification.deserializedOk} deserialized, ${report.verification.failures.length} failures.`)
  md.push('')

  for (const scaleResult of results) {
    md.push(`## Plan ${scaleResult.scale} (${scaleResult.ships} ships / ${scaleResult.groups} groups)`)
    md.push('')
    for (const payloadTypeId of payloadTypeIds) {
      const pt = scaleResult.payloadTypes[payloadTypeId]
      md.push(`### ${payloadTypeId} — uncompressed ${cell(pt.uncompressed)} B`)
      md.push('')
      md.push('| algorithm | compressed B (min/med/max) | savings vs gzip6 B (min/med/max) | savings % (min/med/max) | compress ms | decompress ms |')
      md.push('| --- | --- | --- | --- | --- | --- |')
      for (const algo of algorithms) {
        const a = pt.algorithms[algo.id]
        const savings =
          algo.id === 'gzip-6'
            ? '— | —'
            : `${cell(a.savingsVsGzip6Bytes)} | ${cell(a.savingsVsGzip6Percent)}`
        md.push(
          `| ${algo.id} | ${cell(a.compressed)} | ${savings} | ${a.compressMs.toFixed(3)} | ${a.decompressMs.toFixed(3)} |`,
        )
      }
      md.push('')
    }
  }

  md.push('## Saved samples (highest tested setting per algorithm, seed 0)')
  md.push('')
  md.push('| file | scale | payload | algorithm | bytes | uncompressed |')
  md.push('| --- | --- | --- | --- | --- | --- |')
  for (const s of samples) {
    md.push(`| ${s.path} | ${s.scale} | ${s.payloadType} | ${s.algorithm} | ${s.bytes} | ${s.uncompressedBytes} |`)
  }
  md.push('')

  writeFileSync(join(outDir, 'compression-report.md'), md.join('\n'), 'utf8')

  return {
    failures: verification.failures,
    verification,
    jsonPath: join(outDir, 'compression-report.json'),
    mdPath: join(outDir, 'compression-report.md'),
    samples,
  }
}
