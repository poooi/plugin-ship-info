// Standalone proof of concept: JSON -> gzip6 | Brotli11 -> unpadded Base64url ->
// URL fragment -> QR (byte mode) -> browser viewer.
//
// Invoked only through scripts/bench-navy-share.mjs --url-qr, which reuses the
// exact plan generator and the v3 compact JSON serializer. This is native Node
// tooling plus the two provided QR packages; it is not plugin runtime code and
// adds no dependencies to the workspace.

import { createRequire } from 'node:module'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { dirname, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  brotliCompressSync,
  constants as zlibConstants,
  gzipSync,
  gunzipSync,
  brotliDecompressSync,
} from 'node:zlib'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = dirname(__dirname)

const DEFAULT_BASE_URL = 'https://fleet.poi.moe/'
const VERSION_TAG = 'ns1'
const CODECS = [
  { letter: 'g', id: 'gzip6', label: 'gzip level 6' },
  { letter: 'b', id: 'brotli11', label: 'Brotli quality 11 (generic, size hint)' },
]
const ECC_LEVELS = ['L', 'M', 'Q', 'H']
const CELL_PX = 4
const QUIET_MODULES = 4

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}
const stats = (values) => ({
  min: Math.min(...values),
  median: median(values),
  max: Math.max(...values),
})

// --- Codecs ------------------------------------------------------------------

const compress = (codecId, buf) => {
  if (codecId === 'gzip6') return gzipSync(buf, { level: 6 })
  return brotliCompressSync(buf, {
    params: {
      [zlibConstants.BROTLI_PARAM_MODE]: zlibConstants.BROTLI_MODE_GENERIC,
      [zlibConstants.BROTLI_PARAM_QUALITY]: 11,
      [zlibConstants.BROTLI_PARAM_SIZE_HINT]: buf.length,
    },
  })
}
const decompress = (codecId, buf) =>
  codecId === 'gzip6' ? gunzipSync(buf) : brotliDecompressSync(buf)

const buildUrl = (baseUrl, codecLetter, base64url) =>
  `${baseUrl}#${VERSION_TAG}:${codecLetter}:${base64url}`

// Parse a complete URL's fragment into its codec letter and Base64url payload.
const parseFragment = (url) => {
  const hash = new URL(url).hash.replace(/^#/, '')
  const parts = hash.split(':')
  if (parts.length < 3) throw new Error('invalid fragment shape')
  const [tag, letter, ...rest] = parts
  if (tag !== VERSION_TAG) throw new Error(`unexpected version tag ${tag}`)
  return { letter, payload: rest.join(':') }
}

// --- QR deps -----------------------------------------------------------------

const loadQrDeps = () => {
  const require = createRequire(import.meta.url)
  const qrcodeDir = join(REPO_ROOT, '.cache', 'navy-share', 'qr-deps', 'qrcode-generator', 'package')
  const jsqrPath = join(REPO_ROOT, '.cache', 'navy-share', 'qr-deps', 'jsqr', 'package', 'dist', 'jsQR.js')
  if (!existsSync(qrcodeDir) || !existsSync(jsqrPath)) {
    throw new Error('QR deps missing under .cache/navy-share/qr-deps (qrcode-generator, jsqr)')
  }
  const qrcode = require(qrcodeDir)
  const jsQR = require(jsqrPath)
  return { qrcode, jsQR: typeof jsQR === 'function' ? jsQR : jsQR.default }
}

// Classify a known qrcode-generator capacity overflow as overflow. The encoder
// throws a plain string ("code length overflow. (...)"), not an Error. Any other
// error is unexpected and must surface rather than be silently downgraded.
const isCapacityOverflow = (error) => {
  const message = typeof error === 'string' ? error : error && error.message
  return /code length overflow/i.test(String(message))
}

// Returns { ok, qr, moduleCount } or { ok:false, overflow:true }.
const makeQr = (qrcode, url, ecc) => {
  const qr = qrcode(0, ecc) // 0 = automatic version
  qr.addData(url, 'Byte')
  try {
    qr.make()
  } catch (error) {
    if (isCapacityOverflow(error)) return { ok: false, overflow: true }
    throw error
  }
  const moduleCount = qr.getModuleCount()
  if (!Number.isInteger(moduleCount) || moduleCount < 21) {
    throw new Error(`qrcode-generator returned an invalid module count: ${moduleCount}`)
  }
  return { ok: true, qr, moduleCount }
}

const renderRgba = (qr, moduleCount, cell = CELL_PX, margin = QUIET_MODULES) => {
  const sideModules = moduleCount + 2 * margin
  const width = sideModules * cell
  const height = width
  const data = new Uint8ClampedArray(width * height * 4)
  data.fill(255)
  for (let row = 0; row < moduleCount; row += 1) {
    for (let col = 0; col < moduleCount; col += 1) {
      if (!qr.isDark(row, col)) continue
      const x0 = (col + margin) * cell
      const y0 = (row + margin) * cell
      for (let y = y0; y < y0 + cell; y += 1) {
        for (let x = x0; x < x0 + cell; x += 1) {
          const p = (y * width + x) * 4
          data[p] = 0
          data[p + 1] = 0
          data[p + 2] = 0
          data[p + 3] = 255
        }
      }
    }
  }
  return { width, height, data }
}

const svgForQr = (qr, moduleCount, cell = CELL_PX, margin = QUIET_MODULES) => {
  const sideModules = moduleCount + 2 * margin
  const size = sideModules * cell
  let path = ''
  for (let row = 0; row < moduleCount; row += 1) {
    for (let col = 0; col < moduleCount; col += 1) {
      if (!qr.isDark(row, col)) continue
      const x = (col + margin) * cell
      const y = (row + margin) * cell
      path += `M${x} ${y}h${cell}v${cell}h-${cell}z`
    }
  }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" ` +
    `viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">` +
    `<rect width="${size}" height="${size}" fill="#ffffff"/>` +
    `<path d="${path}" fill="#000000"/></svg>\n`
  )
}

const qrVersionFromModules = (moduleCount) => (moduleCount - 17) / 4

// --- Main POC ----------------------------------------------------------------

export function runUrlQrPoc({ corpus, deserialize, fingerprint, outDir, baseUrl, fixed, serve, port }) {
  const root = baseUrl || DEFAULT_BASE_URL
  const normalizedBase = root.endsWith('/') ? root : `${root}/`
  const { qrcode, jsQR } = loadQrDeps()

  const urlQrDir = join(outDir, 'url-qr')
  const samplesDir = join(urlQrDir, 'samples')
  const svgDir = join(urlQrDir, 'svg')
  mkdirSync(samplesDir, { recursive: true })
  mkdirSync(svgDir, { recursive: true })

  const verification = { nodeRoundTrips: 0, failures: [] }
  const qrVerification = { fit: 0, overflow: 0, decodedExact: 0, fragmentRoundTrips: 0, failures: [] }
  const results = []
  const samples = []
  const qrEntries = []

  for (const item of corpus) {
    const scaleResult = { scale: item.scale, ships: item.ships, groups: item.groups, codecs: {} }
    const seedCount = item.entries.length

    for (const codec of CODECS) {
      const compressedSizes = []
      const urlSizes = []
      for (let si = 0; si < seedCount; si += 1) {
        const { json, model } = item.entries[si]
        const compressed = compress(codec.id, json)
        const base64url = compressed.toString('base64url')
        const url = buildUrl(normalizedBase, codec.letter, base64url)
        compressedSizes.push(compressed.length)
        urlSizes.push(Buffer.byteLength(url, 'utf8'))

        // Node round trip: parse the complete URL fragment, Base64url decode,
        // dispatch by the parsed codec letter, decompress, compare to JSON.
        // (The seed0 QR path below separately proves the rendered-scan chain.)
        try {
          const { letter, payload } = parseFragment(url)
          if (letter !== codec.letter) throw new Error(`fragment codec ${letter} != ${codec.letter}`)
          const restored = decompress(codec.id, Buffer.from(payload, 'base64url'))
          if (!restored.equals(json)) {
            verification.failures.push(`${item.scale}/${codec.id}/seed${si} node bytes differ`)
          } else if (fingerprint(deserialize(restored), true) !== fingerprint(model, true)) {
            verification.failures.push(`${item.scale}/${codec.id}/seed${si} node content differs`)
          } else {
            verification.nodeRoundTrips += 1
          }
        } catch (error) {
          verification.failures.push(`${item.scale}/${codec.id}/seed${si} fragment: ${error.message}`)
        }
      }

      scaleResult.codecs[codec.id] = {
        seeds: seedCount,
        compressedBytes: stats(compressedSizes),
        urlBytes: stats(urlSizes),
      }
    }

    results.push(scaleResult)
  }

  // Seed0 QR matrices for every scale and codec, every ECC level.
  for (const item of corpus) {
    const seed0 = item.entries[0]
    for (const codec of CODECS) {
      const compressed = compress(codec.id, seed0.json)
      const base64url = compressed.toString('base64url')
      const url = buildUrl(normalizedBase, codec.letter, base64url)
      const urlBytes = Buffer.byteLength(url, 'utf8')

      const sampleBase = `${item.scale}.${codec.id}`
      writeFileSync(join(samplesDir, `${sampleBase}.json`), seed0.json)
      writeFileSync(join(samplesDir, `${sampleBase}.url.txt`), `${url}\n`, 'utf8')
      writeFileSync(join(samplesDir, `${sampleBase}.compressed.bin`), compressed)
      samples.push({
        scale: item.scale,
        codec: codec.id,
        codecLetter: codec.letter,
        fragment: `#${VERSION_TAG}:${codec.letter}:${base64url}`,
        url,
        urlBytes,
        compressedBytes: compressed.length,
        jsonFile: `.cache/navy-share/url-qr/samples/${sampleBase}.json`,
        urlFile: `.cache/navy-share/url-qr/samples/${sampleBase}.url.txt`,
        compressedFile: `.cache/navy-share/url-qr/samples/${sampleBase}.compressed.bin`,
      })

      for (const ecc of ECC_LEVELS) {
        const made = makeQr(qrcode, url, ecc)
        const record = { scale: item.scale, codec: codec.id, ecc, urlBytes }
        if (!made.ok) {
          record.status = 'overflow'
          qrVerification.overflow += 1
          qrEntries.push(record)
          continue
        }
        qrVerification.fit += 1
        record.status = 'fit'
        record.moduleCount = made.moduleCount
        record.version = qrVersionFromModules(made.moduleCount)
        record.renderPixels = (made.moduleCount + 2 * QUIET_MODULES) * CELL_PX

        const { width, height, data } = renderRgba(made.qr, made.moduleCount)
        const decoded = jsQR(data, width, height)
        if (!decoded || decoded.data !== url) {
          const detail =
            `${item.scale}/${codec.id}/${ecc} jsQR decode mismatch ` +
            `(version ${record.version}, ${made.moduleCount} modules, ${width}x${height}px, ` +
            `url ${urlBytes} B): decoded=${decoded ? 'different data' : 'null'}`
          qrVerification.failures.push(detail)
          record.decoded = false
          record.decodeFailure = decoded ? 'different data' : 'null'
        } else {
          qrVerification.decodedExact += 1
          record.decoded = true
          record.decodedVersion = decoded.version

          // Full chain from the decoded URL back to the original JSON bytes.
          try {
            const fragment = decoded.data.split('#')[1]
            const [tag, letter, payload] = fragment.split(':')
            const decodedCodec = CODECS.find((c) => c.letter === letter)?.id
            if (tag !== VERSION_TAG || !decodedCodec) throw new Error('bad fragment tag/codec')
            const bytes = Buffer.from(payload, 'base64url')
            const restored = decompress(decodedCodec, bytes)
            if (!restored.equals(seed0.json)) throw new Error('fragment bytes differ')
            qrVerification.fragmentRoundTrips += 1
            record.fragmentRoundTrip = true
          } catch (error) {
            qrVerification.failures.push(`${item.scale}/${codec.id}/${ecc} fragment: ${error.message}`)
          }
        }

        const svgName = `${item.scale}.${codec.id}.${ecc}.svg`
        writeFileSync(join(svgDir, svgName), svgForQr(made.qr, made.moduleCount))
        record.svg = `svg/${svgName}`
        qrEntries.push(record)
      }
    }
  }

  const report = {
    meta: {
      generatedAt: new Date().toISOString(),
      runtime: { node: process.version, v8: process.versions.v8, zlib: process.versions.zlib, brotli: process.versions.brotli, platform: `${process.platform} ${process.arch}` },
      intendedBaseUrl: normalizedBase,
      hostNote:
        'fleet.poi.moe is the intended viewer host and is not a confirmed deployment. Browser tests intercept this exact origin; a camera scan resolves this origin, and the local viewer is served by --serve.',
      urlShape: `${normalizedBase}#${VERSION_TAG}:{g|b}:BASE64URL`,
      codecs: CODECS.map((c) => ({ id: c.id, letter: c.letter, label: c.label })),
      base64url: 'unpadded, URL-safe; no encodeURIComponent applied',
      qr: { cellPx: CELL_PX, quietModules: QUIET_MODULES, rendering: 'RGBA black/white', decoder: 'jsqr@1.4.0', generator: 'qrcode-generator@2.0.4 (byte mode, auto version)' },
      fixed,
      sampleCount: corpus[0].entries.length,
      scales: corpus.map((c) => c.scale),
    },
    results,
    qrVerification: {
      fit: qrVerification.fit,
      overflow: qrVerification.overflow,
      decodedExact: qrVerification.decodedExact,
      fragmentRoundTrips: qrVerification.fragmentRoundTrips,
      failures: qrVerification.failures,
    },
    qrEntries,
    samples,
    verification: {
      nodeRoundTrips: verification.nodeRoundTrips,
      failures: verification.failures,
    },
  }

  writeFileSync(join(urlQrDir, 'url-qr-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8')

  // --- Markdown --------------------------------------------------------------
  const fmt = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1))
  const cell = (s) => `${fmt(s.min)} / ${fmt(s.median)} / ${fmt(s.max)}`
  const md = []
  md.push('# Navy URL + QR proof of concept')
  md.push('')
  md.push(`Intended host: \`${normalizedBase}\` (not a confirmed deployment). URL shape: \`${report.meta.urlShape}\`.`)
  md.push('')
  md.push(`Runtime: Node ${report.meta.runtime.node}, zlib ${report.meta.runtime.zlib}, brotli ${report.meta.runtime.brotli}.  `)
  md.push(`JSON = v3 compact tuples (masterId + level mandatory). Codecs: ${CODECS.map((c) => c.label).join('; ')}.`)
  md.push('')
  md.push('## Complete URL byte sizes (median per scale)')
  md.push('')
  md.push('Full URL bytes include the origin, the `#ns1:{g|b}:` fragment tag and codec, and the unpadded Base64url payload. They are distinct from compressed bytes.')
  md.push('')
  md.push('| scale | ships/groups | codec | compressed B (min/med/max) | full URL B (min/med/max) |')
  md.push('| --- | --- | --- | --- | --- |')
  for (const scaleResult of results) {
    for (const codec of CODECS) {
      const r = scaleResult.codecs[codec.id]
      md.push(
        `| ${scaleResult.scale} | ${scaleResult.ships}/${scaleResult.groups} | ${codec.id} | ${cell(r.compressedBytes)} | ${cell(r.urlBytes)} |`,
      )
    }
  }
  md.push('')
  md.push('## Seed0 QR (byte mode, auto version)')
  md.push('')
  md.push(`Render: ${CELL_PX}px/module, ${QUIET_MODULES}-module quiet zone. Overflow is recorded, never silently reduced ECC.`)
  md.push('')
  md.push('| scale | codec | ECC | status | version | modules | render px | jsQR exact |')
  md.push('| --- | --- | --- | --- | --- | --- | --- | --- |')
  for (const e of qrEntries) {
    if (e.status === 'fit') {
      md.push(`| ${e.scale} | ${e.codec} | ${e.ecc} | fit | ${e.version} | ${e.moduleCount} | ${e.renderPixels} | ${e.decoded ? 'yes' : 'NO'} |`)
    } else {
      md.push(`| ${e.scale} | ${e.codec} | ${e.ecc} | overflow | — | — | — | — |`)
    }
  }
  md.push('')
  md.push('## Seed0 samples')
  md.push('')
  md.push('| scale | codec | compressed B | URL B | JSON | URL |')
  md.push('| --- | --- | --- | --- | --- | --- |')
  for (const s of samples) {
    md.push(`| ${s.scale} | ${s.codec} | ${s.compressedBytes} | ${s.urlBytes} | ${s.jsonFile} | ${s.urlFile} |`)
  }
  md.push('')
  md.push('## Verification')
  md.push('')
  md.push(`Node round trips: ${report.verification.nodeRoundTrips} (compressed -> decompressed -> v3 deserialize equals original), failures ${report.verification.failures.length}.  `)
  md.push(`QR fit: ${qrVerification.fit}; overflow: ${qrVerification.overflow}; jsQR exact decodes: ${qrVerification.decodedExact}; fragment->JSON round trips: ${qrVerification.fragmentRoundTrips}; failures ${qrVerification.failures.length}.`)
  md.push('')
  md.push('## Local viewer')
  md.push('')
  md.push('`--serve` exposes the viewer, the Brotli decoder, samples, SVGs, and this report on 127.0.0.1. Camera scanning the intended host is not a deployment.')
  md.push('')
  if (verification.failures.length + qrVerification.failures.length > 0) {
    md.push('Failures:')
    for (const f of [...verification.failures, ...qrVerification.failures]) md.push(`- ${f}`)
    md.push('')
  }
  writeFileSync(join(urlQrDir, 'url-qr-report.md'), md.join('\n'), 'utf8')

  // --- Gallery ---------------------------------------------------------------
  const gallery = []
  gallery.push('<!doctype html><html lang="en"><head><meta charset="utf-8">')
  gallery.push('<meta name="viewport" content="width=device-width, initial-scale=1">')
  gallery.push('<title>Navy URL + QR gallery</title>')
  gallery.push('<style>body{font-family:system-ui,sans-serif;margin:1.5rem;line-height:1.4}table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:4px 8px;font-size:13px;vertical-align:top}code{word-break:break-all}.warn{background:#fff3cd;border:1px solid #e0b000;padding:.6rem;margin-bottom:1rem}.host{color:#a00}</style></head><body>')
  gallery.push('<h1>Navy URL + QR gallery</h1>')
  gallery.push(`<p class="warn"><strong>Intended host:</strong> <code class="host">${normalizedBase}</code> is the intended viewer host and is <strong>not a confirmed deployment</strong>. A camera scan opens that origin, which will not render the plan until it exists. Browser tests intercept this exact origin. Use the <em>local viewer</em> links below, served by <code>--serve</code>.</p>`)
  gallery.push('<p>Samples contain the seed0 v3 JSON and the exact full URL. <a href="/report.md">report.md</a> · <a href="/report.json">report.json</a></p>')
  gallery.push('<table><thead><tr><th>scale</th><th>codec</th><th>compressed B</th><th>URL B</th><th>ECC fit (seed0)</th><th>QR svg</th><th>intended-host URL</th><th>local viewer</th></tr></thead><tbody>')
  for (const s of samples) {
    const fits = qrEntries.filter((e) => e.scale === s.scale && e.codec === s.codec && e.status === 'fit').map((e) => e.ecc)
    const over = qrEntries.filter((e) => e.scale === s.scale && e.codec === s.codec && e.status === 'overflow').map((e) => e.ecc)
    const svgLink = fits.length > 0 ? `<a href="/svg/${s.scale}.${s.codec}.L.svg">L</a>` : '—'
    const viewerUrl = `/viewer#${VERSION_TAG}:${s.codecLetter}:${s.fragment.split(':')[2]}`
    gallery.push(
      `<tr><td>${s.scale}</td><td>${s.codec}</td><td>${s.compressedBytes}</td><td>${s.urlBytes}</td>` +
        `<td>fit: ${fits.join(',') || '—'}<br>overflow: ${over.join(',') || '—'}</td>` +
        `<td>${svgLink}</td>` +
        `<td><a class="host" href="${s.url}">${s.url.slice(0, 48)}…</a> <span class="host">(intended host, not deployed)</span></td>` +
        `<td><a href="${viewerUrl}">open in local viewer</a></td></tr>`,
    )
  }
  gallery.push('</tbody></table>')
  gallery.push('<p>Generated gallery. fleet.poi.moe is the intended host, not a confirmed deployment.</p>')
  gallery.push('</body></html>')
  const galleryPath = join(urlQrDir, 'gallery.html')
  writeFileSync(galleryPath, gallery.join('\n'), 'utf8')

  let server = null
  if (serve) {
    const allow = {
      samples: new Set(
        samples.flatMap((s) => [s.jsonFile, s.urlFile, s.compressedFile].map((p) => p.split('/').pop())),
      ),
      svg: new Set(qrEntries.filter((e) => e.svg).map((e) => e.svg.split('/').pop())),
    }
    server = startServer({ repoRoot: REPO_ROOT, urlQrDir, port: port || 8123, allow })
  }

  return {
    verification,
    failures: [...verification.failures, ...qrVerification.failures],
    qr: {
      fit: qrVerification.fit,
      overflow: qrVerification.overflow,
      decodedExact: qrVerification.decodedExact,
      fragmentRoundTrips: qrVerification.fragmentRoundTrips,
    },
    samples,
    jsonPath: join(urlQrDir, 'url-qr-report.json'),
    mdPath: join(urlQrDir, 'url-qr-report.md'),
    galleryPath,
    server,
  }
}

// --- Local server ------------------------------------------------------------

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.wasm': 'application/wasm',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.bin': 'application/octet-stream',
}

function startServer({ repoRoot, urlQrDir, port, allow }) {
  const brotliPkg = join(repoRoot, '.cache', 'navy-share', 'decoders', 'brotli-dec-wasm', 'package')
  const routes = new Map([
    ['/', join(urlQrDir, 'gallery.html')],
    ['/gallery.html', join(urlQrDir, 'gallery.html')],
    ['/viewer', join(repoRoot, 'scripts', 'fixtures', 'navy-url-qr-viewer.html')],
    ['/viewer.html', join(repoRoot, 'scripts', 'fixtures', 'navy-url-qr-viewer.html')],
    ['/report.json', join(urlQrDir, 'url-qr-report.json')],
    ['/report.md', join(urlQrDir, 'url-qr-report.md')],
    ['/brotli/index.js', join(brotliPkg, 'index.js')],
    ['/brotli/pkg/brotli_dec_wasm.js', join(brotliPkg, 'pkg', 'brotli_dec_wasm.js')],
    ['/brotli/pkg/brotli_dec_wasm_bg.wasm', join(brotliPkg, 'pkg', 'brotli_dec_wasm_bg.wasm')],
  ])
  // Dynamic sample/svg routes accept only an anchored single-segment basename
  // that is present in the generated allowlist. No separators or traversal.
  const dynamicRoute = /^\/(samples|svg)\/([A-Za-z0-9._-]+)$/

  const server = createServer((req, res) => {
    try {
      const urlPath = decodeURIComponent((req.url || '/').split('?')[0].split('#')[0])
      let filePath = routes.get(urlPath)
      if (!filePath) {
        const match = dynamicRoute.exec(urlPath)
        if (match) {
          const [, kind, name] = match
          if (allow[kind].has(name)) {
            filePath = join(urlQrDir, kind, name)
          }
        }
      }
      if (!filePath || !existsSync(filePath)) {
        res.writeHead(404, { 'content-type': 'text/plain' })
        res.end('not found')
        return
      }
      res.writeHead(200, { 'content-type': MIME[extname(filePath)] || 'application/octet-stream' })
      res.end(readFileSync(filePath))
    } catch (error) {
      res.writeHead(500, { 'content-type': 'text/plain' })
      res.end(String(error && error.message))
    }
  })

  server.listen(port, '127.0.0.1')
  return { server, url: `http://127.0.0.1:${port}/`, close: () => server.close() }
}
