import fs from 'node:fs'
import path from 'node:path'

import {
  parseReleasePlan,
  PLAN_FILE,
  runPnpm,
} from './lib.mjs'

const args = process.argv.slice(2)
const option = (name, fallback = undefined) => {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : fallback
}

try {
  const repo = path.resolve(option('--repo', process.cwd()))
  const planPath = path.join(repo, option('--plan', PLAN_FILE))
  const outDir = path.resolve(
    repo,
    option('--out', path.join('.cache', 'release-artifacts')),
  )
  const plan = parseReleasePlan(fs.readFileSync(planPath, 'utf8'))

  if (fs.existsSync(outDir) && fs.readdirSync(outDir).length > 0) {
    throw new Error(
      `release artifact directory must be empty: ${outDir}. Remove it or ` +
        'choose a fresh --out directory.',
    )
  }
  fs.mkdirSync(outDir, { recursive: true })

  for (const release of plan.releases) {
    console.log(`Packing ${release.name}@${release.to}`)
    runPnpm(
      [
        '--dir',
        release.dir,
        'pack',
        '--pack-destination',
        outDir,
      ],
      repo,
    )
    const tarball = path.join(
      outDir,
      `${release.name}-${release.to}.tgz`,
    )
    if (!fs.existsSync(tarball)) {
      throw new Error(`pnpm pack did not produce ${tarball}`)
    }
    console.log(`  ${tarball}`)
  }
} catch (error) {
  console.error(
    `pack-release: ${error instanceof Error ? error.message : error}`,
  )
  process.exit(1)
}
