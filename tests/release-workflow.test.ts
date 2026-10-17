import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  commitReleasePlan,
  createReleasePlan,
  PLAN_FILE,
  pnpmVersionSelection,
  readSelectedVersions,
  resolveChangedSelection,
  runGit,
  validateReleasePr,
  workingTreeChanges,
} from '../scripts/release/lib.mjs'

const roots: string[] = []

afterEach(() => {
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

const write = (root: string, file: string, content: string) => {
  const target = path.join(root, file)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, content)
}

const commit = (root: string, message: string) => {
  runGit(root, ['add', '-A'])
  runGit(root, ['commit', '-q', '-m', message])
  return runGit(root, ['rev-parse', 'HEAD'])
}

const makeFixture = ({ navyVersion = '1.2.0', tooling = true } = {}) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'release-fixture-'))
  roots.push(root)
  write(
    root,
    'package.json',
    JSON.stringify({
      name: 'fixture-root',
      packageManager: 'pnpm@11.20.0',
      private: true,
      version: '0.0.0',
    }),
  )
  if (tooling) {
    // Marks the base as already containing release tooling so the version-edit
    // bootstrap exception does not apply.
    write(
      root,
      'scripts/release/validate-changelog.mjs',
      '// test stub\n',
    )
  }
  write(
    root,
    'pnpm-workspace.yaml',
    [
      'packages:',
      '  - packages/*',
      'versioning:',
      '  ignore:',
      '    - fixture-root',
      "    - '@poi-plugins/shared'",
      '  changelog:',
      '    storage: repository',
      '',
    ].join('\n'),
  )
  write(
    root,
    'packages/ship-info/package.json',
    JSON.stringify({
      devDependencies: {
        '@poi-plugins/shared': 'workspace:*',
      },
      name: 'poi-plugin-ship-info',
      private: true,
      version: '8.1.1',
    }),
  )
  write(
    root,
    'packages/navy-staff/package.json',
    JSON.stringify({
      devDependencies: {
        '@poi-plugins/shared': 'workspace:*',
      },
      name: 'poi-plugin-navy-staff',
      private: true,
      version: navyVersion,
    }),
  )
  write(
    root,
    'packages/shared/package.json',
    JSON.stringify({
      name: '@poi-plugins/shared',
      private: true,
      version: '0.0.0',
    }),
  )
  write(
    root,
    'packages/ship-info/CHANGELOG.md',
    '# poi-plugin-ship-info\n',
  )
  write(root, 'packages/ship-info/src/a.ts', 'export const a = 0\n')
  write(
    root,
    'packages/navy-staff/CHANGELOG.md',
    '# poi-plugin-navy-staff\n',
  )
  write(
    root,
    '.changeset/ship-major.md',
    '---\n"poi-plugin-ship-info": major\n---\n\nShip extraction.\n',
  )
  write(
    root,
    '.changeset/navy-major.md',
    '---\n"poi-plugin-navy-staff": major\n---\n\nNavy release.\n',
  )
  write(
    root,
    '.changeset/both-patch.md',
    '---\n"poi-plugin-ship-info": patch\n"poi-plugin-navy-staff": patch\n---\n\nShared change.\n',
  )
  runGit(root, ['init', '-q'])
  runGit(root, ['config', 'user.name', 'Release Test'])
  runGit(root, ['config', 'user.email', 'release-test@example.invalid'])
  const base = commit(root, 'base')
  return { base, root }
}

const releaseBoth = (root: string) => {
  const selection = ['ship-info', 'navy-staff']
  const base = runGit(root, ['rev-parse', 'HEAD'])
  const baseVersions = readSelectedVersions(root, selection)
  pnpmVersionSelection(root, selection)
  const changes = workingTreeChanges(root)
  const plan = createReleasePlan({
    baseCommit: base,
    baseVersions,
    changes,
    repo: root,
    selection,
  })
  fs.writeFileSync(
    path.join(root, PLAN_FILE),
    `${JSON.stringify(plan, null, 2)}\n`,
  )
  const head = commit(root, 'release')
  return { base, head, plan }
}

const runChangelog = (root: string, base: string, head: string, branch: string) =>
  spawnSync(
    process.execPath,
    [
      path.resolve('scripts/release/validate-changelog.mjs'),
      '--repo',
      root,
      '--base',
      base,
      '--head',
      head,
      '--branch',
      branch,
    ],
    { encoding: 'utf8' },
  )

describe('pnpm native release integration', () => {
  it('applies a selected release and rejects hand edits', () => {
    const { root } = makeFixture()
    const { base, head, plan } = releaseBoth(root)

    expect(plan.releases.map((release) => [release.from, release.to])).toEqual([
      ['8.1.1', '9.0.0'],
      ['1.2.0', '2.0.0'],
    ])
    expect(validateReleasePr({ base, head, repo: root }).plan.releases).toEqual(
      plan.releases,
    )

    const tamper = (file: string, transform: (value: string) => string) => {
      const target = path.join(root, file)
      fs.writeFileSync(target, transform(fs.readFileSync(target, 'utf8')))
      commit(root, `tamper ${file}`)
      const result = spawnSync(
        process.execPath,
        [
          path.resolve('scripts/release/validate-release-pr.mjs'),
          '--repo',
          root,
          '--base',
          base,
          '--head',
          'HEAD',
        ],
        { encoding: 'utf8' },
      )
      runGit(root, ['reset', '--hard', head])
      return result
    }

    expect(
      tamper('packages/ship-info/package.json', (value) => {
        const manifest = JSON.parse(value)
        manifest.version = '9.9.9'
        return `${JSON.stringify(manifest, null, 2)}\n`
      }).status,
    ).not.toBe(0)
    expect(
      tamper('packages/navy-staff/CHANGELOG.md', (value) => `${value}\nEdited.\n`)
        .status,
    ).not.toBe(0)
    expect(
      tamper('.changeset/ledger.yaml', (value) => `${value}\n`).status,
    ).not.toBe(0)

    fs.writeFileSync(path.join(root, 'extra.txt'), 'not generated\n')
    commit(root, 'extra file')
    expect(
      spawnSync(
        process.execPath,
        [
          path.resolve('scripts/release/validate-release-pr.mjs'),
          '--repo',
          root,
          '--base',
          base,
          '--head',
          'HEAD',
        ],
        { encoding: 'utf8' },
      ).status,
    ).not.toBe(0)
    runGit(root, ['reset', '--hard', head])
  }, 60_000)

  it('fails when the plan base is stale', () => {
    const { root } = makeFixture()
    const { base, head } = releaseBoth(root)
    const advanced = runGit(root, [
      'commit-tree',
      `${base}^{tree}`,
      '-p',
      base,
      '-m',
      'advanced base',
    ])
    expect(() =>
      validateReleasePr({ base: advanced, head, repo: root }),
    ).toThrow(/not an ancestor|bound to base/)
  }, 60_000)

  it('preserves the unselected intent during partial consumption', () => {
    const { root } = makeFixture()
    const base = runGit(root, ['rev-parse', 'HEAD'])
    const baseVersions = readSelectedVersions(root, ['ship-info'])
    pnpmVersionSelection(root, ['ship-info'])
    const changes = workingTreeChanges(root)
    const shipPlan = createReleasePlan({
      baseCommit: base,
      baseVersions,
      changes,
      repo: root,
      selection: ['ship-info'],
    })
    fs.writeFileSync(
      path.join(root, PLAN_FILE),
      `${JSON.stringify(shipPlan, null, 2)}\n`,
    )
    commit(root, 'ship only')

    expect(
      JSON.parse(
        fs.readFileSync(path.join(root, 'packages/navy-staff/package.json'), 'utf8'),
      ).version,
    ).toBe('1.2.0')
    expect(fs.existsSync(path.join(root, '.changeset/navy-major.md'))).toBe(true)
    expect(fs.existsSync(path.join(root, '.changeset/both-patch.md'))).toBe(true)
    expect(fs.existsSync(path.join(root, '.changeset/ship-major.md'))).toBe(false)
    expect(fs.readFileSync(path.join(root, '.changeset/ledger.yaml'), 'utf8')).toMatch(
      /poi-plugin-ship-info@9\.0\.0/,
    )

    pnpmVersionSelection(root, ['navy-staff'])
    expect(
      JSON.parse(
        fs.readFileSync(path.join(root, 'packages/navy-staff/package.json'), 'utf8'),
      ).version,
    ).toBe('2.0.0')
    expect(fs.existsSync(path.join(root, '.changeset/navy-major.md'))).toBe(false)
    expect(fs.existsSync(path.join(root, '.changeset/both-patch.md'))).toBe(false)
    expect(fs.readFileSync(path.join(root, '.changeset/ledger.yaml'), 'utf8')).toMatch(
      /poi-plugin-navy-staff@2\.0\.0/,
    )
  }, 60_000)

  it('narrows a both selection to packages with pending intents', () => {
    const { root } = makeFixture()
    const baseVersions = readSelectedVersions(root, ['ship-info', 'navy-staff'])
    pnpmVersionSelection(root, ['ship-info'])
    expect(
      resolveChangedSelection(root, ['ship-info', 'navy-staff'], baseVersions),
    ).toEqual(['ship-info'])
    expect(
      resolveChangedSelection(root, ['navy-staff'], baseVersions),
    ).toEqual([])
  }, 60_000)

  it('commits the plan on a new release branch', () => {
    const { root } = makeFixture()
    const base = runGit(root, ['rev-parse', 'HEAD'])
    write(root, 'generated.txt', 'generated\n')
    const head = commitReleasePlan({
      branch: 'release/test',
      message: 'release test',
      plan: { schemaVersion: 1 },
      repo: root,
    })
    expect(runGit(root, ['symbolic-ref', '--short', 'HEAD'])).toBe(
      'release/test',
    )
    expect(runGit(root, ['rev-parse', 'HEAD'])).toBe(head)
    expect(runGit(root, ['rev-parse', 'HEAD~1'])).toBe(base)
  })

  it('keeps a historical plan from breaking later PRs and supports a second release', () => {
    const { root } = makeFixture()
    const firstBase = runGit(root, ['rev-parse', 'HEAD'])
    const shipBase = readSelectedVersions(root, ['ship-info'])
    pnpmVersionSelection(root, ['ship-info'])
    const firstPlan = createReleasePlan({
      baseCommit: firstBase,
      baseVersions: shipBase,
      changes: workingTreeChanges(root),
      repo: root,
      selection: ['ship-info'],
    })
    const firstRelease = commitReleasePlan({
      branch: 'release/ship-first',
      message: 'release ship',
      plan: firstPlan,
      repo: root,
    })

    write(root, 'packages/ship-info/src/b.ts', 'export const b = 1\n')
    write(
      root,
      '.changeset/later-fix.md',
      '---\n"poi-plugin-ship-info": patch\n---\n\nLater ship fix.\n',
    )
    const normal = commit(root, 'normal feature')
    expect(
      runChangelog(root, firstRelease, normal, 'feature/later').status,
    ).toBe(0)

    const navyBase = readSelectedVersions(root, ['navy-staff'])
    pnpmVersionSelection(root, ['navy-staff'])
    const secondPlan = createReleasePlan({
      baseCommit: normal,
      baseVersions: navyBase,
      changes: workingTreeChanges(root),
      repo: root,
      selection: ['navy-staff'],
    })
    const secondRelease = commitReleasePlan({
      branch: 'release/navy-second',
      message: 'release navy',
      plan: secondPlan,
      repo: root,
    })
    expect(
      validateReleasePr({
        base: normal,
        head: secondRelease,
        repo: root,
      }).plan.releases[0].to,
    ).toBe('2.0.0')
    expect(
      runChangelog(root, normal, secondRelease, 'release/navy-second').status,
    ).toBe(0)
  }, 60_000)
})

describe('changelog enforcement against git history', () => {
  it('accepts a manifest metadata edit on a feature branch started before a release', () => {
    const { root, base } = makeFixture()
    const release = releaseBoth(root)
    runGit(root, ['checkout', '-b', 'feature/metadata', base])
    const file = 'packages/ship-info/package.json'
    const manifest = JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'))
    write(root, file, JSON.stringify({ ...manifest, description: 'Updated description' }))
    write(
      root,
      '.changeset/update-description.md',
      '---\n"poi-plugin-ship-info": patch\n---\n\nUpdate the package description.\n',
    )
    const head = commit(root, 'metadata edit on older base')
    const result = runChangelog(root, release.head, head, 'feature/metadata')
    expect(result.stderr).toBe('')
    expect(result.status).toBe(0)
    expect(runGit(root, ['diff', '--name-only', `${release.head}...${head}`, '--', PLAN_FILE])).toBe('')
  }, 60_000)

  it('accepts new intent coverage and rejects edits or missing coverage', () => {
    const { root } = makeFixture()
    const base = runGit(root, ['rev-parse', 'HEAD'])
    const reset = () => {
      runGit(root, ['reset', '--hard', base])
      runGit(root, ['clean', '-fd'])
    }

    write(root, 'packages/ship-info/src/table.ts', 'export const a = 1\n')
    write(
      root,
      '.changeset/new-ship.md',
      '---\n"poi-plugin-ship-info": patch\n---\n\nShip table fix.\n',
    )
    const good = commit(root, 'good change')
    expect(runChangelog(root, base, good, 'feature/test').status).toBe(0)

    reset()
    write(root, 'packages/ship-info/src/no-intent.ts', 'export const b = 2\n')
    const missing = commit(root, 'missing intent')
    expect(runChangelog(root, base, missing, 'feature/test').status).not.toBe(0)

    reset()
    write(
      root,
      '.changeset/ship-major.md',
      '---\n"poi-plugin-ship-info": patch\n---\n\nEdited old intent.\n',
    )
    const editedOld = commit(root, 'edited old intent')
    expect(
      runChangelog(root, base, editedOld, 'feature/test').status,
    ).not.toBe(0)

    reset()
    write(root, 'packages/shared/src/fleet.ts', 'export const c = 3\n')
    write(
      root,
      '.changeset/new-ship.md',
      '---\n"poi-plugin-ship-info": patch\n---\n\nShared ship fix.\n',
    )
    const sharedOne = commit(root, 'shared one intent')
    expect(
      runChangelog(root, base, sharedOne, 'feature/test').status,
    ).not.toBe(0)

    reset()
    write(root, 'packages/shared/src/fleet.ts', 'export const c = 3\n')
    write(
      root,
      '.changeset/new-ship.md',
      '---\n"poi-plugin-ship-info": patch\n---\n\nShared ship fix.\n',
    )
    write(
      root,
      '.changeset/new-navy.md',
      '---\n"poi-plugin-navy-staff": patch\n---\n\nNavy shared fix.\n',
    )
    const sharedBoth = commit(root, 'shared both intents')
    expect(
      runChangelog(root, base, sharedBoth, 'feature/test').status,
    ).toBe(0)

    reset()
    write(root, 'packages/ship-info/CHANGELOG.md', '# edited\n')
    const editedChangelog = commit(root, 'edited changelog')
    expect(
      runChangelog(root, base, editedChangelog, 'feature/test').status,
    ).not.toBe(0)

    reset()
    write(root, PLAN_FILE, '{}\n')
    const fakePlan = commit(root, 'fake plan')
    expect(
      runChangelog(root, base, fakePlan, 'feature/test').status,
    ).not.toBe(0)

    reset()
    write(root, 'packages/ship-info/src/bad.ts', 'export const d = 4\n')
    write(
      root,
      '.changeset/bad.md',
      '---\n"poi-plugin-ship-info": huge\n---\n\nBad bump.\n',
    )
    const malformed = commit(root, 'malformed intent')
    expect(
      runChangelog(root, base, malformed, 'feature/test').status,
    ).not.toBe(0)
  })

  it('does not let an old intent cover a later pull request', () => {
    const { root } = makeFixture()
    const base = runGit(root, ['rev-parse', 'HEAD'])
    write(root, 'packages/ship-info/src/a.ts', 'export const a = 1\n')
    const head = commit(root, 'change without new intent')
    expect(runChangelog(root, base, head, 'feature/test').status).not.toBe(0)
  })

  it('rejects manual plugin version edits unless the bootstrap applies', () => {
    const { root } = makeFixture()
    const base = runGit(root, ['rev-parse', 'HEAD'])
    write(
      root,
      'packages/ship-info/package.json',
      JSON.stringify(
        { ...JSON.parse(fs.readFileSync(path.join(root, 'packages/ship-info/package.json'), 'utf8')), version: '9.9.9' },
        null,
        2,
      ),
    )
    write(
      root,
      '.changeset/version-edit.md',
      '---\n"poi-plugin-ship-info": major\n---\n\nVersion edit.\n',
    )
    const edited = commit(root, 'manual version edit')
    expect(
      runChangelog(root, base, edited, 'feature/test').status,
    ).not.toBe(0)

    const bootstrap = makeFixture({ navyVersion: '0.1.0', tooling: false })
    const bootstrapBase = runGit(bootstrap.root, ['rev-parse', 'HEAD'])
    write(
      bootstrap.root,
      'packages/navy-staff/package.json',
      JSON.stringify(
        { ...JSON.parse(fs.readFileSync(path.join(bootstrap.root, 'packages/navy-staff/package.json'), 'utf8')), version: '1.2.0' },
        null,
        2,
      ),
    )
    write(
      bootstrap.root,
      '.changeset/navy-baseline.md',
      '---\n"poi-plugin-navy-staff": major\n---\n\nNavy baseline.\n',
    )
    const baseline = commit(bootstrap.root, 'navy baseline')
    expect(
      runChangelog(bootstrap.root, bootstrapBase, baseline, 'feature/test')
        .status,
    ).toBe(0)
  })

  it('rejects re-adding an intent filename that exists in base history', () => {
    const { root } = makeFixture()
    write(
      root,
      '.changeset/12345.md',
      '---\n"poi-plugin-ship-info": patch\n---\n\nNumeric intent.\n',
    )
    write(
      root,
      '.changeset/spaced name.md',
      '---\n"poi-plugin-ship-info": patch\n---\n\nSpaced intent.\n',
    )
    const added = commit(root, 'add intents')
    runGit(root, ['rm', '-q', '.changeset/12345.md', '.changeset/spaced name.md'])
    const consumed = commit(root, 'consume and delete intents')
    expect(runGit(root, ['rev-parse', 'HEAD'])).toBe(consumed)

    write(
      root,
      '.changeset/12345.md',
      '---\n"poi-plugin-ship-info": patch\n---\n\nNumeric reused.\n',
    )
    const reusedNumeric = commit(root, 're-add numeric intent')
    const numericResult = runChangelog(
      root,
      consumed,
      reusedNumeric,
      'feature/test',
    )
    expect(numericResult.status).not.toBe(0)
    expect(numericResult.stderr).toMatch(/already exists in the repository history/)

    runGit(root, ['reset', '--hard', consumed])
    runGit(root, ['clean', '-fd'])
    write(
      root,
      '.changeset/spaced name.md',
      '---\n"poi-plugin-ship-info": patch\n---\n\nSpaced reused.\n',
    )
    const reusedSpaced = commit(root, 're-add spaced intent')
    expect(
      runChangelog(root, consumed, reusedSpaced, 'feature/test').status,
    ).not.toBe(0)

    runGit(root, ['reset', '--hard', consumed])
    runGit(root, ['clean', '-fd'])
    write(
      root,
      '.changeset/brand-new.md',
      '---\n"poi-plugin-ship-info": patch\n---\n\nFresh intent.\n',
    )
    const fresh = commit(root, 'fresh intent')
    expect(runChangelog(root, consumed, fresh, 'feature/test').status).toBe(0)
    expect(added).not.toBe(consumed)
  })

  it('rejects renaming an old intent and tracks renamed runtime sources', () => {
    const { root } = makeFixture()
    const base = runGit(root, ['rev-parse', 'HEAD'])
    runGit(root, ['mv', '.changeset/ship-major.md', '.changeset/renamed.md'])
    const renamed = commit(root, 'rename intent')
    const renameResult = runChangelog(root, base, renamed, 'feature/test')
    expect(renameResult.status).not.toBe(0)
    expect(renameResult.stderr).toMatch(/renamed/)

    runGit(root, ['reset', '--hard', base])
    runGit(root, ['clean', '-fd'])
    fs.mkdirSync(path.join(root, 'tests'), { recursive: true })
    runGit(root, ['mv', 'packages/ship-info/src/a.ts', 'tests/a.ts'])
    const moved = commit(root, 'move runtime file to tests')
    expect(runChangelog(root, base, moved, 'feature/test').status).not.toBe(0)
  })
})
