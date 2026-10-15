import { defineConfig } from 'vite-plus'

// poi injects these host modules at runtime, so they have no file on disk.
// jsdom transforms imports through Vite's import-analysis (unlike the node
// transform, which externalises them), so a test-only plugin resolves each to
// a unique virtual empty module; vi.mock then supplies the boundary exports.
const POI_BOUNDARY_IDS = [
  'views/components/etc/avatar',
  'views/components/etc/icon',
  'views/components/etc/overlay',
  'views/components/etc/window-env',
  'views/create-store',
  'views/env-parts/i18next',
  'views/utils/selectors',
  'views/utils/ship-img',
  'views/utils/tools',
  'electron',
  'react-fontawesome',
  'redux-observers',
  'wanakana',
]

const VIRTUAL_PREFIX = '\0poi-boundary:'

const poiBoundaryResolver = {
  enforce: 'pre' as const,
  load(id: string) {
    if (id.startsWith(VIRTUAL_PREFIX)) {
      return 'export {}'
    }
    return null
  },
  name: 'test-only-poi-boundaries',
  resolveId(id: string) {
    if (process.env.VITEST && POI_BOUNDARY_IDS.includes(id)) {
      return VIRTUAL_PREFIX + id
    }
    return null
  },
}

export default defineConfig({
  plugins: [poiBoundaryResolver],
  pack: {
    entry: { index: 'index-src.ts' },
    outDir: '.',
    outExtensions: () => ({ js: '.js' }),
    format: ['cjs'],
    deps: {
      neverBundle: [
        // Bundling Blueprint freezes its `bpN-` class namespace at build time,
        // which then disagrees with the stylesheet poi loads. poi prepends its own
        // node_modules for anything required from outside it (lib/module-path),
        // so leaving this external makes the plugin follow poi's Blueprint major.
        '@blueprintjs/core',
        'react',
        'react-dom',
        'react-redux',
        'styled-components',
        'redux-observers',
        'react-fontawesome',
        'views/components/etc/window-env',
        'views/env-parts/i18next',
        'views/utils/selectors',
        'views/utils/tools',
        'views/components/etc/overlay',
        'views/create-store',
        'views/utils/ship-img',
        'views/components/etc/avatar',
        'views/components/etc/icon',
        'electron',
        'wanakana',
        'i18next',
        'react-i18next',
      ],
    },
    dts: false,
    clean: false,
    sourcemap: true,
    treeshake: true,
    minify: true,
    shims: false,
    target: false,
  },
  fmt: {
    ignorePatterns: ['lib/**', 'shims/vendors/**'],
    printWidth: 80,
    semi: false,
    singleQuote: true,
    trailingComma: 'all',
  },
  lint: {
    ignorePatterns: ['lib/**', 'shims/**', 'index.js', 'index.js.map'],
  },
  test: {
    setupFiles: ['./tests/setup.ts'],
  },
})
