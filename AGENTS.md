# Repository guide

## Language and conventions

- Use English for project communication, documentation, and code comments. Keep translations in their target languages and preserve domain names and identifiers.
- Follow the existing TypeScript and React conventions. Fix type errors without weakening strict checks or hiding errors with broad assertions.
- Keep changes within the requested scope and preserve unrelated work and user data.

## Code map

- `index-src.ts`: poi plugin entry and lifecycle exports.
- `views/index.tsx`: main interface; `views/table/`: ship information table.
- `views/sidebar/`: sidebar controls, including the planner in `planner/`.
- `views/selectors.ts` and `views/utils.ts`: derived data and utility functions.
- `views/redux.ts` and `views/file-writer.ts`: state and persistence.
- `i18n/`: translations; `shims/`: local dependency and poi type declarations.
- `vite.config.ts`: Vite+ build (`pack`), lint, and format configuration with poi-provided external dependencies.

## Development

Use pnpm directly, with the version pinned in `package.json`:

```sh
pnpm install --frozen-lockfile
pnpm run check
pnpm test
pnpm run build
git diff --check
```

- Run type checks, builds, and relevant behavior checks for runtime changes. For documentation changes, check content, links, and whitespace.
- `pnpm run check` runs `tsc --noEmit`. `pnpm test` runs the Vitest suite in `tests/` (`vp test run`). `pnpm run lint` and `pnpm run fmt` are the optional Vite+ lint/format tools; formatting is not a required gate.
- Preserve the build's host dependency conventions. Verify packaged entry points, translations, and assets when changing packaging.
