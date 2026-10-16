// Bootstrap first: sets the poi window globals before the plugin graph loads.
import '../preview/bootstrap'

import '@blueprintjs/core/lib/css/blueprint.css'

import type { Preview } from '@storybook/react-vite'

import { withShipInfo } from '../preview/decorators'
import { LANGUAGES } from '../preview/i18n'

const preview: Preview = {
  decorators: [withShipInfo],
  globalTypes: {
    theme: {
      description: 'poi theme variant',
      toolbar: {
        icon: 'paintbrush',
        items: [
          { title: 'Dark', value: 'dark' },
          { title: 'Light', value: 'light' },
        ],
        title: 'Theme',
      },
    },
    locale: {
      description: 'Interface language',
      toolbar: {
        icon: 'globe',
        items: LANGUAGES.map((language) => ({
          title: language,
          value: language,
        })),
        title: 'Locale',
      },
    },
  },
  initialGlobals: {
    locale: 'en-US',
    theme: 'dark',
  },
  parameters: {
    layout: 'fullscreen',
  },
}

export default preview
