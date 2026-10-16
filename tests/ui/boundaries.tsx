import React, { createElement } from 'react'
import { vi } from 'vitest'

// jsdom test adapter for the poi host boundaries the vite.config.ts test-only
// plugin resolves to empty virtual modules. The pure stand-ins live in ./host
// and are re-exported here for the existing test files; this file adds only the
// pieces that need vitest (vi.fn) or the jsdom overlay semantics.

export {
  avatarModule,
  createI18n,
  fontawesomeModule,
  iconModule,
  poiSelectors,
  reduxObserversModule,
  shipImgModule,
  toolsModule,
  wanakanaModule,
  windowEnvModule,
} from './host'

// jsdom overlay semantics: render the popover content inline next to its
// children instead of the real Blueprint portal. A later layer swaps in the
// real Blueprint overlays under a browser environment.
export const overlay = {
  Dialog: ({ isOpen, children }: any) =>
    isOpen ? createElement(React.Fragment, null, children) : null,
  Popover: ({ content, children }: any) =>
    createElement(React.Fragment, null, children, content),
  Tooltip: ({ children }: any) => createElement(React.Fragment, null, children),
}

export const createElectronModule = () => ({
  clipboard: { writeText: vi.fn() },
  remote: {
    dialog: { showSaveDialog: vi.fn(async () => ({ canceled: true })) },
    getCurrentWindow: () => ({}),
  },
})
