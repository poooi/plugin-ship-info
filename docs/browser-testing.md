# Browser testing

The plugin has two independent UI test layers:

| Layer | Runner | State | Scenarios |
| --- | --- | --- | --- |
| Node/jsdom | `pnpm test` (`vp test run`) | jsdom via `tests/setup.ts` | Persistence, selectors, reducers, CSV, and UI integration |
| Browser | `pnpm run test:browser` (`vitest run --config vitest.browser.config.ts`) | Real Chromium via Playwright | Every story across 15 story files |

The browser project is deliberately a separate Vitest config. It does **not**
inherit `tests/setup.ts` or the jsdom geometry stubs in `tests/ui/mocks.tsx`,
and it keeps the Node/jsdom suite passing.

Filtering and sorting are tested through the real table and its exported row
IDs. The unused legacy filtering selector and its eight dedicated tests were
removed; the filter and table stories continue to cover their user-visible
behaviors. See [post-split simplification](post-split-simplification.md).

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

- Plugin source lives in `packages/ship-info/src/` and the private shared
  package in `packages/shared/src/`. The root `tests/`, `stories/` and
  `preview/` layers import them through those package paths; there is no
  compatibility barrel at the old locations.
- Storybook config lives in `.storybook/` (`main.ts`, `preview.tsx`,
  `ambient.d.ts`).
- `preview/` is the browser integration layer:
  - `preview/aliases.ts` maps poi's runtime host modules and the node built-ins
    the plugin graph imports to pure browser adapters.
  - `preview/adapters/` holds those adapters: Electron clipboard/files/save
    dialog/capture logs, in-memory `fs-extra`, `path`, `url`, host selectors,
    real Blueprint overlays, and font/avatar/icon stand-ins. Kana conversion and
    Navy Staff's `modern-screenshot` renderer run from their real packages.
  - `preview/scenario.tsx` builds one environment per story. It registers the
    real reducer(s) selected by `shipInfo.plugin` (`ship-info`, `navy-staff` or
    `both`) under their plugin keys, points `views/create-store` at the live
    store, and (when a story opts in via `shipInfo.lifecycle`) starts the real
    persistence lifecycle for each selected plugin against that store.
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
    plugin: 'ship-info',            // 'ship-info' | 'navy-staff' | 'both'
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
`preview/scenario.tsx` and host call logs via `preview/adapters/logs.ts`.
Image stories decode the recorded PNG data URLs for pixel and dimension checks.

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

### Navy Staff planner views

These story exports live under `NavyStaff/Area`, `NavyStaff/ShipGrid` and
`NavyStaff/Capture`; the `Area/…`, `ShipGrid/…` and `Capture/…` names below are
the export names.

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
| `Capture/AreaFullHeightImage`, `ListFullHeightImage`, `GridFullHeightImage` | All three shared views capture 300 ships with real Chromium rendering, full PNG height, and an `oklch` pixel marker below the viewport; opened text references render identical content and can also save images. Main/detached windows and light/dark themes are exercised. |
| `Capture/ImageFailureCanRetry` | A PNG write failure shows adjacent feedback and retry succeeds. |
| `Capture/ImageSaveCanCancel` | Cancel leaves no file or error; retry saves PNG bytes using a meaningful default filename. |
| `ShipGrid/StableListLight`, `StableListDark` | Level order survives assignments and undo/redo; assigned rows are tinted with their area's color marker, Apply clears selection even for no-op batches, and list help describes batch removal. |
| `Integrated/StickyFiltersWide`, `StickyFiltersNarrow` | Scrolled list/grid filters cover the top padding gap; page navigation has roomier horizontal padding without overflowing. |
| `Capture/HistoricalImageIgnoresEditorFilters` | Historical sharing preserves the captured level and ignores editor filters. |
| `References/KanaRomajiAndFuzzySearch` | Plan and reference search normalize kana variants and romaji, and tolerate a typo using real wanakana. |
| `References/PasteFromClipboard` | Paste fills the draft before explicit Open; failed clipboard reads preserve both the draft and reference, and retry succeeds without editing the workspace. |
| `Integrated/FleetBadgesInPlanningViews` | All three planning views follow current fleet membership; history and sharing omit live fleet badges without changing workspace data. |
| `ActualTags/ActualAndPlannedAreIndependent` | Actual game tags coexist with different plan assignments in all three views; plan edits and game updates stay independent, and history/sharing exclude live tags. |
| `ActualTags/MissingTagMetadata` | A known game tag without host metadata remains visible by tag number. |
| `ActualTags/DenseTagsDark`, `DenseTagsLight` | Actual tags and plan assignments fit the 300-ship roster at 480px in both themes. |
| `ActualTags/TranslatedPortraitTags` | Long translated actual tags fit portrait cards; full tooltips remain reachable and tag clicks still apply the planned destination. |

### Navy Staff

The planner surface now lives in `poi-plugin-navy-staff` with its own main view,
so the old `Sidebar/Planner/*` stories render `NavyStaff/*` directly (no sidebar
button or modal) with `shipInfo.plugin: 'navy-staff'`.

The interface has three primary pages: Plan, Reference, and Share. History and
Update from game (synchronization) are tasks inside Plan. Area View, Ship List,
and Grid Palette are the three presentations of the plan.
Workspace rename/duplicate/delete sit in a workspace-actions menu with
rename/delete dialogs; the palette is a single "Assign to" select. The reference
stories open the Reference page; sharing stories open Share. Dense visual scenarios
(`NavyStaff/Integrated/DensePlan*`) render a 300-owned-ship / ten-area fixture
and assert density, no horizontal overflow, last-group reachability, both
themes, portraits, long names, and per-page scroll restoration.

| Story export | Asserts |
| --- | --- |
| `NavyStaff/Integrated/DensePlanWide` / `DensePlanMedium` / `DensePlanNarrow` | 300 cards render at 1200/720/480px with no horizontal overflow and the last group reachable. |
| `NavyStaff/Integrated/DensePlanLight` / `DensePlanPortraits` / `DensePlanLongNames` | Light theme, portrait mode (artwork kept, contrast backed), and long workspace/area names. |
| `NavyStaff/Integrated/DensePlanScrollRestored` | Each page keeps its own scroll position; a first-visited page opens at the top. |
| `NavyStaff/Area/PreviewIsReadOnlyInBothViews` | A preview exposes no assignment controls and clicking/right-clicking a read-only card leaves assignments unchanged. |

| Story export | Asserts |
| --- | --- |
| `NavyStaff/Area/*`, `NavyStaff/ShipGrid/*`, `NavyStaff/Capture/*` | Planner search/type tabs, add/move/remove, tag synchronization, planning layouts, and shared reference image capture. |
| `NavyStaff/Integrated/NavyAlone` | Navy Staff alone renders its main view with no Ship Info table or sidebar present. |
| `NavyStaff/Integrated/UpgradesStoredFileAndSaves` | An unversioned Navy file upgrades to v1, retains the plan and archive, and a later UI edit saves in v1. |
| `NavyStaff/Integrated/BothPluginsIndependent` | Both plugins run on one host store with isolated slices (Navy plan vs Ship Info bookmarks). |
| `NavyStaff/Integrated/MigratedPlanSmallerMap` | A plan imported from Ship Info is retained (not truncated) when the host map has fewer areas. |
| `NavyStaff/Integrated/MigratedPlanUnloadedRoster` | A migrated plan is kept while the host roster/map data has not loaded. |
| `NavyStaff/Integrated/DetachedDisplayOptionUsesGlobalConfig` | The display-fleet-name toggle works when the WindowEnv window (detached) has no `config`, using the renderer global. |
| `NavyStaff/Integrated/LocalizedNavyLabelsNoFallback` | With a Navy-only i18n instance (`fallbackLng: false`), localized Navy labels (`Add ship`, `All`) resolve from the Navy bundle without borrowing Ship Info. |

### Integrated shell

| Story export | Asserts |
| --- | --- |
| `PluginShell/MountsWithPersistedState` | The real root mounts the table and sidebar (no Deck Planner button) and the lifecycle loads the seeded file, leaving the legacy planner field untouched. |
| `PluginShell/UpgradesStoredFileAndSaves` | An unversioned Ship Info file upgrades to v1, preserves opaque legacy planner data, and a subsequent store update saves in v1. |
| `PluginShell/SavesWithoutPlannerOpen` | A plugin state change is written to the plugin file while persistence is lifecycle-owned, not UI-owned. |
| `PluginShell/CorruptFileSurfacesLoadError` | A corrupt persisted file surfaces a load error and a toast, saving stays disabled, and the source file is left untouched. |
| `PluginShell/SidebarPanelsOpenAndClose` | Columns, Filter and Export open and close. |
| `PluginShell/PlannerMovedNotice` | The original Deck Planner entry opens and closes a migration notice with plugin-list installation instructions and the full package name for manual installation, without planner controls or state changes. |
| `PluginShell/PlannerMovedNoticeLocalized` | The notice uses the Chinese name 作战参谋 and the localized poi installation labels. |
| `PluginShell/PlannerMovedNoticeJapanese` | The migration notice and Navy-only title translation agree on 作戦参謀, with list installation directions and the literal npm package ID. |
| `PluginShell/PlannerMovedNoticeKorean` | The migration notice and Navy-only title translation agree on 작전참모, with list installation directions and the literal npm package ID. |
| `PluginShell/FilterAffectsTableAndExport` | Unchecking all ship types empties the table and the exported CSV (header only); restoring brings back the exact sorted ids. |
| `PluginShell/ColumnVisibilityAffectsTable` | Hiding a column removes it from the table while its config card remains. |
| `PluginShell/ResetRemountsFreshRoot` | After hiding a column, copying the clipboard and exporting a file, a remount shows the original rows/columns again with empty config, clipboard and file logs. |
| `PluginShell/ToolbarSettingsSurviveReset` | Theme/locale resolved by the owning decorator drive the rendered surface; changing them after first render rerenders the real root, a localized column toggle mutates the table, and a reset keeps the resolved theme/locale while clearing config and host logs. |

## Honest boundaries

- This is **not** real Electron end-to-end verification, and not 100% code
  coverage. Electron, the filesystem, and the save dialog are in-memory
  adapters; the browser suite verifies the plugin's rendered UI and its calls
  into those boundaries.
- Navy Staff capture uses the real `modern-screenshot` renderer. Stories check
  decoded PNG dimensions and modern-color pixels below the viewport. Save
  dialogs and PNG file writes are recorded by adapters; this does not verify
  poi's actual OS save dialog or its installed fonts and theme.
- Host-provided images/fonts are deterministic stand-ins (Blueprint icons,
  placeholder boxes, data-URI SVG) so previews make no external requests.
- Each plugin's persistence lifecycle (read on `pluginDidLoad`, subscribe to the
  store, serialized `FileWriter`) is started only for integrated stories that opt
  in via `shipInfo.lifecycle`; component-only stories do not run it. Loads and
  saves go through the in-memory `fs-extra` adapter, so a corrupt file, a
  migration, or a state-change-triggered write is exercised for real (see the
  `PluginShell` and `NavyStaff/Integrated` stories) without touching the user's
  disk. Ship Info and Navy Staff use separate files, plugin keys and one writer
  each.
- Navy Staff legacy migration (reading `poi-plugin-ship-info.json` once when its
  own file is absent) is exercised against the in-memory fs. It is not verified
  against a live poi installation.
- The browser suite runs Chromium only; the RTL, scroll and pin assertions are
  Chromium-specific. There is no pixel-diff/screenshot comparison.
- `pnpm test` (Node/jsdom) remains the source of truth for reducer/selector
  logic, the persistence/migration lifecycles, and the real file-writer
  reads/writes.
