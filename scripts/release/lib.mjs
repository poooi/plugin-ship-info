import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export const PLAN_FILE = 'release-plan.json'
export const CHANGESET_DIR = '.changeset'
export const LEDGER_FILE = '.changeset/ledger.yaml'
export const RELEASE_BRANCH_PREFIX = 'release/'
export const BUMP_TYPES = ['none', 'patch', 'minor', 'major']

// The only publishable workspace packages. Shared code is bundled into these
// packages and never released on its own.
export const PLUGINS = Object.freeze({
  'ship-info': Object.freeze({
    dir: 'packages/ship-info',
    id: 'ship-info',
    name: 'poi-plugin-ship-info',
  }),
  'navy-staff': Object.freeze({
    dir: 'packages/navy-staff',
    id: 'navy-staff',
    name: 'poi-plugin-navy-staff',
  }),
})

export const PLUGIN_IDS = Object.freeze(['ship-info', 'navy-staff'])
export const PUBLISHED_NAMES = new Set(
  PLUGIN_IDS.map((id) => PLUGINS[id].name),
)

const BUILD_CONFIG_PATHS = new Set([
  '.node-version',
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'tsconfig.json',
])

export function normalizeRel(file) {
  return file.replaceAll('\\', '/')
}

export function parseSelection(value) {
  const selection = String(value ?? '')
  if (selection === 'both') return [...PLUGIN_IDS]
  if (PLUGIN_IDS.includes(selection)) return [selection]
  throw new Error(
    `unknown selection "${selection}" (expected ship-info, navy-staff, or both)`,
  )
}

export function expandSelection(selection) {
  if (Array.isArray(selection)) {
    const ids = selection.map((value) => String(value))
    if (
      ids.length === 0 ||
      new Set(ids).size !== ids.length ||
      !ids.every((id) => PLUGIN_IDS.includes(id)) ||
      ids.join(',') !== PLUGIN_IDS.filter((id) => ids.includes(id)).join(',')
    ) {
      throw new Error(`invalid release selection: ${JSON.stringify(selection)}`)
    }
    return ids
  }
  return parseSelection(selection)
}

export function releaseTag(name, version) {
  return `${name}@${version}`
}

export function parseVersion(value) {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(
    String(value),
  )
  if (!match) throw new Error(`invalid semver version: ${value}`)
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ?? null,
  }
}

export function compareVersions(left, right) {
  const a = parseVersion(left)
  const b = parseVersion(right)
  for (const key of ['major', 'minor', 'patch']) {
    if (a[key] !== b[key]) return a[key] < b[key] ? -1 : 1
  }
  if (a.prerelease === b.prerelease) return 0
  if (a.prerelease === null) return 1
  if (b.prerelease === null) return -1
  return a.prerelease < b.prerelease ? -1 : 1
}

export function isDocumentationOrTest(file) {
  const rel = normalizeRel(file)
  if (
    /^(docs|tests|stories|preview|shims|scripts|\.storybook|\.github)\//.test(
      rel,
    )
  ) {
    return true
  }
  if (
    /(^|\/)(docs|tests?|__tests__|__snapshots__|stories|preview)\//.test(rel)
  ) {
    return true
  }
  if (/\.(test|spec)\.[^/]+$/i.test(rel)) return true
  if (/\.(md|mdx|markdown)$/i.test(rel)) return true
  if (/(^|\/)(README|LICENSE|CHANGELOG)(\.[^/]*)?$/i.test(rel)) return true
  return false
}

// Classifies a repository-relative path. `both` means the change affects both
// plugins (shared code, build settings, dependency state).
export function classifyPath(file) {
  const rel = normalizeRel(file)
  if (rel === PLAN_FILE) return { kind: 'release-plan' }
  if (rel.startsWith(`${CHANGESET_DIR}/`)) return { kind: 'changeset' }
  if (isDocumentationOrTest(rel)) return { kind: 'exempt' }
  if (rel.startsWith('packages/shared/')) {
    return { kind: 'both', reason: 'shared package' }
  }
  for (const id of PLUGIN_IDS) {
    if (rel.startsWith(`${PLUGINS[id].dir}/`)) {
      return { kind: 'plugin', plugin: id }
    }
  }
  if (
    rel === 'build' ||
    rel.startsWith('build/') ||
    BUILD_CONFIG_PATHS.has(rel)
  ) {
    return { kind: 'both', reason: 'build or dependency configuration' }
  }
  return { kind: 'exempt' }
}

export function affectedPluginsForChanges(files) {
  const affected = new Set()
  for (const file of files) {
    const paths =
      typeof file === 'string'
        ? [file]
        : [file.path, file.from].filter((value) => typeof value === 'string')
    for (const filePath of paths) {
      const verdict = classifyPath(filePath)
      if (verdict.kind === 'plugin') affected.add(verdict.plugin)
      if (verdict.kind === 'both') {
        for (const id of PLUGIN_IDS) affected.add(id)
      }
    }
  }
  return PLUGIN_IDS.filter((id) => affected.has(id))
}

export function parseIntent(source, file = '<intent>') {
  const text = String(source)
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
  const lines = text.split('\n')
  if (lines[0]?.trim() !== '---') {
    throw new Error(`${file}: missing changeset frontmatter opening ---`)
  }
  let close = -1
  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index].trim() === '---') {
      close = index
      break
    }
  }
  if (close < 0) {
    throw new Error(`${file}: missing changeset frontmatter closing ---`)
  }

  const packages = {}
  for (let index = 1; index < close; index += 1) {
    const line = lines[index].trim()
    if (!line || line.startsWith('#')) continue
    const match =
      /^(?:"([^"]+)"|'([^']+)'|([^:\s][^:]*?))\s*:\s*(\S+)\s*$/.exec(line)
    if (!match) throw new Error(`${file}: malformed intent entry: ${line}`)
    const name = (match[1] ?? match[2] ?? match[3]).trim()
    const bump = match[4]
    if (!BUMP_TYPES.includes(bump)) {
      throw new Error(`${file}: invalid bump type "${bump}" for ${name}`)
    }
    if (Object.hasOwn(packages, name)) {
      throw new Error(`${file}: duplicate package entry for ${name}`)
    }
    if (!PUBLISHED_NAMES.has(name)) {
      throw new Error(
        `${file}: unknown or non-publishable package "${name}"; name the ` +
          'published plugin package instead',
      )
    }
    packages[name] = bump
  }
  if (Object.keys(packages).length === 0) {
    throw new Error(`${file}: intent names no packages`)
  }

  const summary = lines.slice(close + 1).join('\n').trim()
  if (!summary) {
    throw new Error(`${file}: intent summary must not be empty`)
  }
  return { packages, summary }
}

// `intents` contains already-parsed new intent files:
// [{path, packages, summary}].
export function evaluateIntentCoverage({ changedFiles, intents }) {
  const affected = affectedPluginsForChanges(changedFiles)
  const errors = []
  const accepted = []
  for (const id of affected) {
    const name = PLUGINS[id].name
    const matching = intents.filter((intent) =>
      Object.hasOwn(intent.packages, name),
    )
    if (matching.length === 0) {
      errors.push(
        `${name} runtime or packaging files changed but no new .changeset ` +
          `intent covers it (add one, or record "${name}: none" with an ` +
          'explanation)',
      )
      continue
    }
    const released = matching.find((intent) => intent.packages[name] !== 'none')
    accepted.push({
      bump: released ? released.packages[name] : 'none',
      intent: (released ?? matching[0]).path,
      name,
      none: !released,
    })
  }
  return { accepted, affected, errors }
}

export function runGit(repo, args, options = {}) {
  return execFileSync('git', args, {
    cwd: repo,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  }).trimEnd()
}

export function tryGit(repo, args, options = {}) {
  const result = spawnSync('git', args, {
    cwd: repo,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  })
  return result.status === 0 ? result.stdout.trimEnd() : null
}

export function gitFile(repo, rev, rel) {
  const result = spawnSync('git', ['show', `${rev}:${normalizeRel(rel)}`], {
    cwd: repo,
    encoding: 'buffer',
    maxBuffer: 32 * 1024 * 1024,
  })
  return result.status === 0 ? result.stdout : null
}

export function readJsonFile(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

export function readManifest(repo, dir) {
  return readJsonFile(path.join(repo, dir, 'package.json'))
}

export function manifestAt(repo, rev, dir) {
  const raw = gitFile(repo, rev, `${dir}/package.json`)
  return raw === null ? null : JSON.parse(raw.toString('utf8'))
}

function parseDiffRecords(output) {
  const text = output.endsWith('\n') ? output.slice(0, -1) : output
  const tokens = text.split('\0')
  const records = []
  for (let index = 0; index < tokens.length; ) {
    const status = tokens[index]
    index += 1
    if (!status) continue
    if (status[0] === 'R' || status[0] === 'C') {
      const from = normalizeRel(tokens[index])
      const to = normalizeRel(tokens[index + 1])
      index += 2
      records.push({ from, path: to, status: status[0] })
      continue
    }
    const file = tokens[index]
    index += 1
    records.push({ path: normalizeRel(file), status: status[0] })
  }
  return records
}

export function diffFiles(repo, base, head, { threeDot = false } = {}) {
  const range = threeDot ? `${base}...${head}` : `${base}..${head}`
  return parseDiffRecords(
    runGit(repo, [
      'diff',
      '--name-status',
      '-z',
      '--find-renames=50%',
      range,
    ]),
  )
}

export function workingTreeChanges(repo) {
  const output = runGit(repo, [
    'status',
    '--porcelain=v1',
    '-z',
    '--untracked-files=all',
  ])
  const text = output.endsWith('\n') ? output.slice(0, -1) : output
  const tokens = text.split('\0')
  const records = []
  for (let index = 0; index < tokens.length; ) {
    const token = tokens[index]
    index += 1
    if (!token) continue
    const x = token[0]
    const y = token[1]
    const file = normalizeRel(token.slice(3))
    if (x === 'R' || x === 'C' || y === 'R' || y === 'C') {
      const from = normalizeRel(tokens[index])
      index += 1
      records.push({ from, path: file, status: 'R' })
    } else if (x === '?' || x === 'A') {
      records.push({ path: file, status: 'A' })
    } else if (x === 'D' || y === 'D') {
      records.push({ path: file, status: 'D' })
    } else {
      records.push({ path: file, status: 'M' })
    }
  }
  return records
}

export function assertClean(repo) {
  const changes = workingTreeChanges(repo)
  if (changes.length > 0) {
    throw new Error(
      `working tree must be clean before releasing:\n${changes
        .map((change) => `  ${change.status} ${change.path}`)
        .join('\n')}`,
    )
  }
}

const quoteCmdArg = (arg) => {
  if (arg === '') return '""'
  if (/^[A-Za-z0-9_./:=@+-]+$/.test(arg)) return arg
  return `"${arg.replace(/(["^&|<>])/g, '^$1')}"`
}

export function runPnpm(args, cwd) {
  const windows = process.platform === 'win32'
  const result = spawnSync(
    windows ? (process.env.ComSpec ?? 'cmd.exe') : 'pnpm',
    windows
      ? [
          '/d',
          '/s',
          '/c',
          ['pnpm', ...args].map(quoteCmdArg).join(' '),
        ]
      : args,
    {
      cwd,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsVerbatimArguments: windows,
    },
  )
  if (result.status !== 0) {
    throw new Error(
      `pnpm ${args.join(' ')} failed in ${cwd}\n` +
        `${result.stdout ?? ''}${result.stderr ?? ''}`.trim(),
    )
  }
  return `${result.stdout ?? ''}${result.stderr ?? ''}`.trim()
}

export function pnpmVersionSelection(repo, selection) {
  const ids = expandSelection(selection)
  const filters = ids.flatMap((id) => ['--filter', PLUGINS[id].name])
  return runPnpm([...filters, 'version', '-r'], repo)
}

export function readSelectedVersions(repo, selection) {
  return Object.fromEntries(
    expandSelection(selection).map((id) => [
      PLUGINS[id].name,
      readManifest(repo, PLUGINS[id].dir).version,
    ]),
  )
}

// Narrows a requested selection to the packages pnpm actually bumped. A
// selection such as `both` must not create a Release PR that claims an
// unchanged package.
export function resolveChangedSelection(repo, selection, baseVersions) {
  return expandSelection(selection).filter((id) => {
    const name = PLUGINS[id].name
    return (
      Object.hasOwn(baseVersions, name) &&
      readManifest(repo, PLUGINS[id].dir).version !== baseVersions[name]
    )
  })
}

// Intent ids already consumed in a pnpm ledger. pnpm ignores an intent whose id
// is already recorded, so reusing a consumed filename would silently skip the
// new change. Detection uses repository history instead of parsing the ledger,
// because pnpm may quote numeric or spaced intent ids in YAML.
export function intentPathInHistory(repo, base, file) {
  return runGit(repo, [
    '--literal-pathspecs', 'log', '-1', '--format=%H', base, '--', file,
  ]) !== ''
}

export function tarballDigest(tarball) {
  const data = fs.readFileSync(tarball)
  return {
    integrity: `sha512-${createHash('sha512').update(data).digest('base64')}`,
    shasum: createHash('sha1').update(data).digest('hex'),
  }
}

// A retried older release must never move the npm `latest` dist-tag backwards.
export function publishTagFor(version, latest) {
  if (!latest) return 'latest'
  return compareVersions(version, latest) < 0 ? 'previous' : 'latest'
}

export function commitReleasePlan({ branch, message, plan, repo }) {
  if (!branch) throw new Error('release branch name is required')
  if (tryGit(repo, ['rev-parse', '--verify', `refs/heads/${branch}`]) !== null) {
    throw new Error(`release branch already exists: ${branch}`)
  }
  runGit(repo, ['checkout', '-b', branch])
  fs.writeFileSync(
    path.join(repo, PLAN_FILE),
    `${JSON.stringify(plan, null, 2)}\n`,
  )
  runGit(repo, ['add', '-A'])
  runGit(repo, ['commit', '--no-verify', '-m', message])
  return runGit(repo, ['rev-parse', 'HEAD'])
}

export function sortedChanges(changes) {
  return [...changes].sort((left, right) =>
    left.path < right.path ? -1 : left.path > right.path ? 1 : 0,
  )
}

export function createReleasePlan({
  baseCommit,
  baseVersions,
  changes,
  repo,
  selection,
}) {
  const ids = expandSelection(selection)
  const sorted = sortedChanges(changes)
  const releases = ids.map((id) => {
    const plugin = PLUGINS[id]
    const from = baseVersions[plugin.name]
    const to = readManifest(repo, plugin.dir).version
    return {
      dir: plugin.dir,
      from,
      id,
      name: plugin.name,
      tag: releaseTag(plugin.name, to),
      to,
    }
  })
  return {
    base: {
      commit: baseCommit,
      packages: Object.fromEntries(
        ids.map((id) => [PLUGINS[id].name, baseVersions[PLUGINS[id].name]]),
      ),
    },
    files: sorted.map(({ path: file, status }) => ({ path: file, status })),
    releases,
    schemaVersion: 1,
    selection: ids,
  }
}

function assertObject(value, label) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`)
  }
}

function assertExactKeys(value, keys, label) {
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  if (actual.join(',') !== expected.join(',')) {
    throw new Error(
      `${label} has unexpected keys: ${actual.join(', ')} (expected ${expected.join(', ')})`,
    )
  }
}

export function validatePlanShape(plan) {
  assertObject(plan, 'release plan')
  assertExactKeys(
    plan,
    ['base', 'files', 'releases', 'schemaVersion', 'selection'],
    'release plan',
  )
  if (plan.schemaVersion !== 1) {
    throw new Error(`unsupported release plan schema: ${plan.schemaVersion}`)
  }

  const selection = expandSelection(plan.selection)
  if (
    selection.length !== plan.selection.length ||
    selection.some((id, index) => id !== plan.selection[index])
  ) {
    throw new Error('release plan selection is not in canonical order')
  }

  assertObject(plan.base, 'release plan base')
  assertExactKeys(plan.base, ['commit', 'packages'], 'release plan base')
  if (!/^[0-9a-f]{40}([0-9a-f]{24})?$/i.test(plan.base.commit)) {
    throw new Error('release plan base commit must be a full git object id')
  }
  assertObject(plan.base.packages, 'release plan base packages')
  const expectedNames = selection.map((id) => PLUGINS[id].name).sort()
  assertExactKeys(
    plan.base.packages,
    expectedNames,
    'release plan base packages',
  )
  for (const name of expectedNames) parseVersion(plan.base.packages[name])

  if (!Array.isArray(plan.releases) || plan.releases.length !== selection.length) {
    throw new Error('release plan releases do not match the selection')
  }
  for (const [index, release] of plan.releases.entries()) {
    assertObject(release, 'release plan entry')
    assertExactKeys(
      release,
      ['dir', 'from', 'id', 'name', 'tag', 'to'],
      'release plan entry',
    )
    const id = selection[index]
    const plugin = PLUGINS[id]
    if (
      release.id !== id ||
      release.name !== plugin.name ||
      release.dir !== plugin.dir
    ) {
      throw new Error(
        `release plan entry ${index} does not match ${plugin.name}`,
      )
    }
    if (compareVersions(release.from, release.to) >= 0) {
      throw new Error(
        `${release.name}: release version ${release.to} must be greater than ` +
          `base version ${release.from}`,
      )
    }
    if (plan.base.packages[release.name] !== release.from) {
      throw new Error(
        `${release.name}: plan base version ${plan.base.packages[release.name]} ` +
          `does not match release from ${release.from}`,
      )
    }
    if (release.tag !== releaseTag(release.name, release.to)) {
      throw new Error(`${release.name}: invalid release tag ${release.tag}`)
    }
  }

  if (!Array.isArray(plan.files)) {
    throw new Error('release plan files must be an array')
  }
  const seen = new Set()
  for (const entry of plan.files) {
    assertObject(entry, 'release plan file entry')
    assertExactKeys(entry, ['path', 'status'], 'release plan file entry')
    if (!['A', 'M', 'D'].includes(entry.status)) {
      throw new Error(`release plan file status is invalid: ${entry.status}`)
    }
    const file = normalizeRel(entry.path)
    if (
      !file ||
      path.posix.isAbsolute(file) ||
      file === '..' ||
      file.startsWith('../')
    ) {
      throw new Error(`release plan file path is not repository-relative: ${file}`)
    }
    if (file === PLAN_FILE) {
      throw new Error('release plan must not list itself as a generated file')
    }
    if (seen.has(file)) {
      throw new Error(`duplicate release plan file: ${file}`)
    }
    seen.add(file)
  }
  const paths = plan.files.map((entry) => normalizeRel(entry.path))
  if (paths.join('\n') !== [...paths].sort().join('\n')) {
    throw new Error('release plan files are not sorted by path')
  }
  return plan
}

export function parseReleasePlan(source, file = PLAN_FILE) {
  let parsed
  try {
    parsed = JSON.parse(source)
  } catch (error) {
    throw new Error(`${file}: invalid JSON: ${error.message}`)
  }
  return validatePlanShape(parsed)
}

export function changelogSection(source, version) {
  const lines = String(source).replace(/\r\n?/g, '\n').split('\n')
  const start = lines.findIndex((line) => line.trim() === `## ${version}`)
  if (start < 0) return null
  let end = lines.length
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^##\s+/.test(lines[index])) {
      end = index
      break
    }
  }
  return `${lines.slice(start + 1, end).join('\n').trim()}\n`
}

function comparableChanges(changes) {
  return sortedChanges(changes).map((change) =>
    change.status === 'R'
      ? { from: change.from, path: change.path, status: 'R' }
      : { path: change.path, status: change.status },
  )
}

function describeChange(change) {
  return `${change.status} ${change.path}${change.from ? ` (from ${change.from})` : ''}`
}

function assertSameChanges(actual, expected, label) {
  const left = comparableChanges(actual)
  const right = comparableChanges(expected)
  if (JSON.stringify(left) === JSON.stringify(right)) return
  const actualLines = left.map(describeChange)
  const expectedLines = right.map(describeChange)
  throw new Error(
    `${label} does not match the generated release plan.\n` +
      `expected:\n${expectedLines.map((line) => `  ${line}`).join('\n')}\n` +
      `actual:\n${actualLines.map((line) => `  ${line}`).join('\n')}`,
  )
}

function assertSameFile(repo, rev, file, expectedContent, label) {
  const actual = gitFile(repo, rev, file)
  if (expectedContent === null) {
    if (actual !== null) throw new Error(`${label}: ${file} should be deleted`)
    return
  }
  if (actual === null) throw new Error(`${label}: ${file} is missing`)
  if (!actual.equals(expectedContent)) {
    throw new Error(`${label}: ${file} content was edited by hand`)
  }
}

function assertManifestVersion(repo, rev, dir, version, label) {
  const manifest = manifestAt(repo, rev, dir)
  if (!manifest) throw new Error(`${label}: ${dir}/package.json is missing`)
  if (manifest.version !== version) {
    throw new Error(
      `${label}: ${dir}/package.json version ${manifest.version} != ${version}`,
    )
  }
  return manifest
}

// Recomputes the release with pnpm in a detached worktree at the plan base and
// compares the result with the Release PR. Only generated files are accepted.
export function validateReleasePr({ base, head, repo, target = null }) {
  if (!base || !head) throw new Error('base and head commits are required')
  if (tryGit(repo, ['cat-file', '-e', `${base}^{commit}`]) === null) {
    throw new Error(`base commit is unavailable: ${base}`)
  }
  if (tryGit(repo, ['cat-file', '-e', `${head}^{commit}`]) === null) {
    throw new Error(`head commit is unavailable: ${head}`)
  }
  if (tryGit(repo, ['merge-base', '--is-ancestor', base, head]) === null) {
    throw new Error(`base ${base} is not an ancestor of head ${head}`)
  }

  const planSource = gitFile(repo, head, PLAN_FILE)
  if (planSource === null) {
    throw new Error(`Release PR is missing ${PLAN_FILE}`)
  }
  const plan = parseReleasePlan(planSource.toString('utf8'))
  if (plan.base.commit !== base) {
    throw new Error(
      `release plan is bound to base ${plan.base.commit}, but this PR targets ` +
        `${base}. The base advanced; close the PR and rerun Prepare release.`,
    )
  }

  const headChanges = diffFiles(repo, base, head)
  const planFileChange = headChanges.find(
    (change) => change.path === PLAN_FILE,
  )
  if (!planFileChange || !['A', 'M'].includes(planFileChange.status)) {
    throw new Error(`${PLAN_FILE} must be added or updated by the Release PR`)
  }
  const generatedHeadChanges = headChanges.filter(
    (change) => change.path !== PLAN_FILE,
  )
  assertSameChanges(generatedHeadChanges, plan.files, 'Release PR diff')

  const tempRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'release-validate-'),
  )
  const worktree = path.join(tempRoot, 'tree')
  try {
    runGit(repo, ['worktree', 'add', '--detach', worktree, base])
    pnpmVersionSelection(worktree, plan.selection)
    const expectedChanges = workingTreeChanges(worktree)
    assertSameChanges(expectedChanges, plan.files, 'pnpm release plan')
    assertSameChanges(generatedHeadChanges, expectedChanges, 'Release PR diff')

    for (const release of plan.releases) {
      const baseManifest = assertManifestVersion(
        repo,
        base,
        release.dir,
        release.from,
        'base manifest',
      )
      assertManifestVersion(
        repo,
        head,
        release.dir,
        release.to,
        'head manifest',
      )
      const generatedManifest = readManifest(worktree, release.dir)
      if (generatedManifest.version !== release.to) {
        throw new Error(
          `pnpm manifest: ${release.dir}/package.json version ` +
            `${generatedManifest.version} != ${release.to}`,
        )
      }
      if (baseManifest.name !== release.name) {
        throw new Error(
          `base manifest ${release.dir} is ${baseManifest.name}, not ${release.name}`,
        )
      }
      if (
        plan.base.packages[release.name] !== baseManifest.version
      ) {
        throw new Error(
          `${release.name}: plan base version does not match the base manifest`,
        )
      }
    }

    for (const change of expectedChanges) {
      const expectedContent =
        change.status === 'D'
          ? null
          : fs.readFileSync(path.join(worktree, change.path))
      assertSameFile(
        repo,
        head,
        change.path,
        expectedContent,
        'Release PR',
      )
    }

    if (target) {
      if (tryGit(repo, ['cat-file', '-e', `${target}^{commit}`]) === null) {
        throw new Error(`release target commit is unavailable: ${target}`)
      }
      if (
        tryGit(repo, ['merge-base', '--is-ancestor', base, target]) === null
      ) {
        throw new Error(`release target ${target} is not a descendant of base`)
      }
      const targetChanges = diffFiles(repo, base, target)
      const targetPlan = targetChanges.find(
        (change) => change.path === PLAN_FILE,
      )
      if (!targetPlan || !['A', 'M'].includes(targetPlan.status)) {
        throw new Error(`${PLAN_FILE} is missing from release target`)
      }
      const targetGenerated = targetChanges.filter(
        (change) => change.path !== PLAN_FILE,
      )
      assertSameChanges(targetGenerated, plan.files, 'merged release diff')
      for (const change of plan.files) {
        assertSameFile(
          repo,
          target,
          change.path,
          change.status === 'D'
            ? null
            : gitFile(repo, head, change.path),
          'merged release',
        )
      }
      const targetPlanContent = gitFile(repo, target, PLAN_FILE)
      if (
        !targetPlanContent ||
        !targetPlanContent.equals(planSource)
      ) {
        throw new Error('merged release plan differs from the validated plan')
      }
      for (const release of plan.releases) {
        assertManifestVersion(
          repo,
          target,
          release.dir,
          release.to,
          'merged manifest',
        )
      }
    }

    return { plan }
  } finally {
    tryGit(repo, ['worktree', 'remove', '--force', worktree])
    fs.rmSync(tempRoot, { recursive: true, force: true })
  }
}

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504])

async function fetchPackument({
  attempts = 4,
  fetchImpl = globalThis.fetch,
  name,
  registry = 'https://registry.npmjs.org',
  sleep = defaultSleep,
  timeoutMs = 30_000,
}) {
  const url = `${registry.replace(/\/+$/, '')}/${encodeURIComponent(name)}`
  let lastError
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)
      let response
      try {
        response = await fetchImpl(url, {
          headers: { accept: 'application/json' },
          signal: controller.signal,
        })
      } finally {
        clearTimeout(timer)
      }
      if (response.status === 404) return null
      if (!response.ok) {
        const error = new Error(
          `registry lookup for ${name} returned HTTP ${response.status}`,
        )
        if (RETRYABLE_STATUS.has(response.status) && attempt < attempts) {
          lastError = error
          await sleep(500 * 2 ** (attempt - 1))
          continue
        }
        throw error
      }
      return await response.json()
    } catch (error) {
      lastError = error
      if (error?.name === 'AbortError' || attempt >= attempts) break
      await sleep(500 * 2 ** (attempt - 1))
    }
  }
  throw new Error(
    `registry lookup for ${name} failed; refusing to assume anything about ` +
      `the published versions: ${lastError?.message ?? lastError}`,
  )
}

export async function registryVersionState(options) {
  const body = await fetchPackument(options)
  if (!body) return 'absent'
  const versions = body?.versions
  return versions &&
    typeof versions === 'object' &&
    Object.hasOwn(versions, options.version)
    ? 'present'
    : 'absent'
}

// Returns the exact published version metadata, including the registry's own
// integrity hashes, so a retry can prove it is looking at the artifact this
// run verified instead of merely trusting the version number.
export async function registryVersionMetadata(options) {
  const body = await fetchPackument(options)
  if (!body) return { state: 'absent' }
  const version = body?.versions?.[options.version]
  if (!version) return { state: 'absent' }
  const dist = version.dist ?? {}
  return {
    integrity: typeof dist.integrity === 'string' ? dist.integrity : null,
    shasum: typeof dist.shasum === 'string' ? dist.shasum : null,
    state: 'present',
    tarball: typeof dist.tarball === 'string' ? dist.tarball : null,
  }
}

export async function registryLatestVersion(options) {
  const body = await fetchPackument(options)
  const latest = body?.['dist-tags']?.latest
  return typeof latest === 'string' ? latest : null
}

export function assertTarballMatchesRegistry(tarball, metadata) {
  if (metadata.state !== 'present') {
    throw new Error(`registry metadata is not present for ${tarball}`)
  }
  const digest = tarballDigest(tarball)
  if (metadata.integrity) {
    if (metadata.integrity !== digest.integrity) {
      throw new Error(
        `registry integrity ${metadata.integrity} does not match verified ` +
          `tarball ${tarball} (${digest.integrity})`,
      )
    }
    return
  }
  if (metadata.shasum) {
    if (metadata.shasum !== digest.shasum) {
      throw new Error(
        `registry shasum ${metadata.shasum} does not match verified tarball ` +
          `${tarball} (${digest.shasum})`,
      )
    }
    return
  }
  throw new Error(
    `registry returned no integrity for ${tarball}; refusing to treat the ` +
      'version as already published',
  )
}

// Release ordering used by the publish script. All registry metadata and local
// artifacts are checked before any package is published so a registry error
// cannot leave a partially published release. An existing exact version must
// match the verified tarball integrity before it is skipped or treated as a
// successful recovery.
export async function publishSelected({
  artifactsDir,
  changelogFor,
  ensureRelease,
  ensureTag,
  log = () => {},
  publish,
  registryMetadata,
  releases,
  target,
}) {
  if (!releases.length) throw new Error('release plan has no packages')
  if (!target) throw new Error('release target commit is required')
  if (typeof registryMetadata !== 'function') {
    throw new Error('registryMetadata is required to verify published artifacts')
  }

  const prepared = []
  for (const release of releases) {
    const tarball = path.join(
      artifactsDir,
      `${release.name}-${release.to}.tgz`,
    )
    if (!fs.existsSync(tarball)) {
      throw new Error(`missing release tarball: ${tarball}`)
    }
    const notes = changelogFor(release)
    if (!notes || !notes.trim()) {
      throw new Error(
        `${release.name}: missing CHANGELOG.md section for ${release.to}`,
      )
    }
    const metadata = await registryMetadata(release.name, release.to)
    if (metadata.state === 'present') {
      assertTarballMatchesRegistry(tarball, metadata)
    }
    prepared.push({ metadata, notes, release, tarball })
  }

  const results = []
  for (const item of prepared) {
    const { notes, release, tarball } = item
    let published = false
    if (item.metadata.state === 'absent') {
      try {
        await publish(release, tarball)
      } catch (error) {
        // The registry may have accepted the upload before the client failed.
        // Re-check the exact version and its integrity; only then is the
        // failure recoverable.
        const after = await registryMetadata(release.name, release.to)
        if (after.state !== 'present') throw error
        assertTarballMatchesRegistry(tarball, after)
      }
      const after = await registryMetadata(release.name, release.to)
      if (after.state !== 'present') {
        throw new Error(
          `${release.name}@${release.to} is still absent after publish`,
        )
      }
      assertTarballMatchesRegistry(tarball, after)
      published = true
      log(`published ${release.name}@${release.to}`)
    } else {
      log(
        `${release.name}@${release.to} is already published; ` +
          'finishing tags and release notes',
      )
    }

    await ensureTag(release, target)
    await ensureRelease(release, notes)
    results.push({ published, release })
  }
  return results
}

// Creates the annotated tag for a release, refusing to move an existing tag
// that points somewhere else. With `push` false (tests, local dry runs) only
// the local tag is created.
export function ensureReleaseTag({ push = true, release, repo, target }) {
  const tag = release.tag
  const local = tryGit(repo, ['rev-parse', '--verify', `refs/tags/${tag}`])
  let remote = null
  if (push) {
    remote = runGit(repo, [
      'ls-remote',
      '--tags',
      'origin',
      `refs/tags/${tag}`,
    ])
  }

  if (local) {
    const pointedAt = runGit(repo, ['rev-list', '-n', '1', tag])
    if (pointedAt !== target) {
      throw new Error(
        `${tag} already exists at ${pointedAt}, not release commit ${target}; ` +
          'refusing to move a published tag',
      )
    }
  } else if (remote) {
    runGit(repo, ['fetch', 'origin', `refs/tags/${tag}:refs/tags/${tag}`])
    const pointedAt = runGit(repo, ['rev-list', '-n', '1', tag])
    if (pointedAt !== target) {
      throw new Error(
        `${tag} exists remotely at ${pointedAt}, not ${target}; ` +
          'refusing to move a published tag',
      )
    }
  } else {
    runGit(repo, [
      'tag',
      '-a',
      tag,
      target,
      '-m',
      `${release.name} ${release.to}`,
    ])
  }

  if (!push) return
  if (remote) return
  try {
    runGit(repo, ['push', 'origin', `refs/tags/${tag}`])
  } catch (error) {
    // A retry may race with the first run after the registry accepted the
    // upload. Fetch and verify instead of overwriting the tag.
    runGit(repo, [
      'fetch',
      'origin',
      `+refs/tags/${tag}:refs/tags/${tag}`,
    ])
    const pointedAt = runGit(repo, ['rev-list', '-n', '1', tag])
    if (pointedAt !== target) throw error
  }
}
