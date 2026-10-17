import { validateReleasePr } from './lib.mjs'

const args = process.argv.slice(2)
const option = (name, fallback = undefined) => {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : fallback
}

try {
  const repo = option('--repo', process.cwd())
  const base = option('--base')
  const head = option('--head')
  const target = option('--target', null)
  if (!base || !head) {
    throw new Error('--base and --head are required')
  }
  const { plan } = validateReleasePr({ base, head, repo, target })
  console.log('Release PR validation passed.')
  for (const release of plan.releases) {
    console.log(
      `  ${release.name}: ${release.from} -> ${release.to} (${release.tag})`,
    )
  }
  console.log('Generated files:')
  for (const file of plan.files) {
    console.log(`  ${file.status} ${file.path}`)
  }
} catch (error) {
  console.error(
    `release-validation: ${error instanceof Error ? error.message : error}`,
  )
  process.exit(1)
}
