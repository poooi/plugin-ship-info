# Releasing the plugins

The workspace uses pnpm 11.20's native release tooling. Ordinary pull request
merges never bump versions or publish packages. Selected releases go through a
generated Release PR; the Changesets CLI is not used.

Two plugins release independently:

- `poi-plugin-ship-info` in `packages/ship-info`
- `poi-plugin-navy-staff` in `packages/navy-staff`

`@poi-plugins/ship-info-shared` and the root workspace are private. They are
excluded with `versioning.ignore` and are never versioned or published. Shared
code is bundled into the plugin that uses it.

## 1. Record change intents

Every pull request that changes plugin runtime, package, shared, or
runtime-affecting build/dependency paths needs new `.changeset` intents. Record
them with pnpm:

```sh
pnpm change --bump patch --summary "Fix the table filter reset" poi-plugin-ship-info
pnpm change --bump major --summary "Replace the planner with Navy Staff" poi-plugin-ship-info poi-plugin-navy-staff
```

The intent format, explicit `none` rule, and package rules are documented in
[.changeset/README.md](../.changeset/README.md).

Mandatory CI job **Changelog intents** compares the pull request base and head:

- New, non-empty intent files must cover every affected plugin.
- Shared, build, lockfile, workspace, and root dependency changes affect both
  plugins and need coverage for both.
- Pure test and documentation changes are exempt.
- Only new intent files count. Editing, renaming, or deleting an old intent
  cannot supply coverage, and is rejected on ordinary pull requests.
- An intent filename that already exists anywhere in the base history cannot be
  reused. pnpm ignores an id it has already consumed, so the check rejects a
  re-added or recreated filename.
- Manual plugin version edits are rejected. The only exception is the documented
  initial Navy baseline normalization (`0.1.0` to `1.2.0`) on the setup pull
  request, before release tooling exists on the base branch.
- Malformed frontmatter, empty summaries, unknown packages, and invalid bump
  types are rejected.
- `none` is accepted only as an explicit, explained decision.

The check enforces a non-empty summary and requires English by convention; it
does not run automatic language detection. Non-ASCII proper nouns such as ship
names and localized labels are kept as they are.

pnpm applies the largest bump requested for a package in the release. If
several intents name the same package, a `major` intent wins over `minor`, and
`minor` wins over `patch`. A `none` entry only declines a release when no other
intent requests a real bump for that package.

## 2. Prepare a Release PR

Run **Actions -> Prepare release -> Run workflow** and choose `ship-info`,
`navy-staff`, or `both`. The workflow:

1. Requires the default branch, a clean tree, and an up-to-date
   `origin/master`.
2. Runs pnpm's native recursive version command for the selection only, for
   example:
   `pnpm --filter poi-plugin-ship-info version -r`
3. Lets pnpm consume intents, write changelogs and `.changeset/ledger.yaml`,
   and bump only the selected package. Intents that also name an unselected
   package remain pending in `.changeset` for a later release.
4. Narrows the plan to the packages that actually have pending intents. A
   `both` selection where only one package has intents prepares only that
   package; if none has intents, preparation fails before creating a PR.
5. Writes `release-plan.json`, switches to a fresh
   `release/<selection>-<base>-<run>` branch, commits the generated files, and
   opens a Release PR.

`release-plan.json` records the base commit, selection, base and release
versions, tags, and the exact generated files. It is the contract validated
before merge and before publication. The plan stays on `master` after a
release; it is historical until a Release PR changes it.

### Stale Release PRs

The plan is bound to the base commit. If `master` advances after the plan was
generated, validation fails. Close the Release PR and run Prepare release again
from the updated base. Do not merge or hand-edit a stale plan.

## 3. Validate the Release PR

The **Release PR validation** job runs on pull requests. For a Release PR it:

- Requires the plan to be bound to the pull request base.
- Recomputes the selected release with `pnpm version -r` in a detached git
  worktree at the plan base. This is why registry state matters: pnpm's
  first-release and dependent-propagation behavior is reproduced exactly.
- Rejects hand-edited versions, changelogs, ledger entries, deleted or added
  intents, and any file outside the generated set.
- Verifies package versions, tags, and the plan's base and release versions.
- Checks the merged release target as well as the PR head.

Branch names and labels are not authority. A branch must still produce exactly
the generated files that pnpm recomputes from its declared base.

## 4. Merge and publish

Merging a Release PR triggers **Publish release**. The job only runs when:

- the pull request was merged,
- its head branch is a `release/*` branch, and
- the head repository is this repository (fork pull request code is never
  executed with publish credentials).

It revalidates the merged result from scripts extracted from the base commit,
installs dependencies, runs the type check and tests, packs only the selected
packages, verifies those tarballs, and then publishes them.

Publication is idempotent and fail-closed:

- Before publishing, the exact selected versions are looked up in the npm
  registry. A registry error is an error, never "absent".
- An existing exact version is only skipped when the registry's integrity
  metadata matches the verified local tarball. A version with a different
  artifact is never treated as already published.
- Versions already present are not published again. The run continues to finish
  missing tags and GitHub releases, so re-running a failed Publish job can
  complete a partially published release.
- Only versions recorded in `release-plan.json` are published, and only from the
  verified tarballs in `.cache/release-artifacts`.
- A retried release older than the registry's current `latest` is published
  under the `previous` dist-tag, so `latest` never moves backwards.
- Publication uses npm trusted publishing (OIDC). No npm token secret is used.
- Each package gets a tag such as `poi-plugin-ship-info@9.0.0` and a GitHub
  release with that package's changelog section. A tag that already points at a
  different commit fails the run instead of being moved. Existing old `v*` tags
  are never moved or deleted.

If a run fails after npm accepted an upload, re-run the failed Publish release
job. It will skip the accepted exact version and finish the remaining tags and
releases.

If the merged result no longer matches the plan (for example the base advanced
before the merge), Publish release fails before publishing anything. Rerun
Prepare release from the current base instead.

## Changelogs

`versioning.changelog.storage: repository` makes pnpm write committed
`packages/<plugin>/CHANGELOG.md` files. Only pnpm-generated release sections are
added; do not edit released sections or invent history. Both changelogs are
included in their package tarballs, and `pnpm run verify:package` checks for
them.

## Navy Staff baseline

`poi-plugin-navy-staff` was provisionally `0.1.0` in this repository while the
npm name held a `1.2.0` placeholder. pnpm treats an unpublished manifest
version as a first release and would have published `0.1.0` verbatim. This setup
normalizes the manifest to the published placeholder version `1.2.0` so future
intents bump above the placeholder. The existing `1.2.0` placeholder is not
tagged or published by this repository; the initial major intent releases the
planner as `2.0.0`.

`poi-plugin-ship-info` remains at `8.1.1`; the initial major intent releases
`9.0.0`.

## External repository setup

The release workflows intentionally do not create credentials or change branch
protection. An administrator must configure the following.

### Required checks

Protect `master` and require these status checks for merging:

- **Changelog intents** — `.github/workflows/changelog.yml`
- **Release PR validation** — `.github/workflows/release-pr.yml`
- the existing **build** and **browser** CI jobs

Without branch protection these workflows still run and report failures, but
merging is not technically blocked by the repository. Add the checks in
**Settings -> Branches -> Branch protection rules** (or a ruleset).

### Required GitHub App for bot PR CI

A pull request created with the repository `GITHUB_TOKEN` does not trigger new
workflow runs, so the Release PR would not get the required checks. Prepare
release therefore **requires** a GitHub App and fails early when it is missing:

1. Create a GitHub App (organization or personal) with repository permissions
   **Contents: Read and write** and **Pull requests: Read and write**. Metadata
   read is granted automatically.
2. Install it on this repository.
3. Generate a private key.
4. Add repository secrets `RELEASE_APP_ID` and `RELEASE_APP_PRIVATE_KEY`.

Prepare release uses an installation token to push the branch and open the PR,
which triggers CI normally. There is no fallback: without these secrets the
workflow fails with the setup instructions.

### npm trusted publishing

On npmjs.com, configure a trusted publisher for **each** package:

- `poi-plugin-ship-info`
- `poi-plugin-navy-staff`

Use GitHub Actions with repository `poooi/plugin-ship-info` and workflow
filename `publish-release.yml`. No environment is required by these workflows.
Do not add an npm token secret. The publish job requests `id-token: write` and
pnpm attaches provenance during trusted publishing.

## Local checks

```sh
pnpm run check
pnpm test
pnpm run pack
pnpm run verify:package

# Changelog coverage for the current PR range
pnpm run changelog:check -- --base <base-sha> --head <head-sha> --branch <branch>

# Recompute and validate an existing Release PR locally
pnpm run release:validate -- --base <base-sha> --head <head-sha>

# Prepare a branch locally without pushing (requires a clean base branch)
pnpm run release:prepare -- --selection both --no-push
```

The release tests use temporary git repositories and mock registry/tag/release
mutations. They do not publish anything.
