# Repository guide

## Language and conventions

- Use English for project communication, documentation, and code comments. Keep translations in their target languages and preserve domain names and identifiers.
- Follow the existing TypeScript and React conventions. Fix type errors without weakening strict checks or hiding errors with broad assertions.
- Keep changes within the requested scope and preserve unrelated work and user data.

## Code map

- `packages/ship-info/src/index-src.ts`: poi plugin entry and lifecycle exports.
- `packages/ship-info/src/views/`: main interface, table, sidebar, state, lifecycle, persistence, and table utilities.
- `packages/navy-staff/src/`: standalone planner entry, lifecycle, migration, state, selectors, and screenshot capture.
- `packages/shared/src/`: classification, host fleet selectors, shared UI, serialized writes, and persistence lifecycle; bundled into consumers.
- `packages/*/i18n/` and package-specific `assets/`: self-contained packaged translations and resources.
- `shims/`: local dependency and poi type declarations.
- `packages/*/vite.config.ts`: plugin builds (`vp pack`) and poi-provided external dependencies.
- `vite.config.ts`: repository tests, lint, and format configuration.

## Development

Use pnpm directly, with the version pinned in `package.json`:

```sh
pnpm install --frozen-lockfile
pnpm run check
pnpm test
pnpm run build
pnpm run pack
pnpm run verify:package
git diff --check
```

- Run type checks, builds, and relevant behavior checks for runtime changes. For documentation changes, check content, links, and whitespace.
- `pnpm run check` runs `tsc --noEmit`. `pnpm test` runs the Vitest suite in `tests/` (`vp test run`). `pnpm run lint` and `pnpm run fmt` are the optional Vite+ lint/format tools; formatting is not a required gate.
- Preserve the build's host dependency conventions. Verify packaged entry points, translations, and assets when changing packaging.
