import { defineConfig } from 'vite-plus'

export default defineConfig({
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
