import { defineConfig } from 'vite-plus'

// Build config for the published Ship Info plugin. Host modules are injected by
// poi at runtime, so they stay external; the private shared package is bundled
// in (it is never marked external).
export default defineConfig({
  pack: {
    entry: { index: 'src/index-src.ts' },
    outDir: '.',
    outExtensions: () => ({ js: '.js' }),
    format: ['cjs'],
    deps: {
      // Keep the private shared source package bundled even though it is a
      // dependency, so the published plugin has no runtime workspace reference.
      alwaysBundle: ['@poi-plugins/ship-info-shared'],
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
})
