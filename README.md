# Plugin-Ship-Info

Show detailed information of all owned ship girls

Cuurent maintainer: かがみ

Created by [Yunze](https://github.com/myzwillmake)

## Workspace layout

This is a pnpm workspace for poi plugins:

- `packages/ship-info/` — the published `poi-plugin-ship-info` plugin: the ship
  information table (filtering, columns, CSV export).
- `packages/navy-staff/` — the `poi-plugin-navy-staff` plugin: the sortie/deck
  planner, with its own state, saved file and translations. The npm name is
  already reserved by an existing package; this split implementation has not
  been released to npm.
- `packages/shared/` — private, source-only `@poi-plugins/ship-info-shared`
  modules bundled into the plugins that use them; never published.
- `tests/`, `stories/`, `preview/`, `shims/`, `.storybook/` and the shared
  configs live at the repository root.

The extracted Navy Staff implementation imports an existing Ship Info sortie
plan the first time it runs. Ship Info keeps saving its own file and leaves the
legacy `planner` field untouched.

## Installation in poi

Open **Settings → Plugins** in poi, find **Ship Girls Info** or **Navy Staff**
in the plugin list and click **Install**. For manual installation, use
**Install directly from npm** with the full package name
`poi-plugin-ship-info` or `poi-plugin-navy-staff`, respectively.

The existing Navy Staff npm package is a placeholder for this work. Installing
it does not install the planner implemented on this branch; that implementation
requires a subsequent release coordinated with adding Navy Staff to poi's
plugin list.

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

`pnpm run build` builds every plugin with `vp pack` (each plugin package owns
its `vite.config.ts`). `pnpm test` runs the Vitest suite (`vp test run`) in
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
pnpm run pack            # packs both plugins into .cache/packages/*.tgz
pnpm run verify:package  # checks both packed artifacts
```

`pnpm run pack` runs each plugin's `prepack` build and writes the tarballs to
`.cache/packages/`. `pnpm run verify:package` inspects both tarballs and checks
their manifests (name/version against the source package), compiled entries,
i18n JSON, assets, bundled shared code (no runtime workspace or private-package
references), host external conventions, and runs a controlled load/register/
lifecycle smoke against an isolated temp APPDATA. These checks verify the
produced artifacts and their host boundaries; they are not a live poi
installation.

[![npm package][npm-badge]][npm]

[npm-badge]: https://img.shields.io/npm/v/poi-plugin-ship-info.svg?style=flat-square
[npm]: https://www.npmjs.org/package/poi-plugin-ship-info
