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

// Root Vite/Vitest config: Node test wiring and lint/format policy. Each
// package under packages/ owns its own pack config.
export default defineConfig({
  plugins: [poiBoundaryResolver],
  fmt: {
    ignorePatterns: ['packages/*/src/lib/**', 'shims/vendors/**'],
    printWidth: 80,
    semi: false,
    singleQuote: true,
    trailingComma: 'all',
  },
  lint: {
    ignorePatterns: [
      'packages/*/src/lib/**',
      'shims/**',
      'packages/ship-info/index.js',
      'packages/ship-info/index.js.map',
    ],
  },
  test: {
    include: ['tests/**/*.test.{ts,tsx}'],
    setupFiles: ['./tests/setup.ts'],
  },
})
