// Verifies the packed plugin tarballs: manifests, compiled entries, resources,
// bundled (not runtime) shared code, host externals, and a controlled
// load/register/lifecycle smoke against a real reducer-running host store with
// an isolated temp APPDATA (independently and both together).
//
// This is host-boundary/artifact verification, not a live poi installation.
//
//   node scripts/verify-package.mjs
//
// Verifies the newest matching tarball in .cache/packages for each plugin.

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire, isBuiltin } from 'node:module'
import vm from 'node:vm'

const repo = process.cwd()
const packageDir = path.join(repo, '.cache', 'packages')
const repoRequire = createRequire(import.meta.url)
const redux = repoRequire('redux')
const { JSDOM } = repoRequire('jsdom')

const PACKAGES = [
  { dir: 'packages/ship-info', name: 'poi-plugin-ship-info' },
  { dir: 'packages/navy-staff', name: 'poi-plugin-navy-staff' },
]

const failures = []
const check = (condition, message) => {
  if (!condition) failures.push(message)
}

const findTarball = (name) => {
  if (!fs.existsSync(packageDir)) {
    throw new Error(`no tarball directory: ${packageDir}`)
  }
  const candidates = fs
    .readdirSync(packageDir)
    .filter((f) => new RegExp(`^${name}-.*\\.tgz$`).test(f))
    .map((f) => ({ f, t: fs.statSync(path.join(packageDir, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t)
  if (candidates.length === 0) {
    throw new Error(`no ${name}-*.tgz in ${packageDir}`)
  }
  return path.join(packageDir, candidates[0].f)
}

const HOST_EXTERNALS_REQUIRED = [
  '@blueprintjs/core',
  'electron',
  'react',
  'react-redux',
  'styled-components',
]
const ALLOWED_VIEWS = [
  'views/components/etc/avatar',
  'views/components/etc/icon',
  'views/components/etc/overlay',
  'views/components/etc/window-env',
  'views/create-store',
  'views/env-parts/i18next',
  'views/utils/selectors',
  'views/utils/ship-img',
  'views/utils/tools',
]

const verifyPackage = (pkg) => {
  const sourceManifest = JSON.parse(
    fs.readFileSync(path.join(repo, pkg.dir, 'package.json'), 'utf8'),
  )
  const tarball = findTarball(pkg.name)
  const workdir = path.join(repo, '.cache', 'verify', pkg.name)
  fs.rmSync(workdir, { recursive: true, force: true })
  fs.mkdirSync(workdir, { recursive: true })
  execFileSync('tar', ['-xzf', tarball, '-C', workdir])
  const pkgRoot = path.join(workdir, 'package')
  const manifest = JSON.parse(
    fs.readFileSync(path.join(pkgRoot, 'package.json'), 'utf8'),
  )

  check(
    manifest.name === sourceManifest.name,
    `${pkg.name}: name ${manifest.name} != source ${sourceManifest.name}`,
  )
  check(
    manifest.version === sourceManifest.version,
    `${pkg.name}: version ${manifest.version} != source ${sourceManifest.version}`,
  )
  check(manifest.main === 'index.js', `${pkg.name}: main is not index.js`)
  check(
    typeof manifest.poiPlugin?.title === 'string' &&
      typeof manifest.poiPlugin?.icon === 'string' &&
      JSON.stringify(manifest.poiPlugin) ===
        JSON.stringify(sourceManifest.poiPlugin),
    `${pkg.name}: poi plugin metadata missing or changed`,
  )

  for (const field of [
    'dependencies',
    'optionalDependencies',
    'peerDependencies',
  ]) {
    const deps = manifest[field] ?? {}
    check(
      !Object.keys(deps).some(
        (n) => n.startsWith('@poi-plugins/') || n.startsWith('poi-plugin-'),
      ),
      `${pkg.name}: ${field} references a private/sibling plugin package`,
    )
    check(
      !Object.values(deps).some(
        (v) => typeof v === 'string' && v.startsWith('workspace:'),
      ),
      `${pkg.name}: ${field} references workspace:`,
    )
  }

  for (const entry of sourceManifest.files ?? []) {
    if (entry.includes('*')) continue
    check(
      fs.existsSync(path.join(pkgRoot, entry)),
      `${pkg.name}: packaged file missing: ${entry}`,
    )
    const source = path.join(repo, pkg.dir, entry)
    if (fs.statSync(source).isDirectory()) {
      for (const child of fs.readdirSync(source, { recursive: true })) {
        const sourceFile = path.join(source, child)
        if (!fs.statSync(sourceFile).isFile()) continue
        const packedFile = path.join(pkgRoot, entry, child)
        check(
          fs.existsSync(packedFile) &&
            fs.readFileSync(packedFile).equals(fs.readFileSync(sourceFile)),
          `${pkg.name}: packaged resource missing or changed: ${entry}/${child}`,
        )
      }
    }
  }
  check(
    fs.existsSync(path.join(pkgRoot, 'README.md')),
    `${pkg.name}: README.md missing`,
  )

  const entryPath = path.join(pkgRoot, manifest.main ?? 'index.js')
  const entry = fs.readFileSync(entryPath, 'utf8')
  try {
    new vm.Script(entry, { filename: 'index.js' })
  } catch (error) {
    failures.push(`${pkg.name}: entry not valid JavaScript: ${error.message}`)
  }

  for (const locale of ['en-US', 'ja-JP', 'ko-KR', 'zh-CN', 'zh-TW']) {
    const file = path.join(pkgRoot, 'i18n', `${locale}.json`)
    check(fs.existsSync(file), `${pkg.name}: i18n/${locale}.json missing`)
    if (fs.existsSync(file)) {
      try {
        const bundle = JSON.parse(fs.readFileSync(file, 'utf8'))
        check(
          Object.keys(bundle).length > 0,
          `${pkg.name}: i18n/${locale}.json is empty`,
        )
      } catch (error) {
        failures.push(
          `${pkg.name}: i18n/${locale}.json invalid: ${error.message}`,
        )
      }
    }
  }

  check(
    !entry.includes('@poi-plugins/ship-info-shared'),
    `${pkg.name}: entry references the private shared package`,
  )
  // A dependency specifier must not use the workspace: protocol after bundling.
  // Match only quoted specifiers so a minified object property like
  // `{ workspace: e }` is not mistaken for one.
  check(
    !/['"]workspace:/.test(entry),
    `${pkg.name}: entry references the workspace: protocol`,
  )
  check(
    !entry.includes('/packages/shared'),
    `${pkg.name}: entry references a sibling packages/shared path`,
  )

  const requires = [...entry.matchAll(/require\(['"]([^'"]+)['"]\)/g)].map(
    (m) => m[1],
  )
  for (const id of requires.filter((id) => id.startsWith('views/'))) {
    check(
      ALLOWED_VIEWS.includes(id),
      `${pkg.name}: unexpected host view require ${id}`,
    )
  }
  for (const id of HOST_EXTERNALS_REQUIRED) {
    check(requires.includes(id), `${pkg.name}: missing host external ${id}`)
  }

  return { entryPath, pkgRoot, exports: undefined }
}

// ---------------------------------------------------------------------------
// Controlled host + lifecycle smoke
// ---------------------------------------------------------------------------

// Host boundary modules the smoke supplies itself. Everything else bare must be
// either a Node builtin, a relative file inside the package, or one of the
// explicitly whitelisted real host libraries below.
const makeProxyStub = () => {
  let self
  const handler = {
    apply: () => makeProxyStub(),
    construct: () => makeProxyStub(),
    get: (target, prop) => {
      if (prop === '__esModule') return true
      if (prop === 'default') return self
      if (prop === Symbol.toPrimitive || prop === 'toString') return () => ''
      return makeProxyStub()
    },
  }
  self = new Proxy(function () {}, handler)
  return self
}

const HOST_STUB_IDS = [
  ...ALLOWED_VIEWS,
  'electron',
  'react-fontawesome',
  'wanakana',
  'redux-observers',
]
const REAL_HOST_MODULES = [
  '@blueprintjs/core',
  'i18next',
  'react',
  'react-dom',
  'react-dom/client',
  'react-dom/server',
  'react-i18next',
  'react-redux',
  'react/jsx-dev-runtime',
  'react/jsx-runtime',
  'styled-components',
]

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const waitFor = async (predicate, label, timeout = 5000) => {
  const start = Date.now()
  while (!predicate()) {
    if (Date.now() - start > timeout) throw new Error(`${label}: timed out`)
    // eslint-disable-next-line no-await-in-loop
    await sleep(10)
  }
}

const readJsonSafe = (file) => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return undefined
  }
}

// True when any workspace revision assigns `shipId` (legacy positional import).
const navyHasAssignment = (data, shipId) =>
  Array.isArray(data?.workspaces) &&
  data.workspaces.some((workspace) =>
    (workspace?.revisions ?? []).some((revision) =>
      Object.values(revision?.content?.assignments ?? {}).some(
        (ids) => Array.isArray(ids) && ids.includes(shipId),
      ),
    ),
  )

const navyHasWorkspace = (data, id) =>
  Array.isArray(data?.workspaces) &&
  data.workspaces.some((workspace) => workspace?.id === id)

// The host reports member id 101, so Navy Staff writes one account file there.
const navyAccountFile = (appdata) =>
  path.join(appdata, 'poi-plugin-navy-staff', '101.json')

const createHost = () => {
  const pluginReducers = {}
  const config = {}
  const rootReducer = (
    state = {
      config: {},
      ext: {},
      info: { basic: { api_member_id: '101' } },
    },
    action,
  ) => {
    if (action.type === 'TEST/SET_CONFIG') {
      return {
        ...state,
        config: { ...state.config, [action.path]: action.value },
      }
    }
    let changed = false
    let ext = state.ext
    for (const [key, reducer] of Object.entries(pluginReducers)) {
      const current = state.ext?.[key]?._
      const next = reducer(current, action)
      if (next !== current) {
        if (!changed) {
          ext = { ...state.ext }
          changed = true
        }
        ext[key] = { _: next }
      }
    }
    return changed ? { ...state, ext } : state
  }
  const store = redux.createStore(rootReducer)

  const window = Object.assign(
    new JSDOM('', { url: 'https://poi.test/' }).window,
    {
      APPDATA_PATH: '',
      ROOT: '',
      config: {
        get: (p, fallback) => (p in config ? config[p] : fallback),
        set: (p, value) => {
          config[p] = value
          store.dispatch({ type: 'TEST/SET_CONFIG', path: p, value })
        },
      },
      isMain: true,
      language: 'en-US',
    },
  )

  const stubs = {}
  for (const id of HOST_STUB_IDS) stubs[id] = makeProxyStub()
  stubs['views/utils/selectors'] = new Proxy(
    {
      // Real slice lookup so the lifecycle subscribes/writes the right slice.
      extensionSelectorFactory: (key) => (state) => state?.ext?.[key]?._ ?? {},
    },
    {
      // Other host selectors are only referenced (not invoked) during module
      // evaluation, so callable stubs are enough.
      get: (target, prop) =>
        Object.prototype.hasOwnProperty.call(target, prop)
          ? target[prop]
          : makeProxyStub(),
    },
  )
  stubs['views/env-parts/i18next'] = {
    __esModule: true,
    default: { getFixedT: () => (key) => key },
    getFixedT: () => (key) => key,
  }
  stubs['views/create-store'] = { store }

  return { config, pluginReducers, store, stubs, window }
}

const loadEntry = (entryPath, pkgRoot, host) => {
  // Use the real Node globals rather than reimplementing host APIs; the
  // explicit require whitelist is the isolation boundary.
  const sandboxProcess = Object.create(process)
  sandboxProcess.env = { ...process.env, NODE_ENV: 'production' }
  const module = { exports: {} }
  const sandbox = {
    Buffer,
    clearImmediate,
    clearInterval,
    clearTimeout,
    config: host.window.config,
    console,
    document: host.window.document,
    exports: module.exports,
    module,
    localStorage: { getItem: () => null },
    process: sandboxProcess,
    queueMicrotask,
    setImmediate,
    setInterval,
    setTimeout,
    TextDecoder,
    TextEncoder,
    URL,
    URLSearchParams,
    require: (id) => {
      if (isBuiltin(id)) return repoRequire(id)
      if (Object.prototype.hasOwnProperty.call(host.stubs, id)) {
        return host.stubs[id]
      }
      if (REAL_HOST_MODULES.includes(id)) {
        return repoRequire(id)
      }
      if (id.startsWith('.')) {
        const resolved = path.resolve(path.dirname(entryPath), id)
        if (!resolved.startsWith(pkgRoot + path.sep)) {
          throw new Error(`relative require escapes package: ${id}`)
        }
        return repoRequire(resolved)
      }
      throw new Error(`rejected require: ${id}`)
    },
    window: host.window,
  }
  sandbox.global = sandbox
  vm.createContext(sandbox)
  vm.runInContext(fs.readFileSync(entryPath, 'utf8'), sandbox, {
    filename: entryPath,
  })
  return module.exports
}

const loadBuilt = (pkg) => {
  const built = verifyPackage(pkg)
  built.name = pkg.name
  built.pluginKey = pkg.name
  return built
}

// A recognizable opaque legacy archive so the migration round-trip is checked
// without interpreting its contents.
const LEGACY_ARCHIVE = { opaque: 'legacy-archive-v1', keep: { nested: true } }

// A minimal, schema-consistent workspace for the real NAVY_ACTIONS.create
// action shape ({ type: `@@<key>@ws-create`, workspace }).
const makeNavyWorkspace = (marker) => {
  const now = new Date().toISOString()
  const areaId = `area-smoke-${marker}`
  return {
    createdAt: now,
    cursor: 0,
    id: `ws-smoke-${marker}`,
    revisions: [
      {
        content: {
          areas: [
            {
              capturedAt: now,
              color: '#8a9ba8',
              fleetLabels: {},
              id: areaId,
              label: `Area ${marker}`,
              tagSlot: 0,
            },
          ],
          assignments: { [areaId]: [marker] },
          name: `Smoke ${marker}`,
          ships: {},
        },
        id: `rev-smoke-${marker}`,
        op: { kind: 'create' },
        time: now,
      },
    ],
  }
}

// A plugin-specific change that forces a save. Each plugin ignores the other's
// action types; Navy uses its public workspace create action.
const forceSaveAction = (pluginKey, marker = 1) =>
  pluginKey === 'poi-plugin-navy-staff'
    ? { type: `@@${pluginKey}@ws-create`, workspace: makeNavyWorkspace(marker) }
    : {
        bookmark: `smoke-${marker}`,
        settings: {},
        type: `@@${pluginKey}@update`,
      }

const runScenario = async (name, selected, seedLegacy) => {
  const host = createHost()
  const appdata = fs.mkdtempSync(path.join(os.tmpdir(), 'poi-smoke-'))
  host.window.APPDATA_PATH = appdata
  host.window.ROOT = appdata

  const entries = selected.map((pkg) => ({
    ...pkg,
    exports: loadEntry(pkg.entryPath, pkg.pkgRoot, host),
  }))

  try {
    if (seedLegacy) {
      fs.writeFileSync(
        path.join(appdata, 'poi-plugin-ship-info.json'),
        JSON.stringify({
          bookmark: {},
          planner: { archive: LEGACY_ARCHIVE, current: [[5]] },
          ready: true,
          ui: {},
        }),
      )
    }

    for (const entry of entries) {
      for (const fn of [
        'reducer',
        'reactClass',
        'pluginDidLoad',
        'pluginWillUnload',
      ]) {
        check(
          typeof entry.exports[fn] === 'function',
          `${name}: ${entry.name} export ${fn} missing`,
        )
      }
      host.pluginReducers[entry.pluginKey] = entry.exports.reducer
    }

    for (const entry of entries) {
      await entry.exports.pluginDidLoad()
    }

    await waitFor(
      () =>
        entries.every((e) => host.store.getState().ext?.[e.pluginKey]?._.ready),
      `${name} ready`,
    )
    for (const entry of entries) {
      const slice = host.store.getState().ext[entry.pluginKey]._
      check(slice.error == null, `${name}: ${entry.name} error=${slice.error}`)
    }

    if (seedLegacy) {
      const navyFile = navyAccountFile(appdata)
      await waitFor(() => fs.existsSync(navyFile), `${name} navy file`)
      const migrated = readJsonSafe(navyFile)
      check(
        migrated?.version === 2,
        `${name}: migrated Navy file is not version 2 (${migrated?.version})`,
      )
      check(
        navyHasAssignment(migrated, 5),
        `${name}: Navy did not import the legacy assignment 5`,
      )
      check(
        JSON.stringify(migrated?.legacyArchive) ===
          JSON.stringify(LEGACY_ARCHIVE),
        `${name}: Navy did not preserve the opaque legacy archive`,
      )
    }

    for (const entry of entries) {
      host.store.dispatch(forceSaveAction(entry.pluginKey))
    }
    const files = {}
    for (const entry of entries) {
      const file =
        entry.pluginKey === 'poi-plugin-navy-staff'
          ? navyAccountFile(appdata)
          : path.join(appdata, `${entry.pluginKey}.json`)
      await waitFor(() => {
        const data = readJsonSafe(file)
        return entry.pluginKey === 'poi-plugin-navy-staff'
          ? data?.version === 2 && navyHasWorkspace(data, 'ws-smoke-1')
          : data?.bookmark?.['smoke-1']?.name === 'smoke-1'
      }, `${name} ${entry.name} saved`)
      files[entry.pluginKey] = file
    }
    if (seedLegacy) {
      const shipInfoData = readJsonSafe(files['poi-plugin-ship-info'])
      check(
        JSON.stringify(shipInfoData?.planner?.current) === '[[5]]',
        `${name}: Ship Info did not preserve the legacy plan`,
      )
      check(
        JSON.stringify(shipInfoData?.planner?.archive) ===
          JSON.stringify(LEGACY_ARCHIVE),
        `${name}: Ship Info did not preserve the legacy archive`,
      )
    }
    const snapshots = {}
    for (const [key, file] of Object.entries(files)) {
      // Navy Staff migrated to workspace file format 2; Ship Info stays at 1.
      const expectedVersion = key === 'poi-plugin-navy-staff' ? 2 : 1
      check(
        readJsonSafe(file)?.version === expectedVersion,
        `${name}: ${key} was not saved at file-format version ${expectedVersion}`,
      )
      snapshots[key] = fs.readFileSync(file, 'utf8')
    }

    for (const entry of entries) {
      entry.exports.pluginWillUnload()
    }
    for (const entry of entries) {
      host.store.dispatch(forceSaveAction(entry.pluginKey, 2))
    }
    await sleep(60)
    for (const [key, file] of Object.entries(files)) {
      check(
        fs.readFileSync(file, 'utf8') === snapshots[key],
        `${name}: ${key} wrote after unload`,
      )
    }
  } finally {
    for (const entry of entries) entry.exports.pluginWillUnload()
    host.window.close()
    fs.rmSync(appdata, { recursive: true, force: true })
  }
}

const main = async () => {
  const shipInfo = loadBuilt(PACKAGES[0])
  const navyStaff = loadBuilt(PACKAGES[1])

  await runScenario('ship-info only', [shipInfo], false)
  await runScenario('navy-staff only', [navyStaff], false)
  await runScenario('both', [shipInfo, navyStaff], true)

  if (failures.length > 0) {
    console.error('Package verification FAILED')
    for (const failure of failures) console.error(` - ${failure}`)
    process.exit(1)
  }
  console.log(
    `Package verification passed: ${PACKAGES.map((p) => p.name).join(', ')}`,
  )
}

main().catch((error) => {
  console.error('Package verification error:', error)
  process.exit(1)
})
