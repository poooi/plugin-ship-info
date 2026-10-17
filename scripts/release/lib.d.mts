export type PluginId = 'ship-info' | 'navy-staff'

export interface Plugin {
  dir: string
  id: PluginId
  name: string
}

export interface Change {
  from?: string
  path: string
  status: string
}

export interface PlanFile {
  path: string
  status: 'A' | 'M' | 'D'
}

export interface Release {
  dir: string
  from: string
  id: PluginId
  name: string
  tag: string
  to: string
}

export interface ReleasePlan {
  base: {
    commit: string
    packages: Record<string, string>
  }
  channel: string
  files: PlanFile[]
  releases: Release[]
  schemaVersion: number
  selection: PluginId[]
}

export interface Intent {
  path: string
  packages: Record<string, string>
  summary: string
}

export interface IntentCoverage {
  accepted: Array<{
    bump: string
    intent: string
    name: string
    none: boolean
  }>
  affected: PluginId[]
  errors: string[]
}

export const PLAN_FILE: string
export const CHANGESET_DIR: string
export const LEDGER_FILE: string
export const RELEASE_BRANCH_PREFIX: string
export const BUMP_TYPES: string[]
export const RELEASE_CHANNELS: readonly string[]
export const PLUGINS: Record<PluginId, Plugin>
export const PLUGIN_IDS: readonly PluginId[]
export const PUBLISHED_NAMES: Set<string>

export function normalizeRel(file: string): string
export function parseSelection(value: string): PluginId[]
export function expandSelection(
  selection: string | readonly string[],
): PluginId[]
export function releaseTag(name: string, version: string): string
export function parseChannel(value: string): string
export function applyLane(repo: string, channel: string, id: PluginId): string
export function pnpmLaneVersionSelection(options: {
  baseVersions: Record<string, string>
  channel: string
  ids: PluginId[]
  repo: string
}): { changedIds: PluginId[]; output: string }
export function parseVersion(value: string): {
  major: number
  minor: number
  patch: number
  prerelease: string | null
}
export function compareVersions(left: string, right: string): number
export function isDocumentationOrTest(file: string): boolean
export function classifyPath(file: string):
  | { kind: 'release-plan' }
  | { kind: 'changeset' }
  | { kind: 'exempt' }
  | { kind: 'plugin'; plugin: PluginId }
  | { kind: 'both'; reason: string }
export function affectedPluginsForChanges(
  files: Array<string | Change>,
): PluginId[]
export function parseIntent(source: string, file?: string): {
  packages: Record<string, string>
  summary: string
}
export function evaluateIntentCoverage(options: {
  changedFiles: Array<string | Change>
  intents: Intent[]
}): IntentCoverage
export function runGit(
  repo: string,
  args: string[],
  options?: Record<string, unknown>,
): string
export function tryGit(
  repo: string,
  args: string[],
  options?: Record<string, unknown>,
): string | null
export function gitFile(
  repo: string,
  rev: string,
  rel: string,
): Buffer | null
export function readJsonFile(file: string): any
export function readManifest(repo: string, dir: string): any
export function manifestAt(repo: string, rev: string, dir: string): any
export function diffFiles(
  repo: string,
  base: string,
  head: string,
  options?: { threeDot?: boolean },
): Change[]
export function workingTreeChanges(repo: string): Change[]
export function assertClean(repo: string): void
export function runPnpm(args: string[], cwd: string): string
export function pnpmVersionSelection(
  repo: string,
  selection: string | readonly string[],
): string
export function readSelectedVersions(
  repo: string,
  selection: string | readonly string[],
): Record<string, string>
export function resolveChangedSelection(
  repo: string,
  selection: string | readonly string[],
  baseVersions: Record<string, string>,
): PluginId[]
export function intentPathInHistory(
  repo: string,
  base: string,
  file: string,
): boolean
export function tarballDigest(tarball: string): {
  integrity: string
  shasum: string
}
export function publishTagFor(version: string, latest: string | null): string
export function publishDistTag(options: {
  channel: string
  taggedVersion: string | null
  version: string
}): string
export function commitReleasePlan(options: {
  branch: string
  message: string
  plan: unknown
  repo: string
}): string
export function sortedChanges(changes: Change[]): Change[]
export function createReleasePlan(options: {
  baseCommit: string
  baseVersions: Record<string, string>
  changes: Change[]
  channel?: string
  repo: string
  selection: string | readonly string[]
}): ReleasePlan
export function validatePlanShape(plan: unknown): ReleasePlan
export function parseReleasePlan(source: string, file?: string): ReleasePlan
export function validateReleasePr(options: {
  base: string
  head: string
  repo: string
  target?: string | null
}): { plan: ReleasePlan }
export function changelogSection(source: string, version: string): string | null
export interface RegistryResponse {
  json(): Promise<any>
  ok: boolean
  status: number
}

export function registryVersionState(options: {
  attempts?: number
  fetchImpl?: (
    url: string,
    init?: { headers?: Record<string, string>; signal?: AbortSignal },
  ) => Promise<RegistryResponse>
  name: string
  registry?: string
  sleep?: (ms: number) => Promise<void>
  timeoutMs?: number
  version: string
}): Promise<'absent' | 'present'>
export interface RegistryVersionMetadata {
  integrity: string | null
  shasum: string | null
  state: 'absent' | 'present'
  tarball: string | null
}
export function registryVersionMetadata(options: {
  attempts?: number
  fetchImpl?: (
    url: string,
    init?: { headers?: Record<string, string>; signal?: AbortSignal },
  ) => Promise<RegistryResponse>
  name: string
  registry?: string
  sleep?: (ms: number) => Promise<void>
  timeoutMs?: number
  version: string
}): Promise<RegistryVersionMetadata>
export function registryLatestVersion(options: {
  attempts?: number
  fetchImpl?: (
    url: string,
    init?: { headers?: Record<string, string>; signal?: AbortSignal },
  ) => Promise<RegistryResponse>
  name: string
  registry?: string
  sleep?: (ms: number) => Promise<void>
  tag?: string
  timeoutMs?: number
}): Promise<string | null>
export function assertTarballMatchesRegistry(
  tarball: string,
  metadata: RegistryVersionMetadata,
): void
export function ensureReleaseTag(options: {
  push?: boolean
  release: Release
  repo: string
  target: string
}): void
export function publishSelected(options: {
  artifactsDir: string
  changelogFor: (release: Release) => string | null
  ensureRelease: (release: Release, notes: string) => Promise<void> | void
  ensureTag: (release: Release, target: string) => Promise<void> | void
  log?: (message: string) => void
  publish: (release: Release, tarball: string) => Promise<void> | void
  registryMetadata: (
    name: string,
    version: string,
  ) => Promise<RegistryVersionMetadata>
  releases: Release[]
  target: string
}): Promise<Array<{ published: boolean; release: Release }>>
