import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import {
  changelogSection,
  ensureReleaseTag,
  parseReleasePlan,
  PLAN_FILE,
  publishSelected,
  publishDistTag,
  readManifest,
  registryLatestVersion,
  registryVersionMetadata,
  releaseTag,
  runGit,
  runPnpm,
  tryGit,
} from './lib.mjs'

const args = process.argv.slice(2)
const option = (name, fallback = undefined) => {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : fallback
}

const repo = path.resolve(option('--repo', process.cwd()))
const planPath = path.join(repo, option('--plan', PLAN_FILE))
const artifactsDir = path.resolve(
  repo,
  option('--artifacts', path.join('.cache', 'release-artifacts')),
)
const target = option('--target')

const fail = (message) => {
  console.error(`publish-release: ${message}`)
  process.exit(1)
}

const runGh = (ghArgs) => {
  const result = spawnSync('gh', ghArgs, {
    cwd: repo,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  if (result.status !== 0) {
    throw new Error(
      `gh ${ghArgs.join(' ')} failed\n${result.stdout ?? ''}${result.stderr ?? ''}`,
    )
  }
  return `${result.stdout ?? ''}${result.stderr ?? ''}`.trim()
}

const ghReleaseExists = (tag) =>
  spawnSync('gh', ['release', 'view', tag], {
    cwd: repo,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).status === 0

let beta = false

const ensureRelease = (release, notes) => {
  if (ghReleaseExists(release.tag)) {
    console.log(`  GitHub release ${release.tag} already exists`)
    return
  }
  const notesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'release-notes-'))
  const notesFile = path.join(notesDir, 'notes.md')
  try {
    fs.writeFileSync(notesFile, notes)
    try {
      const args = [
        'release',
        'create',
        release.tag,
        '--title',
        `${release.name} ${release.to}`,
        '--notes-file',
        notesFile,
      ]
      // A beta release is flagged prerelease and can never become "latest".
      if (beta) args.push('--prerelease')
      runGh(args)
    } catch (error) {
      if (!ghReleaseExists(release.tag)) throw error
    }
    console.log(`  GitHub release ${release.tag}`)
  } finally {
    fs.rmSync(notesDir, { recursive: true, force: true })
  }
}

try {
  if (!target) fail('--target <release commit> is required')
  if (!fs.existsSync(planPath)) fail(`missing ${planPath}`)
  const plan = parseReleasePlan(fs.readFileSync(planPath, 'utf8'))
  beta = plan.channel === 'beta'

  if (tryGit(repo, ['cat-file', '-e', `${target}^{commit}`]) === null) {
    fail(`release target ${target} does not exist`)
  }
  for (const release of plan.releases) {
    if (release.tag !== releaseTag(release.name, release.to)) {
      fail(`invalid tag for ${release.name}`)
    }
    if (readManifest(repo, release.dir).private === true) {
      fail(`${release.name} is private and cannot be published`)
    }
  }

  if (!tryGit(repo, ['config', 'user.name'])) {
    runGit(repo, ['config', 'user.name', 'github-actions[bot]'])
  }
  if (!tryGit(repo, ['config', 'user.email'])) {
    runGit(repo, [
      'config',
      'user.email',
      '41898282+github-actions[bot]@users.noreply.github.com',
    ])
  }

  const changelogFor = (release) => {
    const file = path.join(repo, release.dir, 'CHANGELOG.md')
    if (!fs.existsSync(file)) {
      throw new Error(`${release.name}: ${file} is missing`)
    }
    return changelogSection(fs.readFileSync(file, 'utf8'), release.to)
  }

  const results = await publishSelected({
    artifactsDir,
    changelogFor,
    ensureRelease,
    ensureTag: (release, commit) =>
      ensureReleaseTag({ release, repo, target: commit }),
    log: (message) => console.log(message),
    publish: async (release, tarball) => {
      // Beta prereleases publish under the beta dist-tag and never touch latest;
      // an older retried beta is published under "previous" and leaves the beta
      // pointer unchanged. Stable releases keep latest/previous.
      const taggedVersion = await registryLatestVersion({
        name: release.name,
        ...(beta ? { tag: 'beta' } : {}),
      })
      const tag = publishDistTag({
        channel: beta ? 'beta' : 'main',
        taggedVersion,
        version: release.to,
      })
      if (!beta && tag !== 'latest') {
        console.log(
          `  ${release.name}@${release.to} is older than latest; ` +
            'publishing under the "previous" dist-tag',
        )
      }
      console.log(`Publishing ${release.name}@${release.to} from ${tarball}`)
      runPnpm(
        [
          'publish',
          tarball,
          '--access',
          'public',
          '--tag',
          tag,
          '--no-git-checks',
          '--provenance',
        ],
        repo,
      )
    },
    registryMetadata: (name, version) =>
      registryVersionMetadata({ name, version }),
    releases: plan.releases,
    target,
  })

  console.log('Release publish completed:')
  for (const result of results) {
    console.log(
      `  ${result.release.name}@${result.release.to}: ` +
        `${result.published ? 'published now' : 'already present'}`,
    )
  }
} catch (error) {
  fail(error instanceof Error ? error.message : String(error))
}
