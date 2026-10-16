# Browser testing

The plugin has two independent UI test layers:

| Layer | Runner | Environment | Purpose |
| --- | --- | --- | --- |
| Node/jsdom | `pnpm test` (`vp test run`) | jsdom via `tests/setup.ts` | Fast component/selector/reducer tests |
| Browser | `pnpm run test:browser` (`vitest run --config vitest.browser.config.ts`) | Real Chromium via Playwright | Storybook stories with real Blueprint CSS/overlays and browser layout |

The browser project is deliberately a separate Vitest config. It does **not**
inherit `tests/setup.ts` or the jsdom geometry stubs in `tests/ui/mocks.tsx`.

## Commands

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install chromium   # once per machine (CI: --with-deps)

pnpm storybook          # interactive Storybook at http://localhost:6006
pnpm run build-storybook # static preview in storybook-static/
pnpm run test:browser    # run the stories as Chromium tests
```

## How it is wired

- Storybook config lives in `.storybook/` (`main.ts`, `preview.tsx`).
- `preview/` is the browser integration layer:
  - `preview/aliases.ts` maps poi's runtime host modules and the node built-ins
    the plugin graph imports to pure browser adapters, and stubs the vendored
    `lib/html2canvas`.
  - `preview/adapters/` holds those adapters (Electron clipboard/files/save
    dialog/capture logs, in-memory `fs-extra`, `path`, `url`, host selectors,
    real Blueprint overlays, i18n, font/avatar/icon stand-ins).
  - `preview/scenario.tsx` builds one environment per story using the real
    plugin reducer plus `redux-thunk`, and points `views/create-store` at the
    live store.
  - `preview/decorators.tsx` wraps each story in the shared providers from
    `tests/ui/environment.tsx`.
- Stories live in `stories/` and are discovered by both Storybook and the
  Vitest addon (`@storybook/addon-vitest`), which runs them in Playwright
  Chromium.
- Shared state fixtures come from `tests/ui/fixtures.ts`, so browser consumers
  never import the jsdom geometry code.

Host boundaries are mocked (clipboard, files, save dialog, capture, host
images); the plugin reducer, selectors, UI components, Redux/Jotai, i18n and
browser layout are real. Each story gets fresh state and reset host call logs.

## Scenario parameters

Stories declare a typed `parameters.shipInfo`:

```ts
parameters: {
  shipInfo: {
    state: tableState(),            // Redux host state (defaults to tableState())
    isMain: true,                   // main window vs detached window
    files: { '/data.json': {} },    // seed the in-memory fs
    saveDialog: { canceled: false, filePath: '/out.csv' },
    dimensions: { width: 720, height: 640 },
    theme: 'dark',                  // override the toolbar global
    language: 'ja-JP',              // override the toolbar global
  },
}
```

Toolbar globals switch theme (`dark`/`light`) and locale
(`en-US`/`ja-JP`/`ko-KR`/`zh-CN`/`zh-TW`). In dark mode the Blueprint dark
class is applied to the preview body so portaled overlays are themed too.

Play functions read the active environment (store, recorded config calls) via
`getEnvironment()` from `preview/scenario.tsx` and the host call logs via
`preview/adapters/logs.ts`.

## Honest boundaries

- This is not real Electron end-to-end verification. Electron, the filesystem
  and capture are in-memory adapters; capture is stubbed until a later layer
  exercises it.
- Host-provided images/fonts are deterministic stand-ins (Blueprint icons,
  placeholder boxes, data-URI SVG) so previews make no external requests.
- jsdom `pnpm test` remains the source of truth for the reducer/selector logic
  and the existing 64 tests; the browser layer verifies rendered UI with real
  layout, CSS and Blueprint overlays.
- The story coverage is a growing matrix; later layers add table, filter,
  export and planner stories. It is not 100% code coverage.
