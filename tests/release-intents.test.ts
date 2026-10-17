import { describe, expect, it } from 'vitest'

import {
  affectedPluginsForChanges,
  changelogSection,
  createReleasePlan,
  evaluateIntentCoverage,
  parseIntent,
  parseReleasePlan,
  validatePlanShape,
} from '../scripts/release/lib.mjs'

const SHIP = 'poi-plugin-ship-info'
const NAVY = 'poi-plugin-navy-staff'

const intent = (entries: Record<string, string>, summary = 'Change.') =>
  ({
    packages: entries,
    path: '.changeset/example.md',
    summary,
  }) as const

describe('change intent parsing', () => {
  it('accepts quoted, single-quoted, and bare package names', () => {
    for (const key of [`"${SHIP}"`, `'${SHIP}'`, SHIP]) {
      expect(parseIntent(`---\n${key}: patch\n---\n\nFix it.\n`)).toEqual({
        packages: { [SHIP]: 'patch' },
        summary: 'Fix it.',
      })
    }
  })

  it('accepts all bump types and multi-line English summaries', () => {
    const parsed = parseIntent(
      `---\n"${SHIP}": minor\n"${NAVY}": none\n---\n\nFirst line.\n\nSecond line.\n`,
    )
    expect(parsed.packages).toEqual({
      [SHIP]: 'minor',
      [NAVY]: 'none',
    })
    expect(parsed.summary).toBe('First line.\n\nSecond line.')
  })

  it('keeps non-ASCII proper nouns without an ASCII-only rule', () => {
    const parsed = parseIntent(
      `---\n"${NAVY}": patch\n---\n\nFix the 艦隊 name and 深海 labels.\n`,
    )
    expect(parsed.summary).toContain('艦隊')
  })

  it('rejects malformed or unsafe intents', () => {
    const cases: Array<[string, RegExp]> = [
      ['---\npoi-plugin-ship-info: huge\n---\nFix.\n', /invalid bump/],
      ['---\nunknown-package: patch\n---\nFix.\n', /unknown or non-publishable/],
      ['---\n@poi-plugins/shared: patch\n---\nFix.\n', /unknown/],
      [
        '---\npoi-plugin-ship-info: patch\npoi-plugin-ship-info: minor\n---\nFix.\n',
        /duplicate/,
      ],
      ['---\npoi-plugin-ship-info: patch\n---\n\n', /summary must not be empty/],
      ['---\n---\nFix.\n', /names no packages/],
      ['poi-plugin-ship-info: patch\n', /missing changeset frontmatter/],
      ['---\npoi-plugin-ship-info patch\n---\nFix.\n', /malformed/],
    ]
    for (const [source, pattern] of cases) {
      expect(() => parseIntent(source, 'intent.md')).toThrow(pattern)
    }
  })
})

describe('changed path classification', () => {
  it('maps plugin, shared, and build paths to releases', () => {
    expect(affectedPluginsForChanges(['packages/ship-info/src/a.ts'])).toEqual([
      'ship-info',
    ])
    expect(affectedPluginsForChanges(['packages/navy-staff/i18n/en-US.json'])).toEqual([
      'navy-staff',
    ])
    expect(affectedPluginsForChanges(['packages/shared/src/fleet.ts'])).toEqual([
      'ship-info',
      'navy-staff',
    ])
    expect(affectedPluginsForChanges(['build/plugin.config.ts'])).toEqual([
      'ship-info',
      'navy-staff',
    ])
    expect(affectedPluginsForChanges(['pnpm-lock.yaml'])).toEqual([
      'ship-info',
      'navy-staff',
    ])
  })

  it('exempts pure tests and documentation', () => {
    expect(
      affectedPluginsForChanges([
        'tests/ui-table.test.tsx',
        'packages/ship-info/README.md',
        'packages/navy-staff/CHANGELOG.md',
        'docs/releases.md',
        'packages/ship-info/src/table.test.ts',
        'scripts/release/lib.mjs',
      ]),
    ).toEqual([])
  })
})

describe('change intent coverage', () => {
  it('requires a new intent for each affected plugin', () => {
    const missing = evaluateIntentCoverage({
      changedFiles: ['packages/ship-info/src/a.ts'],
      intents: [],
    })
    expect(missing.errors).toHaveLength(1)
    expect(missing.accepted).toEqual([])

    const covered = evaluateIntentCoverage({
      changedFiles: ['packages/ship-info/src/a.ts'],
      intents: [intent({ [SHIP]: 'patch' })],
    })
    expect(covered.errors).toEqual([])
    expect(covered.accepted[0]).toMatchObject({ bump: 'patch', name: SHIP })
  })

  it('requires both plugins for shared and build changes', () => {
    const one = evaluateIntentCoverage({
      changedFiles: ['packages/shared/src/fleet.ts'],
      intents: [intent({ [SHIP]: 'patch' })],
    })
    expect(one.errors.join('\n')).toMatch(/navy-staff/)

    const both = evaluateIntentCoverage({
      changedFiles: ['packages/shared/src/fleet.ts'],
      intents: [intent({ [SHIP]: 'patch', [NAVY]: 'patch' })],
    })
    expect(both.errors).toEqual([])

    const build = evaluateIntentCoverage({
      changedFiles: ['package.json'],
      intents: [
        intent({ [SHIP]: 'patch' }),
        intent({ [NAVY]: 'minor' }, 'Navy only.'),
      ],
    })
    expect(build.errors).toEqual([])
  })

  it('accepts explicit none with a written explanation', () => {
    const result = evaluateIntentCoverage({
      changedFiles: ['packages/navy-staff/src/a.ts'],
      intents: [
        intent(
          { [NAVY]: 'none' },
          'Documentation-only plugin text change; no release needed.',
        ),
      ],
    })
    expect(result.errors).toEqual([])
    expect(result.accepted[0]).toMatchObject({ bump: 'none', none: true })
  })

  it('passes when only tests and docs changed', () => {
    const result = evaluateIntentCoverage({
      changedFiles: ['tests/ui-table.test.tsx', 'docs/releases.md'],
      intents: [],
    })
    expect(result.affected).toEqual([])
    expect(result.errors).toEqual([])
  })
})

describe('release plan shape', () => {
  const plan = (overrides: Record<string, unknown> = {}) => ({
    base: {
      commit: 'a'.repeat(40),
      packages: { [SHIP]: '8.1.1' },
    },
    channel: 'main',
    files: [
      { path: 'packages/ship-info/CHANGELOG.md', status: 'A' },
      { path: 'packages/ship-info/package.json', status: 'M' },
    ],
    releases: [
      {
        dir: 'packages/ship-info',
        from: '8.1.1',
        id: 'ship-info',
        name: SHIP,
        tag: `${SHIP}@9.0.0`,
        to: '9.0.0',
      },
    ],
    schemaVersion: 2,
    selection: ['ship-info'],
    ...overrides,
  })

  it('accepts a canonical plan and creates it from generated changes', () => {
    expect(validatePlanShape(plan()).releases[0].tag).toBe(`${SHIP}@9.0.0`)
    expect(
      validatePlanShape(
        plan({
          files: [
            { path: '.changeset/ledger.yaml', status: 'A' },
            { path: 'packages/ship-info/CHANGELOG.md', status: 'A' },
            { path: 'packages/ship-info/package.json', status: 'M' },
          ],
        }),
      ).files,
    ).toHaveLength(3)
  })

  it('rejects edited versions, unknown fields, and unsorted files', () => {
    expect(() =>
      validatePlanShape(
        plan({
          releases: [
            {
              dir: 'packages/ship-info',
              from: '8.1.1',
              id: 'ship-info',
              name: SHIP,
              tag: `${SHIP}@8.1.1`,
              to: '8.1.1',
            },
          ],
        }),
      ),
    ).toThrow(/must be greater/)
    expect(() => validatePlanShape(plan({ extra: true }))).toThrow(
      /unexpected keys/,
    )
    expect(() =>
      validatePlanShape(
        plan({
          files: [
            { path: 'packages/ship-info/package.json', status: 'M' },
            { path: 'packages/ship-info/CHANGELOG.md', status: 'A' },
          ],
        }),
      ),
    ).toThrow(/not sorted/)
  })

  it('requires a known channel and channel/version consistency', () => {
    const betaRelease = {
      dir: 'packages/ship-info',
      from: '8.1.1',
      id: 'ship-info',
      name: SHIP,
      tag: `${SHIP}@9.0.0-beta.1`,
      to: '9.0.0-beta.1',
    }
    expect(() => validatePlanShape(plan({ channel: 'canary' }))).toThrow(
      /unknown release channel/,
    )
    expect(() => validatePlanShape(plan({ channel: 'beta' }))).toThrow(
      /channel beta requires/,
    )
    expect(() =>
      validatePlanShape(plan({ channel: 'main', releases: [betaRelease] })),
    ).toThrow(/channel main requires a stable/)
    expect(() =>
      validatePlanShape(
        plan({
          channel: 'beta',
          releases: [
            {
              ...betaRelease,
              tag: `${SHIP}@9.0.0-beta.foo`,
              to: '9.0.0-beta.foo',
            },
          ],
        }),
      ),
    ).toThrow(/channel beta requires/)
    expect(
      validatePlanShape(plan({ channel: 'beta', releases: [betaRelease] }))
        .releases[0].to,
    ).toBe('9.0.0-beta.1')
  })

  it('parses JSON and rejects a plan that lists itself', () => {
    expect(parseReleasePlan(JSON.stringify(plan())).selection).toEqual([
      'ship-info',
    ])
    expect(() =>
      validatePlanShape(
        plan({
          files: [{ path: 'release-plan.json', status: 'A' }],
        }),
      ),
    ).toThrow(/must not list itself/)
  })

  it('creates a deterministic plan from pnpm changes', () => {
    const created = createReleasePlan({
      baseCommit: 'b'.repeat(40),
      baseVersions: { [SHIP]: '8.1.1' },
      changes: [
        { path: 'packages/ship-info/package.json', status: 'M' },
        { path: '.changeset/ledger.yaml', status: 'A' },
      ],
      // The helper reads the manifest for the new version; a fixture would be
      // needed for a real release. Shape is covered above.
      repo: process.cwd(),
      selection: ['ship-info'],
    })
    expect(created.files.map((file) => file.path)).toEqual([
      '.changeset/ledger.yaml',
      'packages/ship-info/package.json',
    ])
    expect(created.releases[0].from).toBe('8.1.1')
  })
})

describe('changelog sections', () => {
  it('extracts only the requested version section', () => {
    const changelog = `# plugin

## 2.0.0

### Major Changes

- New.

## 1.0.0

- Old.
`
    expect(changelogSection(changelog, '2.0.0')).toBe(
      '### Major Changes\n\n- New.\n',
    )
    expect(changelogSection(changelog, '3.0.0')).toBeNull()
  })
})
