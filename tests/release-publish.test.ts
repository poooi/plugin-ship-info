import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  ensureReleaseTag,
  publishSelected,
  publishTagFor,
  registryLatestVersion,
  registryVersionMetadata,
  registryVersionState,
  runGit,
  tarballDigest,
} from '../scripts/release/lib.mjs'
import type { RegistryVersionMetadata } from '../scripts/release/lib.mjs'

const roots: string[] = []

afterEach(() => {
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

const release = (
  id: 'ship-info' | 'navy-staff',
  name: string,
  from: string,
  to: string,
) => ({
  dir: `packages/${id}`,
  from,
  id,
  name,
  tag: `${name}@${to}`,
  to,
})

const ship = release('ship-info', 'poi-plugin-ship-info', '8.1.1', '9.0.0')
const navy = release('navy-staff', 'poi-plugin-navy-staff', '1.2.0', '2.0.0')

const artifacts = (releases: ReturnType<typeof release>[]) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'release-artifacts-'))
  roots.push(dir)
  for (const item of releases) {
    fs.writeFileSync(
      path.join(dir, `${item.name}-${item.to}.tgz`),
      `${item.name}@${item.to}`,
    )
  }
  return dir
}

const metadataFor = (
  dir: string,
  item: ReturnType<typeof release>,
): RegistryVersionMetadata => {
  const tarball = path.join(dir, `${item.name}-${item.to}.tgz`)
  if (!fs.existsSync(tarball)) return absent()
  const digest = tarballDigest(tarball)
  return {
    integrity: digest.integrity,
    shasum: digest.shasum,
    state: 'present',
    tarball: `https://registry.example/${item.name}`,
  }
}

const absent = (): RegistryVersionMetadata => ({
  integrity: null,
  shasum: null,
  state: 'absent',
  tarball: null,
})

describe('publish retry and idempotency', () => {
  it('checks every registry state before publishing anything', async () => {
    const releases = [ship, navy]
    const dir = artifacts(releases)
    const publish = vi.fn()
    const ensureTag = vi.fn()
    const ensureRelease = vi.fn()
    await expect(
      publishSelected({
        artifactsDir: dir,
        changelogFor: () => 'Notes.\n',
        ensureRelease,
        ensureTag,
        publish,
        registryMetadata: async (name) => {
          if (name === navy.name) throw new Error('registry unavailable')
          return metadataFor(dir, ship)
        },
        releases,
        target: 'a'.repeat(40),
      }),
    ).rejects.toThrow(/registry unavailable/)
    expect(publish).not.toHaveBeenCalled()
    expect(ensureTag).not.toHaveBeenCalled()
    expect(ensureRelease).not.toHaveBeenCalled()
  })

  it('skips publish only when the published artifact matches the tarball', async () => {
    const releases = [ship, navy]
    const dir = artifacts(releases)
    const publish = vi.fn()
    const ensureTag = vi.fn()
    const ensureRelease = vi.fn()
    const result = await publishSelected({
      artifactsDir: dir,
      changelogFor: (item) => `${item.name} notes.\n`,
      ensureRelease,
      ensureTag,
      publish,
      registryMetadata: async (name) => {
        const item = releases.find((entry) => entry.name === name)!
        return metadataFor(dir, item)
      },
      releases,
      target: 'b'.repeat(40),
    })
    expect(publish).not.toHaveBeenCalled()
    expect(ensureTag).toHaveBeenCalledTimes(2)
    expect(ensureRelease).toHaveBeenCalledTimes(2)
    expect(result.every((item) => !item.published)).toBe(true)
  })

  it('refuses to treat a mismatched published artifact as already released', async () => {
    const dir = artifacts([ship])
    const publish = vi.fn()
    await expect(
      publishSelected({
        artifactsDir: dir,
        changelogFor: () => 'Notes.\n',
        ensureRelease: vi.fn(),
        ensureTag: vi.fn(),
        publish,
        registryMetadata: async () => ({
          integrity: 'sha512-not-the-tarball',
          shasum: 'deadbeef',
          state: 'present',
          tarball: null,
        }),
        releases: [ship],
        target: 'b'.repeat(40),
      }),
    ).rejects.toThrow(/does not match verified tarball/)
    expect(publish).not.toHaveBeenCalled()
  })

  it('publishes only versions the registry reports absent', async () => {
    const releases = [ship, navy]
    const dir = artifacts(releases)
    const states = new Map([
      [ship.name, 'present'],
      [navy.name, 'absent'],
    ])
    const publish = vi.fn(async (item) => {
      states.set(item.name, 'present')
    })
    const ensureTag = vi.fn()
    const result = await publishSelected({
      artifactsDir: dir,
      changelogFor: () => 'Notes.\n',
      ensureRelease: vi.fn(),
      ensureTag,
      publish,
      registryMetadata: async (name) => {
        const item = releases.find((entry) => entry.name === name)!
        return states.get(name) === 'present'
          ? metadataFor(dir, item)
          : absent()
      },
      releases,
      target: 'c'.repeat(40),
    })
    expect(publish).toHaveBeenCalledTimes(1)
    expect(publish).toHaveBeenCalledWith(
      navy,
      expect.stringContaining(`${navy.name}-${navy.to}.tgz`),
    )
    expect(result.map((item) => item.published)).toEqual([false, true])
    expect(ensureTag).toHaveBeenCalledTimes(2)
  })

  it('treats an upload that the registry accepted before an error as published', async () => {
    const dir = artifacts([ship])
    const states = new Map([[ship.name, 'absent']])
    const publish = vi.fn(async () => {
      states.set(ship.name, 'present')
      throw new Error('connection reset after upload')
    })
    const ensureTag = vi.fn()
    const ensureRelease = vi.fn()
    const result = await publishSelected({
      artifactsDir: dir,
      changelogFor: () => 'Notes.\n',
      ensureRelease,
      ensureTag,
      publish,
      registryMetadata: async () =>
        states.get(ship.name) === 'present'
          ? metadataFor(dir, ship)
          : absent(),
      releases: [ship],
      target: 'd'.repeat(40),
    })
    expect(result[0].published).toBe(true)
    expect(ensureTag).toHaveBeenCalledWith(ship, 'd'.repeat(40))
    expect(ensureRelease).toHaveBeenCalledTimes(1)
  })

  it('fails when a failed upload recovers to a mismatched artifact', async () => {
    const dir = artifacts([ship])
    const publish = vi.fn(async () => {
      throw new Error('upload failed')
    })
    const ensureTag = vi.fn()
    let calls = 0
    const registryMetadata = vi.fn(
      async (): Promise<RegistryVersionMetadata> => {
        calls += 1
        return calls === 1
          ? absent()
          : {
              integrity: 'sha512-wrong',
              shasum: null,
              state: 'present',
              tarball: null,
            }
      },
    )
    await expect(
      publishSelected({
        artifactsDir: dir,
        changelogFor: () => 'Notes.\n',
        ensureRelease: vi.fn(),
        ensureTag,
        publish,
        registryMetadata,
        releases: [ship],
        target: 'e'.repeat(40),
      }),
    ).rejects.toThrow(/does not match verified tarball/)
    expect(publish).toHaveBeenCalledTimes(1)
    expect(ensureTag).not.toHaveBeenCalled()
  })

  it('trusts a successful publish without rereading the registry', async () => {
    const dir = artifacts([ship])
    const publish = vi.fn()
    let calls = 0
    const registryMetadata = vi.fn(async () => {
      calls += 1
      if (calls > 1) throw new Error('registry must not be reread after success')
      return absent()
    })
    const ensureTag = vi.fn()
    const ensureRelease = vi.fn()
    const result = await publishSelected({
      artifactsDir: dir,
      changelogFor: () => 'Notes.\n',
      ensureRelease,
      ensureTag,
      publish,
      registryMetadata,
      releases: [ship],
      target: 'g'.repeat(40),
    })
    expect(result[0].published).toBe(true)
    expect(registryMetadata).toHaveBeenCalledTimes(1)
    expect(publish).toHaveBeenCalledTimes(1)
    expect(ensureTag).toHaveBeenCalledTimes(1)
    expect(ensureRelease).toHaveBeenCalledTimes(1)
  })

  it('fails before tagging when the registry still lacks the version', async () => {
    const dir = artifacts([ship])
    const ensureTag = vi.fn()
    await expect(
      publishSelected({
        artifactsDir: dir,
        changelogFor: () => 'Notes.\n',
        ensureRelease: vi.fn(),
        ensureTag,
        publish: async () => {
          throw new Error('publish failed')
        },
        registryMetadata: async () => (absent()),
        releases: [ship],
        target: 'f'.repeat(40),
      }),
    ).rejects.toThrow(/publish failed/)
    expect(ensureTag).not.toHaveBeenCalled()
  })

  it('does not mutate registries when artifacts or notes are missing', async () => {
    const registryMetadata = vi.fn()
    await expect(
      publishSelected({
        artifactsDir: fs.mkdtempSync(path.join(os.tmpdir(), 'empty-artifacts-')),
        changelogFor: () => 'Notes.\n',
        ensureRelease: vi.fn(),
        ensureTag: vi.fn(),
        publish: vi.fn(),
        registryMetadata,
        releases: [ship],
        target: 'f'.repeat(40),
      }),
    ).rejects.toThrow(/missing release tarball/)
    expect(registryMetadata).not.toHaveBeenCalled()

    await expect(
      publishSelected({
        artifactsDir: artifacts([ship]),
        changelogFor: () => null,
        ensureRelease: vi.fn(),
        ensureTag: vi.fn(),
        publish: vi.fn(),
        registryMetadata,
        releases: [ship],
        target: 'f'.repeat(40),
      }),
    ).rejects.toThrow(/missing CHANGELOG/)
    expect(registryMetadata).not.toHaveBeenCalled()
  })

  it('requires integrity metadata to skip an existing version', async () => {
    const dir = artifacts([ship])
    await expect(
      publishSelected({
        artifactsDir: dir,
        changelogFor: () => 'Notes.\n',
        ensureRelease: vi.fn(),
        ensureTag: vi.fn(),
        publish: vi.fn(),
        registryMetadata: async () => ({
          integrity: null,
          shasum: null,
          state: 'present',
          tarball: null,
        }),
        releases: [ship],
        target: 'f'.repeat(40),
      }),
    ).rejects.toThrow(/no integrity/)
  })
})

describe('release tag creation', () => {
  const fixture = () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'release-tag-'))
    roots.push(root)
    runGit(root, ['init', '-q'])
    runGit(root, ['config', 'user.name', 'Release Test'])
    runGit(root, ['config', 'user.email', 'release-test@example.invalid'])
    fs.writeFileSync(path.join(root, 'a.txt'), 'a')
    runGit(root, ['add', '-A'])
    runGit(root, ['commit', '-q', '-m', 'base'])
    const first = runGit(root, ['rev-parse', 'HEAD'])
    fs.writeFileSync(path.join(root, 'a.txt'), 'b')
    runGit(root, ['add', '-A'])
    runGit(root, ['commit', '-q', '-m', 'release'])
    return { first, root, second: runGit(root, ['rev-parse', 'HEAD']) }
  }

  it('creates a tag and refuses to move a conflicting one', () => {
    const { first, root, second } = fixture()
    ensureReleaseTag({ push: false, release: ship, repo: root, target: second })
    expect(runGit(root, ['rev-list', '-n', '1', ship.tag])).toBe(second)
    ensureReleaseTag({ push: false, release: ship, repo: root, target: second })
    expect(() =>
      ensureReleaseTag({ push: false, release: ship, repo: root, target: first }),
    ).toThrow(/refusing to move/)
    expect(runGit(root, ['rev-list', '-n', '1', ship.tag])).toBe(second)
  })
})

describe('dist-tag safety and tarball digests', () => {
  it('never moves latest backwards for an older retried release', () => {
    expect(publishTagFor('9.0.0', '9.0.0')).toBe('latest')
    expect(publishTagFor('9.0.1', '9.0.0')).toBe('latest')
    expect(publishTagFor('8.1.2', '9.0.0')).toBe('previous')
    expect(publishTagFor('1.0.0', null)).toBe('latest')
  })

  it('computes stable sha512 and sha1 digests', () => {
    const dir = artifacts([ship])
    const tarball = path.join(dir, `${ship.name}-${ship.to}.tgz`)
    const first = tarballDigest(tarball)
    expect(first.integrity).toMatch(/^sha512-/)
    expect(first.shasum).toMatch(/^[0-9a-f]{40}$/)
    expect(tarballDigest(tarball)).toEqual(first)
  })
})

describe('registry state', () => {
  const response = (status: number, body: unknown = {}) => ({
    json: async () => body,
    ok: status >= 200 && status < 300,
    status,
  })

  it('treats only a 404 as absent', async () => {
    await expect(
      registryVersionState({
        fetchImpl: async () => response(404),
        name: ship.name,
        version: ship.to,
      }),
    ).resolves.toBe('absent')
  })

  it('reports present only for the exact version', async () => {
    const fetchImpl = vi.fn(async (_url: string) =>
      response(200, { versions: { '9.0.0': {}, '9.0.1': {} } }),
    )
    await expect(
      registryVersionState({
        fetchImpl,
        name: ship.name,
        version: '9.0.0',
      }),
    ).resolves.toBe('present')
    await expect(
      registryVersionState({
        fetchImpl,
        name: ship.name,
        version: '9.0.2',
      }),
    ).resolves.toBe('absent')
    expect(fetchImpl.mock.calls[0][0]).toBe(
      'https://registry.npmjs.org/poi-plugin-ship-info',
    )
  })

  it('returns registry integrity metadata for a version', async () => {
    await expect(
      registryVersionMetadata({
        fetchImpl: async () =>
          response(200, {
            versions: {
              '9.0.0': {
                dist: {
                  integrity: 'sha512-abc',
                  shasum: 'deadbeef',
                  tarball: 'https://registry.example/pkg.tgz',
                },
              },
            },
          }),
        name: ship.name,
        version: '9.0.0',
      }),
    ).resolves.toEqual({
      integrity: 'sha512-abc',
      shasum: 'deadbeef',
      state: 'present',
      tarball: 'https://registry.example/pkg.tgz',
    })
    await expect(
      registryVersionMetadata({
        fetchImpl: async () => response(404),
        name: ship.name,
        version: '9.0.0',
      }),
    ).resolves.toEqual({ state: 'absent' })
  })

  it('reads the latest dist-tag', async () => {
    await expect(
      registryLatestVersion({
        fetchImpl: async () =>
          response(200, { 'dist-tags': { latest: '9.0.1' } }),
        name: ship.name,
      }),
    ).resolves.toBe('9.0.1')
    await expect(
      registryLatestVersion({
        fetchImpl: async () => response(404),
        name: ship.name,
      }),
    ).resolves.toBeNull()
  })

  it('retries transient failures and never converts them to absent', async () => {
    const sleep = vi.fn(async () => {})
    const flaky = vi
      .fn()
      .mockResolvedValueOnce(response(500))
      .mockResolvedValueOnce(response(429))
      .mockResolvedValueOnce(response(200, { versions: { '9.0.0': {} } }))
    await expect(
      registryVersionState({
        attempts: 3,
        fetchImpl: flaky,
        name: ship.name,
        sleep,
        version: '9.0.0',
      }),
    ).resolves.toBe('present')
    expect(flaky).toHaveBeenCalledTimes(3)
    expect(sleep).toHaveBeenCalledTimes(2)

    await expect(
      registryVersionState({
        attempts: 2,
        fetchImpl: async () => response(503),
        name: ship.name,
        sleep,
        version: '9.0.0',
      }),
    ).rejects.toThrow(/refusing to assume/)
    await expect(
      registryVersionState({
        attempts: 2,
        fetchImpl: async () => response(401),
        name: ship.name,
        sleep,
        version: '9.0.0',
      }),
    ).rejects.toThrow(/refusing to assume/)
  })

  it('retries network errors and keeps the failure explicit', async () => {
    let calls = 0
    await expect(
      registryVersionState({
        attempts: 3,
        fetchImpl: async () => {
          calls += 1
          if (calls === 1) throw new Error('ECONNRESET')
          return response(200, { versions: { '9.0.0': {} } })
        },
        name: ship.name,
        sleep: async () => {},
        version: '9.0.0',
      }),
    ).resolves.toBe('present')

    await expect(
      registryVersionState({
        attempts: 2,
        fetchImpl: async () => {
          throw new Error('DNS failure')
        },
        name: ship.name,
        sleep: async () => {},
        version: '9.0.0',
      }),
    ).rejects.toThrow(/refusing to assume/)
  })
})
