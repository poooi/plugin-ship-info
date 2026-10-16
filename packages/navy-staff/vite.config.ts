import { defineConfig } from 'vite-plus'

// Build config for the published Navy Staff plugin. Host modules are injected
// by poi at runtime, so they stay external; the private shared package is
// bundled in (it is never marked external).
export default defineConfig({
  pack: {
    entry: { index: 'src/index-src.ts' },
    outDir: '.',
    outExtensions: () => ({ js: '.js' }),
    format: ['cjs'],
    deps: {
      alwaysBundle: ['@poi-plugins/ship-info-shared'],
      neverBundle: [
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
})
