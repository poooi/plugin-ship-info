import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterEach, describe, expect, it } from 'vitest'

import {
  changelogSection,
  commitReleasePlan,
  createReleasePlan,
  pnpmLaneVersionSelection,
  readManifest,
  readSelectedVersions,
  runGit,
  runPnpm,
  validateReleasePr,
  workingTreeChanges,
} from '../scripts/release/lib.mjs'

const registryFixture = fileURLToPath(
  new URL('./fixtures/release-registry.mjs', import.meta.url),
)

const SHIP = 'poi-plugin-ship-info'
const NAVY = 'poi-plugin-navy-staff'

const roots: string[] = []
const servers: Array<ReturnType<typeof spawn>> = []

afterEach(() => {
  for (const server of servers.splice(0)) server.kill()
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

const write = (file: string, contents: string) => {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, contents)
}

// Immutable packument: it lists every version the sequence can reach, so no
// cache/staleness can affect native lane math (each step is "published").
const PUBLISHED = {
  [SHIP]: {
    '1.0.0': true,
    '1.0.1': true,
    '1.0.1-beta.0': true,
    '1.0.1-beta.1': true,
  },
  [NAVY]: { '1.0.0': true, '1.0.1': true, '1.0.1-beta.0': true },
  latest: { [SHIP]: '1.0.0', [NAVY]: '1.0.0' },
}

const startRegistry = () =>
  new Promise<number>((resolve, reject) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'release-registry-'))
    roots.push(dir)
    const dataFile = path.join(dir, 'published.json')
    fs.writeFileSync(dataFile, JSON.stringify(PUBLISHED))
    const server = spawn(process.execPath, [registryFixture, dataFile, '0'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    servers.push(server)
    let settled = false
    server.stdout.on('data', (chunk: Buffer) => {
      const match = /ready (\d+)/.exec(chunk.toString())
      if (match && !settled) {
        settled = true
        resolve(Number(match[1]))
      }
    })
    server.on('exit', (code) => {
      if (!settled) reject(new Error(`registry exited early (${code})`))
    })
    server.on('error', (error) => {
      if (!settled) reject(error)
    })
  })

const makeRepo = (port: number) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'release-lane-'))
  roots.push(root)
  write(
    path.join(root, 'package.json'),
    JSON.stringify({
      name: 'lane-fixture',
      packageManager: 'pnpm@11.20.0',
      private: true,
      version: '0.0.0',
    }),
  )
  write(
    path.join(root, 'pnpm-workspace.yaml'),
    [
      'packages:',
      '  - packages/*',
      'versioning:',
      '  changelog:',
      '    storage: repository',
      '',
    ].join('\n'),
  )
  write(path.join(root, '.npmrc'), `registry=http://127.0.0.1:${port}/\n`)
  for (const [dir, name] of [
    ['ship-info', SHIP],
    ['navy-staff', NAVY],
  ]) {
    write(
      path.join(root, `packages/${dir}/package.json`),
      JSON.stringify({ name, version: '1.0.0', private: true }),
    )
  }
  // Create the lockfile once, before any lane transition, and commit it as the
  // base. Later checks use only --frozen-lockfile so a masked install cannot
  // hide a workspace-config regression.
  runPnpm(['install'], root)
  runGit(root, ['init', '-q'])
  runGit(root, ['config', 'user.name', 'Release Test'])
  runGit(root, ['config', 'user.email', 'release-test@example.invalid'])
  runGit(root, ['add', '-A'])
  runGit(root, ['commit', '-q', '-m', 'base'])
  return root
}

const intent = (root: string, plugin: string, bump: string, label: string) => {
  const file = path.join(
    root,
    `.changeset/${plugin}-${bump}-${Date.now()}-${Math.random()}.md`,
  )
  write(file, `---\n"poi-plugin-${plugin}": ${bump}\n---\n\n${label}\n`)
  return file
}

// Commits any pending intents into the base, generates once with native lanes,
// builds/commits the plan and validates that the base recompute matches.
const prepareFixtureRelease = (
  root: string,
  channel: 'main' | 'beta',
  ids: Array<'ship-info' | 'navy-staff'>,
) => {
  runGit(root, ['add', '-A'])
  runGit(root, ['commit', '-q', '--allow-empty', '-m', 'pending intents'])
  const base = runGit(root, ['rev-parse', 'HEAD'])
  const baseVersions = readSelectedVersions(root, ids)
  const result = pnpmLaneVersionSelection({
    baseVersions,
    channel,
    ids,
    repo: root,
  })
  if (result.changedIds.length === 0) {
    throw new Error('fixture release produced no changed packages')
  }
  const plan = createReleasePlan({
    baseCommit: base,
    baseVersions,
    changes: workingTreeChanges(root),
    channel,
    repo: root,
    selection: result.changedIds,
  })
  const head = commitReleasePlan({
    branch: `release/${channel}-${Date.now()}-${Math.random()}`,
    message: `release ${channel}`,
    plan,
    repo: root,
  })
  validateReleasePr({ base, head, repo: root })
  return { baseVersions, plan, result }
}

describe('native pnpm lanes (real binary, local registry)', () => {
  it('runs beta -> repeated beta -> main graduation with plan recompute', async () => {
    const port = await startRegistry()
    const root = makeRepo(port)

    intent(root, 'ship-info', 'patch', 'ship-info beta one')
    const first = prepareFixtureRelease(root, 'beta', ['ship-info'])
    expect(first.plan.channel).toBe('beta')
    expect(readManifest(root, 'packages/ship-info').version).toBe('1.0.1-beta.0')
    runPnpm(['install', '--frozen-lockfile'], root)

    intent(root, 'ship-info', 'patch', 'ship-info beta two')
    const second = prepareFixtureRelease(root, 'beta', ['ship-info'])
    expect(readManifest(root, 'packages/ship-info').version).toBe('1.0.1-beta.1')
    runPnpm(['install', '--frozen-lockfile'], root)

    // Graduation: no new intent, cumulative changelog, lane entry removed.
    const graduate = prepareFixtureRelease(root, 'main', ['ship-info'])
    expect(graduate.plan.channel).toBe('main')
    expect(readManifest(root, 'packages/ship-info').version).toBe('1.0.1')
    const changelog = fs.readFileSync(
      path.join(root, 'packages/ship-info/CHANGELOG.md'),
      'utf8',
    )
    // The stable section must carry BOTH beta notes, not just the beta sections.
    const stableSection = changelogSection(changelog, '1.0.1')
    expect(stableSection).toContain('ship-info beta one')
    expect(stableSection).toContain('ship-info beta two')
    expect(
      fs
        .readFileSync(path.join(root, 'pnpm-workspace.yaml'), 'utf8')
        .replace(/'/g, ''),
    ).not.toContain(`${SHIP}: beta`)

    runPnpm(['install', '--frozen-lockfile'], root)
  }, 180_000)

  it('runs a direct stable release from the main lane', async () => {
    const port = await startRegistry()
    const root = makeRepo(port)

    // ship-info is NOT selected but HAS a pending intent: it must stay
    // untouched, on its original lane, with its intent still pending.
    const shipIntent = intent(root, 'ship-info', 'patch', 'ship-info unselected')
    intent(root, 'navy-staff', 'patch', 'navy-staff stable')
    const direct = prepareFixtureRelease(root, 'main', ['navy-staff'])
    expect(direct.plan.channel).toBe('main')
    expect(direct.result.changedIds).toEqual(['navy-staff'])
    expect(readManifest(root, 'packages/navy-staff').version).toBe('1.0.1')
    expect(readManifest(root, 'packages/ship-info').version).toBe('1.0.0')
    expect(fs.existsSync(shipIntent)).toBe(true)
    expect(
      fs
        .readFileSync(path.join(root, 'pnpm-workspace.yaml'), 'utf8')
        .replace(/'/g, ''),
    ).not.toContain(`${SHIP}: beta`)
  }, 180_000)

  it('narrows a both selection without switching the skipped package lane', async () => {
    const port = await startRegistry()
    const root = makeRepo(port)

    intent(root, 'ship-info', 'patch', 'ship-info narrowing')
    const both = prepareFixtureRelease(root, 'beta', ['ship-info', 'navy-staff'])
    expect(both.result.changedIds).toEqual(['ship-info'])
    expect(readManifest(root, 'packages/ship-info').version).toBe('1.0.1-beta.0')
    expect(readManifest(root, 'packages/navy-staff').version).toBe('1.0.0')
    expect(
      fs
        .readFileSync(path.join(root, 'pnpm-workspace.yaml'), 'utf8')
        .replace(/'/g, ''),
    ).not.toContain(`${NAVY}: beta`)
  }, 180_000)

  it('keeps the workspace unchanged when a no-op lane run changes nothing', async () => {
    const port = await startRegistry()
    const root = makeRepo(port)
    const before = fs.readFileSync(path.join(root, 'pnpm-workspace.yaml'), 'utf8')

    const result = pnpmLaneVersionSelection({
      baseVersions: readSelectedVersions(root, ['ship-info']),
      channel: 'beta',
      ids: ['ship-info'],
      repo: root,
    })

    expect(result.changedIds).toEqual([])
    expect(fs.readFileSync(path.join(root, 'pnpm-workspace.yaml'), 'utf8')).toBe(
      before,
    )
  }, 180_000)
})
