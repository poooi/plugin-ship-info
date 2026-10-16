import type { StorybookConfig } from '@storybook/react-vite'
import { mergeConfig } from 'vite-plus'

import { hostAliases, poiHostResolver } from '../preview/aliases.ts'

const config: StorybookConfig = {
  stories: ['../stories/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-vitest'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  core: {
    disableTelemetry: true,
  },
  async viteFinal(viteConfig) {
    // Resolve poi's runtime host modules and the node built-ins the plugin
    // graph imports to the pure browser adapters. mergeConfig concatenates
    // alias arrays, preserving any RegExp entries Storybook already set.
    return mergeConfig(viteConfig, {
      plugins: [poiHostResolver()],
      resolve: {
        alias: hostAliases,
      },
    })
  },
}

export default config
