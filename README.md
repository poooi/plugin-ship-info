# Plugin-Ship-Info
Show detailed information of all owned ship girls

Cuurent maintainer: かがみ

Created by [Yunze](https://github.com/myzwillmake)

## Development

Use the Node.js version in `.node-version` and the pnpm version pinned in `package.json`.

```sh
npm install --global pnpm@11.20.0
pnpm install --frozen-lockfile
pnpm run check
pnpm test
pnpm run build
```

Optional: `pnpm run lint` and `pnpm run fmt` use the Vite+ lint/format tools.

`pnpm test` runs the Vitest suite (`vp test run`) in `tests/`. The tests exercise
the real reducers, selectors, CSV builder and file writer against small fixtures,
mocking poi host modules and isolating persistence boundaries where needed.
Separate filesystem tests exercise real reads and queued writes in temporary
directories. Vitest is pinned to the version
bundled by Vite+ (`5.0.4`) so `tsc --noEmit` can resolve its types.

The jsdom integration tests render the real table and planner menu with React,
Redux, Jotai, and the UI libraries. They cover sorting, filters, column settings,
clipboard CSV output, and planner search/selection. Host services and viewport
geometry are supplied by test fixtures; these tests do not replace visual checks
inside poi.

[![npm package][npm-badge]][npm]

[npm-badge]: https://img.shields.io/npm/v/poi-plugin-ship-info.svg?style=flat-square
[npm]: https://www.npmjs.org/package/poi-plugin-ship-info
