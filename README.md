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
pnpm run build
```

Optional: `pnpm run lint` and `pnpm run fmt` use the Vite+ lint/format tools.

`vite.config.ts` is excluded from `tsconfig.json` because the Vite+ config types require a newer TypeScript than the pinned 5.9.3.

[![npm package][npm-badge]][npm]

[npm-badge]: https://img.shields.io/npm/v/poi-plugin-ship-info.svg?style=flat-square
[npm]: https://www.npmjs.org/package/poi-plugin-ship-info
