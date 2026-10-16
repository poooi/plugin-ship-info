# Browser testing

The plugin has two independent UI test layers:

| Layer | Runner | State | Scenarios |
| --- | --- | --- | --- |
| Node/jsdom | `pnpm test` (`vp test run`) | jsdom via `tests/setup.ts` | 90 tests across 11 files |
| Browser | `pnpm run test:browser` (`vitest run --config vitest.browser.config.ts`) | Real Chromium via Playwright | 89 story scenarios across 12 files |

The browser project is deliberately a separate Vitest config. It does **not**
inherit `tests/setup.ts` or the jsdom geometry stubs in `tests/ui/mocks.tsx`,
and it keeps the 90 Node/jsdom tests passing.

## Commands

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install chromium   # once per machine (CI: --with-deps)

pnpm storybook                     # interactive Storybook at http://localhost:6006
pnpm run build-storybook           # static preview in storybook-static/
pnpm run test:browser              # every browser scenario
pnpm run check                     # tsc --noEmit over both suites
pnpm test                          # the jsdom suite
```

Focused runs use real paths, e.g.:

```sh
pnpm exec vitest run --config vitest.browser.config.ts stories/planner-area.stories.tsx
pnpm exec vitest run --config vitest.browser.config.ts stories/planner-capture.stories.tsx \
  stories/planner-grid.stories.tsx stories/plugin-shell.stories.tsx
```

The browser orchestration server defaults to `127.0.0.1:5174`; when that port is
taken, override without editing the config: `... --api.port 5175`.

## Failure artifacts

On a failing scenario Vitest writes, and CI (`.github/workflows/ci.yml`)
uploads, the following:

| Artifact | Path |
| --- | --- |
| Failure screenshot (`.png`) | `.vitest/attachments/failure-screenshots/` |
| Copied attachment (trace archive) | `.vitest/attachments/` |
| Retained Playwright trace (`.trace.zip`) | `.vitest/traces/` (configured `browser.trace.tracesDir`) |

`browser.trace.tracesDir` is set to an absolute `.vitest/traces` path on purpose:
the default `stories/__traces__` directory name contains a `.stories.tsx`
segment, which Storybook then tries to index as a story module (EISDIR).

## How it is wired

- Storybook config lives in `.storybook/` (`main.ts`, `preview.tsx`,
  `ambient.d.ts`).
- `preview/` is the browser integration layer:
  - `preview/aliases.ts` maps poi's runtime host modules and the node built-ins
    the plugin graph imports to pure browser adapters.
  - `preview/adapters/` holds those adapters: Electron clipboard/files/save
    dialog/capture logs, in-memory `fs-extra`, `path`, `url`, host selectors,
    real Blueprint overlays, font/avatar/icon stand-ins, and the configurable
    `html2canvas` capture boundary.
  - `preview/scenario.tsx` builds one environment per story using the real
    plugin reducer plus `redux-thunk`, points `views/create-store` at the live
    store, and (when a story opts in via `shipInfo.lifecycle`) starts the real
    plugin persistence lifecycle against that store.
  - `preview/decorators.tsx` wraps each story in the shared providers from
    `tests/ui/environment.tsx` and a fixed-size, direction-aware surface.
  - `preview/planner-fixtures.ts` holds the tagged planner roster and the
    capture-control re-exports used by the planner/shell stories.
- Stories live in `stories/` and are discovered by both Storybook and the
  Vitest addon (`@storybook/addon-vitest`), which runs them in Playwright
  Chromium.
- Shared state fixtures come from `tests/ui/fixtures.ts`, so browser consumers
  never import the jsdom geometry code.

Host boundaries are in-memory adapters (clipboard, files, save dialog, capture,
host images, toast); the real plugin reducer, selectors, UI components,
Redux/Jotai, i18n, Blueprint overlays and browser layout run unchanged. Each
scenario gets a fresh environment and reset host call logs — see
`ResetRemountsFreshRoot`. Mounting the UI no longer loads or saves by itself, so
only integrated root stories opt into `shipInfo.lifecycle`; component-only
stories stay persistence-free.

## Scenario parameters

Stories declare a typed `parameters.shipInfo`:

```ts
parameters: {
  shipInfo: {
    state: plannerScenarioState(),  // Redux host state (defaults to tableState())
    isMain: true,                   // main window vs detached window
    lifecycle: false,               // opt in to the real load/save lifecycle
    files: { '/data.json': {} },    // seed the in-memory fs (read by the lifecycle)
    saveDialog: { canceled: false, filePath: '/out.csv' },
    fileWriteError: false,          // make the fs adapter reject writes
    direction: 'ltr',               // 'ltr' | 'rtl' scenario surface
    dimensions: { width: 720, height: 640 },
    theme: 'dark',                  // override the toolbar global
    language: 'ja-JP',              // override the toolbar global
  },
}
```

Toolbar globals switch theme (`dark`/`light`) and locale
(`en-US`/`ja-JP`/`ko-KR`/`zh-CN`/`zh-TW`). In dark mode the Blueprint dark
class is applied to the preview body so portaled overlays are themed too.

Play functions read the active environment via `getEnvironment()` from
`preview/scenario.tsx`, the host call logs via `preview/adapters/logs.ts`, and
the capture requests via `preview/planner-fixtures.ts`.

## Coverage matrix

Every entry below is a story export executed in Chromium against the real UI.
The listed behavior is what the play function actually asserts.

### Columns

| Story export | Asserts |
| --- | --- |
| `ColumnConfig/DefaultVisibilityTogglesOff` | First click on a default-visible column sets `columnVisibility.column=false` and dims its card. |
| `ColumnConfig/ExplicitHiddenTogglesBackOn` | An explicit `false` value toggles back to visible. |
| `ColumnConfig/PinAndUnpin` | Pin persists `{ left: [...], right: [] }`; unpin removes it. |
| `ColumnConfig/ReorderAndBoundaries` | Move up/down persists `columnOrder`; boundary buttons are disabled. |
| `ColumnConfig/ResetRestoresDefaults` | Reset persists default order/visibility/pinning. |
| `ColumnConfig/ComputedCheckboxCss` | Real Blueprint control/indicator CSS aligns and zeroes margins; hidden columns dim. |
| `Columns/OpensScrollsAndDismisses` | Real popover opens, scrolls an overflowing list, and Escape dismisses it. |

### Table

| Story export | Asserts |
| --- | --- |
| `Workflows/DefaultSortOrder` | Default level-descending row order. |
| `Workflows/HeaderClickSorts` | Header click writes new sort rules and re-sorts. |
| `Workflows/HeaderKeyboardSorts` | Enter on a sortable header sorts via keyboard. |
| `Workflows/NonSortableHeaderIgnored` | Clicking a non-sortable header does nothing. |
| `Workflows/HiddenAndReorderedColumns` | Hidden/reordered columns render from the store. |
| `Workflows/VirtualizationRetainsIds` | Scrolling changes painted rows but the exported id set stays complete. |
| `Workflows/HorizontalScrollKeepsPins` | Start pin offset stays fixed while scrolling (LTR). |
| `Workflows/RtlPins` | Start/end pins follow RTL direction while scrolling. |
| `Workflows/CellHighlightInteraction` | Click, keyboard and context-menu highlight/clear cells. |
| `Workflows/EmptyData` | Empty host data renders no rows. |
| `Workflows/HostUpdateWhileFilterActive` | A host ship update while a filter is active refreshes rows. |
| `Display/EquipmentAndTooltips` | Equipment normal/extra slots, upgrade and proficiency tooltips. |
| `Display/StatusTagsAndRepair` | Fleet icon, sally tag and repair status. |
| `Display/AvatarEnabled` / `Display/AvatarDisabled` | Avatar column follows the host appearance config. |
| `Display/DarkTheme` / `Display/LightTheme` | Blueprint dark class applied/removed. |
| `Display/NarrowLayout` / `Display/WideLayout` | Horizontal scroll vs fitting layout. |
| `Display/TranslatedLocale` | Translated locale renders localized copy. |

### Filters

| Story export | Asserts |
| --- | --- |
| `Controls/PopoverOpens` | Filter popover opens with all control groups. |
| `Controls/ShipTypeIndividualToggle` | Toggling one type filters rows. |
| `Controls/ShipTypeGroupToggle` | Toggling a super-type group filters rows. |
| `Controls/ShipTypeAllNone` | All/None toggles every row. |
| `Controls/ShipTypeContextMenuExclusive` | Right-click exclusively selects one ship type. |
| `Controls/SallyAreaToggle` / `SallyAreaFreeToggle` / `SallyAreaAllNone` | Sally-area checks filter tagged ships. |
| `Controls/SallyAreaFleetNameDisplay` | `displayFleetName` relabels areas from `fleetname`. |
| `Controls/LevelSliderCommitsAndFilters` | Slider commits a level limit (debounced) and clears, restoring rows. |
| `Controls/SallyMapCountChanges` | Host map-count changes update the filter. |
| `YesNo/Locked`, `YesNo/Expedition`, `YesNo/InFleet`, `YesNo/Sparkle`, `YesNo/ExtraSlot`, `YesNo/Daihatsu`, `YesNo/Modernization`, `YesNo/Remodel` | Each of the eight Yes/No filters independently changes config and rows. |
| `RawValue/AllRawValueModesChangeRenderedValues` | Raw-value radio modes change config and rendered values. |

### Export

| Story export | Asserts |
| --- | --- |
| `Controls/ClipboardCurrentFilteredAndAll` | Current filtered list vs all rows land on the clipboard. |
| `Controls/EmptyCurrentList` | Filtering to zero rows exports the header only. |
| `Controls/SeparatorAndLineBreak` / `Controls/TabSeparator` | Separator and LF/CRLF choices change the actual payload. |
| `Controls/SaveDialogCanceled` | Cancel writes nothing. |
| `Controls/SaveDialogSuccess` | Success writes the actual CSV through the fs boundary. |
| `Controls/SaveDialogFailure` | A rejected write logs the error without a success path. |

### Planner

| Story export | Asserts |
| --- | --- |
| `Area/OpensAndClosesDialog` | Dialog opens with Area/Ship Grid tabs and the close button dismisses it. |
| `Area/TabsSwitchBetweenAreaAndGrid` | Tabs swap the visible planner surface. |
| `Area/EmptyEventAndFleetData` | No maps and no ships render no areas/cells. |
| `Area/AreaInitialization` | Areas initialize to the host map count. |
| `Area/AreaResizeTrimsExtraAreas` | Extra planned areas are trimmed to the map count. |
| `Area/AreaResizeLiveOnHostMapChange` | Areas expand/contract after a live host map-count change. |
| `Area/AddShipBySearchAndSelect` | Searching then selecting a row adds the ship. |
| `Area/SearchByNameYomiAndRomaji` | Search matches name, yomi and romaji. |
| `Area/SearchClearAndTypeTabs` | Clear resets the query; type tabs filter the list. |
| `Area/SearchWithNoResults` | A no-match query shows no selectable rows; clearing restores them. |
| `Area/SearchExcludesSelectedAndTagged` | Selected/tagged ships never appear in results. |
| `Area/SearchRefreshesOnSameCountHostDataChange` | A same-count host rename is searchable immediately (regression: stale Fuse index). |
| `Area/SearchSelectWithKeyboard` | Keyboard selects a result and dismisses the popover. |
| `Area/AddMoveAndRemoveChips` | Add a chip, move it between areas, then remove it. |
| `Area/UntaggedChipContextRemove` | Right-click removes an untagged chip. |
| `Area/TaggedChipStaysAuthoritative` | Tagged chips ignore context-remove and are restored after removal. |
| `Area/RefreshReconcilesTagsAndRemovedShips` | Refresh reconciles host tags and removed ships. |
| `ShipGrid/GroupsShipsBySuperType` | Grid cells group under each super-type heading. |
| `ShipGrid/PaletteAssignMoveAndErase` | Palette assigns, moves and erases a cell. |
| `ShipGrid/ContextMenuRemovesCell` | Right-click removes a cell. |
| `ShipGrid/TaggedShipIsProtected` | Tagged ships ignore pointer, context-menu and keyboard activation. |
| `ShipGrid/KeyboardAssignsCell` | Enter on a cell assigns it. |
| `Capture/MainWindowHidesCapture` / `Capture/DetachedWindowShowsCapture` | Capture is offered only in a detached window. |
| `Capture/AreaCaptureSuccessDownloadsImage` | Capture targets the area element, sizes from its rect, and downloads. |
| `Capture/GridCaptureUsesGridElement` | Grid capture targets the grid cells, not toolbar/palette. |
| `Capture/CaptureRejectionLogsAndDoesNotDownload` | A rejected capture logs and downloads nothing. |

### Integrated shell

| Story export | Asserts |
| --- | --- |
| `PluginShell/MountsWithPersistedPlanner` | The real root mounts the table and sidebar; the lifecycle loads the seeded planner file. |
| `PluginShell/SavesWithoutPlannerOpen` | A plugin state change is written to the plugin file with the planner dialog closed (saving is lifecycle-owned, not UI-owned). |
| `PluginShell/CorruptFileSurfacesLoadError` | A corrupt persisted file surfaces a load error and a toast, saving stays disabled, and the source file is left untouched. |
| `PluginShell/SidebarPanelsOpenAndClose` | Columns, Filter, Export and the planner open and close. |
| `PluginShell/FilterAffectsTableAndExport` | Unchecking all ship types empties the table and the exported CSV (header only); restoring brings back the exact sorted ids. |
| `PluginShell/ColumnVisibilityAffectsTable` | Hiding a column removes it from the table while its config card remains. |
| `PluginShell/ResetRemountsFreshRoot` | After hiding a column, copying the clipboard and exporting a file, a remount shows the original rows/columns again with empty config, clipboard and file logs. |
| `PluginShell/ToolbarSettingsSurviveReset` | Theme/locale resolved by the owning decorator drive the rendered surface; changing them after first render rerenders the real root, a localized column toggle mutates the table, and a reset keeps the resolved theme/locale while clearing config and host logs. |

## Honest boundaries

- This is **not** real Electron end-to-end verification, and not 100% code
  coverage. Electron, the filesystem, the save dialog and capture are in-memory
  adapters; the browser suite verifies the plugin's rendered UI and its calls
  into those boundaries.
- Capture uses a configurable stub renderer. The stories verify the intended
  element, the sizing options, the download call and the rejected path; they do
  not validate the vendored `lib/html2canvas` renderer's output.
- Host-provided images/fonts are deterministic stand-ins (Blueprint icons,
  placeholder boxes, data-URI SVG) so previews make no external requests.
- The plugin's persistence lifecycle (read on `pluginDidLoad`, subscribe to the
  store, serialized `FileWriter`) is started only for integrated stories that opt
  in via `shipInfo.lifecycle`; component-only stories do not run it. Loads and
  saves go through the in-memory `fs-extra` adapter, so a corrupt file or a
  state-change-triggered write is exercised for real (see the `PluginShell`
  stories) without touching the user's disk.
- The browser suite runs Chromium only; the RTL, scroll and pin assertions are
  Chromium-specific. There is no pixel-diff/screenshot comparison.
- `pnpm test` (Node/jsdom) remains the source of truth for
  reducer/selector logic, the persistence lifecycle, and the real file-writer
  reads/writes.
