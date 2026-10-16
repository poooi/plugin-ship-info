// Verifies a packed poi-plugin-ship-info tarball: metadata, compiled entry,
// packaged i18n/assets, bundled (not runtime) shared code, and host externals.
//
// Usage:
//   node scripts/verify-package.mjs [path/to/poi-plugin-ship-info-*.tgz]
//
// With no argument it picks the newest matching tarball in .cache/packages.
// This is host-boundary/artifact verification, not a live poi installation.

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import vm from 'node:vm'

const repo = process.cwd()
const packageDir = path.join(repo, '.cache', 'packages')
const sourceManifest = JSON.parse(
  fs.readFileSync(
    path.join(repo, 'packages', 'ship-info', 'package.json'),
    'utf8',
  ),
)

const findTarball = () => {
  const arg = process.argv[2]
  if (arg) return path.resolve(repo, arg)
  if (!fs.existsSync(packageDir)) {
    throw new Error(`no tarball found: ${packageDir} does not exist`)
  }
  const candidates = fs
    .readdirSync(packageDir)
    .filter((name) => /^poi-plugin-ship-info-.*\.tgz$/.test(name))
    .map((name) => ({
      name,
      time: fs.statSync(path.join(packageDir, name)).mtimeMs,
    }))
    .sort((a, b) => b.time - a.time)
  if (candidates.length === 0) {
    throw new Error(`no poi-plugin-ship-info-*.tgz in ${packageDir}`)
  }
  return path.join(packageDir, candidates[0].name)
}

const failures = []
const check = (condition, message) => {
  if (!condition) failures.push(message)
}

const tarball = findTarball()
const workdir = fs.mkdtempSync(path.join(os.tmpdir(), 'ship-info-package-'))

try {
  execFileSync('tar', ['-xzf', tarball, '-C', workdir])
  const pkgRoot = path.join(workdir, 'package')

  const manifestPath = path.join(pkgRoot, 'package.json')
  check(fs.existsSync(manifestPath), 'package/package.json is missing')
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))

  check(
    manifest.name === sourceManifest.name,
    `name ${manifest.name} does not match source ${sourceManifest.name}`,
  )
  check(
    manifest.version === sourceManifest.version,
    `version ${manifest.version} does not match source ${sourceManifest.version}`,
  )
  check(manifest.main === 'index.js', `unexpected main ${manifest.main}`)

  // `files` must match the published manifest's expectations.
  check(
    Array.isArray(sourceManifest.files),
    'source package manifest has no files array',
  )
  for (const entry of sourceManifest.files ?? []) {
    if (entry.includes('*')) continue
    check(
      fs.existsSync(path.join(pkgRoot, entry)),
      `packaged file listed in source manifest is missing: ${entry}`,
    )
  }
  check(
    Array.isArray(manifest.files) &&
      manifest.files.includes('assets') &&
      manifest.files.includes('i18n'),
    'files must include assets and i18n',
  )
  check(
    manifest.poiPlugin && typeof manifest.poiPlugin.title === 'string',
    'poiPlugin metadata is missing',
  )

  for (const field of ['dependencies', 'optionalDependencies', 'peerDependencies']) {
    const deps = manifest[field] ?? {}
    check(
      !Object.keys(deps).some((name) => name.startsWith('@poi-plugins/')),
      `${field} must not reference the private shared package`,
    )
    check(
      !Object.values(deps).some(
        (value) => typeof value === 'string' && value.startsWith('workspace:'),
      ),
      `${field} must not reference workspace:`,
    )
  }

  const readmePath = path.join(pkgRoot, 'README.md')
  check(fs.existsSync(readmePath), 'package/README.md is missing')
  check(
    fs.existsSync(readmePath) &&
      fs.readFileSync(readmePath, 'utf8').trim().length > 0,
    'package/README.md is empty',
  )

  const entryPath = path.join(pkgRoot, manifest.main ?? 'index.js')
  check(fs.existsSync(entryPath), `compiled entry ${manifest.main} is missing`)
  const entry = fs.existsSync(entryPath) ? fs.readFileSync(entryPath, 'utf8') : ''

  for (const locale of ['en-US', 'ja-JP', 'ko-KR', 'zh-CN', 'zh-TW']) {
    const localePath = path.join(pkgRoot, 'i18n', `${locale}.json`)
    check(fs.existsSync(localePath), `i18n/${locale}.json is missing`)
    if (fs.existsSync(localePath)) {
      try {
        JSON.parse(fs.readFileSync(localePath, 'utf8'))
      } catch (error) {
        failures.push(`i18n/${locale}.json is not valid JSON: ${error.message}`)
      }
    }
  }
  for (const asset of ['1', '2', '3', '4']) {
    check(
      fs.existsSync(
        path.join(pkgRoot, 'assets', 'images', 'fleet', `${asset}.png`),
      ),
      `assets/images/fleet/${asset}.png is missing`,
    )
  }

  // The compiled entry must at least parse as CommonJS JavaScript.
  try {
    new vm.Script(entry, { filename: 'index.js' })
  } catch (error) {
    failures.push(`compiled entry is not valid JavaScript: ${error.message}`)
  }

  // The private shared package must be bundled, never a runtime dependency.
  check(
    !entry.includes('@poi-plugins/ship-info-shared'),
    'compiled entry still references the private shared package',
  )
  check(!entry.includes('workspace:'), 'compiled entry references workspace:')
  check(
    !entry.includes('/packages/shared'),
    'compiled entry references a sibling packages/shared path',
  )

  // poi injects these at runtime; they must stay external.
  const hostExternals = [
    'views/create-store',
    'views/env-parts/i18next',
    'views/utils/selectors',
    'views/components/etc/overlay',
    'react',
    'react-dom',
    'react-redux',
    '@blueprintjs/core',
    'styled-components',
    'electron',
  ]
  for (const id of hostExternals) {
    check(
      entry.includes(`require('${id}')`) || entry.includes(`require("${id}")`),
      `compiled entry should keep host external require('${id}')`,
    )
  }

  // The vendored capture renderer is planner-owned and bundled.
  check(
    !/require\(['"][^'"]*lib\/html2canvas['"]\)/.test(entry),
    'compiled entry must not require lib/html2canvas at runtime',
  )
} finally {
  fs.rmSync(workdir, { recursive: true, force: true })
}

if (failures.length > 0) {
  console.error(`Package verification FAILED for ${tarball}`)
  for (const failure of failures) console.error(` - ${failure}`)
  process.exit(1)
}

console.log(`Package verification passed: ${tarball}`)
