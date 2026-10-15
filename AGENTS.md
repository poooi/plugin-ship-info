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
- `tsdown.config.ts`: build configuration and poi-provided external dependencies.

## Development

Use pnpm directly, with the version pinned in `package.json`:

```sh
pnpm install --frozen-lockfile
pnpm exec tsc --noEmit
pnpm run prepack
git diff --check
```

- Run type checks, builds, and relevant behavior checks for runtime changes. For documentation changes, check content, links, and whitespace.
- The `test` script is a failing placeholder, not a test suite. Report only checks actually performed.
- Preserve the build's host dependency conventions. Verify packaged entry points, translations, and assets when changing packaging.
- Do not run `poi-util-transpile --replace` in the working tree: it deletes source files after transpilation. The `reset` and `postpublish` scripts also perform destructive cleanup and are not validation commands.
