import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite-plus'

// Host modules poi injects at runtime have no file on disk, and node built-ins
// used by the plugin graph have no browser equivalent. Both Storybook and the
// Vitest browser project map them to the pure adapters in preview/adapters.

const resolve = (relativePath: string) =>
  fileURLToPath(new URL(relativePath, import.meta.url))

export type HostAlias = { find: RegExp | string; replacement: string }

export const hostAliases: HostAlias[] = [
  { find: 'electron', replacement: resolve('./adapters/electron.ts') },
  { find: 'fs-extra', replacement: resolve('./adapters/fs-extra.ts') },
  { find: 'path', replacement: resolve('./adapters/path.ts') },
  {
    find: 'react-fontawesome',
    replacement: resolve('./adapters/fontawesome.tsx'),
  },
  {
    find: 'redux-observers',
    replacement: resolve('./adapters/redux-observers.ts'),
  },
  { find: 'url', replacement: resolve('./adapters/url.ts') },
  {
    find: 'views/components/etc/avatar',
    replacement: resolve('./adapters/avatar.tsx'),
  },
  {
    find: 'views/components/etc/icon',
    replacement: resolve('./adapters/icon.tsx'),
  },
  {
    find: 'views/components/etc/overlay',
    replacement: resolve('./adapters/overlay.ts'),
  },
  {
    find: 'views/components/etc/window-env',
    replacement: resolve('./adapters/window-env.tsx'),
  },
  {
    find: 'views/create-store',
    replacement: resolve('./adapters/create-store.ts'),
  },
  { find: 'views/env-parts/i18next', replacement: resolve('./i18n.ts') },
  {
    find: 'views/utils/selectors',
    replacement: resolve('./adapters/host-selectors.ts'),
  },
  {
    find: 'views/utils/ship-img',
    replacement: resolve('./adapters/ship-img.ts'),
  },
  { find: 'views/utils/tools', replacement: resolve('./adapters/tools.ts') },
]

// This pre-plugin maps the reference module's relative `./codec.ts` import
// (which needs `node:zlib`) to the browser mock.
export const poiHostResolver = (): Plugin => ({
  enforce: 'pre',
  name: 'poi-preview-host-resolver',
  resolveId(source, importer) {
    if (
      source === './codec.ts' &&
      importer &&
      /[\\/]views[\\/]reference[\\/]/u.test(importer)
    ) {
      return resolve('./adapters/reference-codec.ts')
    }
    return null
  },
})
