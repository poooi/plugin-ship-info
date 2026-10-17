# poi-plugin-ship-info

## 9.0.0-beta.0

### Major Changes

- Move the built-in Deck Planner to the separate **Navy Staff** plugin
  (`poi-plugin-navy-staff`). Ship Info continues to provide the ship information
  table, filters, column settings, bookmarks, and CSV export.

  The former planner area now explains the move. Install Navy Staff from poi's
  **Settings → Plugins** list when available, or use **Install directly from npm**
  with `poi-plugin-navy-staff` after the planner release is published.

  Ship Info preserves the old planner data in its saved file. Navy Staff imports
  that plan when it first creates an account file, leaving the Ship Info source
  untouched. Users who rely on the planner need to install Navy Staff separately.

### Patch Changes

- Package each plugin independently with Vite+ and tsdown. Bundle shared plugin
  code while keeping poi-provided UI libraries external, and include each
  plugin's own translations and resources.

  Tie saved-state loading and queued writes to the plugin lifecycle. Add explicit
  saved-file format versions and ordered migrations for older data; Ship Info
  retains legacy planner data for Navy Staff to import.

- Rename the private shared workspace package to `@poi-plugins/shared`, align the third shared fleet icon with the supplied SVG crop, and remove the unused Ship Info fleet PNGs and their packaging entry.

  Consolidate the Navy Staff share and reference tools into single generated/open result objects, remove the unused reference-open callback, the history share view argument, and a dead workspace helper, and delete four obsolete translation keys.

- Update the ship table to TanStack Table 9 and refresh its virtualization and
  state dependencies. Keep column controls aligned with poi's Blueprint styling
  by using the host's class names, and remove obsolete derived table data so
  filters and rows use the current host state directly.

- Make the ship-type and sally-area filter views reference-stable with narrow memoized inputs, so unrelated store updates no longer rebuild their derived objects and the current language is threaded through explicitly.

  Pass the title-cell and per-cell styling flags as transient props and stop injecting the unused connection `dispatch`, so internal values no longer leak onto DOM elements.

<!-- Release sections are generated from .changeset intents by pnpm version -r. Do not edit released sections by hand. -->
