# Plugin-Ship-Info

Show detailed information of all owned ship girls

Cuurent maintainer: かがみ

Created by [Yunze](https://github.com/myzwillmake)

## Workspace layout

This is a pnpm workspace for poi plugins:

- `packages/ship-info/` — the published `poi-plugin-ship-info` plugin
  (`src/`, `i18n/`, `assets/`).
- `packages/shared/` — private, source-only `@poi-plugins/ship-info-shared`
  modules bundled into the plugins that use them; never published.
- `tests/`, `stories/`, `preview/`, `shims/`, `.storybook/` and the shared
  configs live at the repository root.

## Development

Use the Node.js version in `.node-version` and the pnpm version pinned in
`package.json`.

```sh
npm install --global pnpm@11.20.0
pnpm install --frozen-lockfile
pnpm run check
pnpm test
pnpm run test:browser
pnpm run build
pnpm run build-storybook
```

Optional: `pnpm run lint` and `pnpm run fmt` use the Vite+ lint/format tools.

`pnpm run build` builds the plugin with `vp pack` (the plugin package owns its
`vite.config.ts`). `pnpm test` runs the Vitest suite (`vp test run`) in
`tests/`. The tests exercise the real reducers, selectors, CSV builder and file
writer against small fixtures, mocking poi host modules and isolating
persistence boundaries where needed. Separate filesystem tests exercise real
reads and queued writes in temporary directories. Vitest is pinned to the
version bundled by Vite+ (`5.0.4`) so `tsc --noEmit` can resolve its types.

The jsdom integration tests render the real table and planner menu with React,
Redux, Jotai, and the UI libraries. They cover sorting, filters, column
settings, clipboard CSV output, and planner search/selection. Host services and
viewport geometry are supplied by test fixtures; these tests do not replace
visual checks inside poi.

A second layer runs the Storybook stories as real Chromium tests via Playwright:
see [docs/browser-testing.md](docs/browser-testing.md) for the commands, the
scenario parameters, the coverage matrix and the in-memory host boundaries.

## Packaging

```sh
pnpm run pack            # packs Ship Info into .cache/packages/*.tgz
pnpm run verify:package  # checks the packed artifact
```

`pnpm run pack` runs the plugin's `prepack` build and writes the tarball to
`.cache/packages/`. `pnpm run verify:package` inspects the newest tarball there
and checks the manifest (name/version against the source package), compiled
entry, i18n JSON, bundled assets, bundled shared code (no runtime workspace or
private-package references) and the host external conventions. These checks
verify the produced artifact and its host boundaries; they are not a live poi
installation.

[![npm package][npm-badge]][npm]

[npm-badge]: https://img.shields.io/npm/v/poi-plugin-ship-info.svg?style=flat-square
[npm]: https://www.npmjs.org/package/poi-plugin-ship-info
