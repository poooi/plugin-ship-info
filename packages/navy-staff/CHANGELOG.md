# poi-plugin-navy-staff

## 2.0.0

### Major Changes

- Replace the existing npm placeholder with the standalone **Navy Staff** sortie
  planner, extracted from Ship Info. This is the first release of this planner
  implementation, with localized names including 作戦参謀, 작전참모, and 作战参谋.

  - Plan assignments in area and ship-grid views, search the current roster,
    manually add, move, or remove ships, and export screenshots from detached
    windows. Ship-type searches use the selected language.
  - Create, rename, duplicate, switch, and delete independent workspaces. Store
    each teitoku's workspaces and history in a separate JSON file.
  - Import the legacy Ship Info plan once, when the first Navy Staff account file
    is created. Keep the source file untouched; subsequent accounts start empty.
  - Keep an operation history per workspace, with undo, redo, read-only previews,
    and restoration of a past revision as a new undoable operation.
  - Capture area labels and colors so plans remain readable after event data
    changes. Preview and manually apply new area information or actual sortie
    tags as undoable revisions.
  - Export a plan or historical revision as versioned, Brotli-compressed share
    text or a text file, and open shared references read-only inside the plugin.
    References contain ship master IDs and levels, without artwork or embedded
    master data. Names come from poi's current master data; missing entries show
    `???`. Other reference format versions are rejected. Website viewing and QR
    generation are not part of this release.

### Minor Changes

- Add a searchable ship list with multi-selection and batch assignment alongside the grid palette. Apply or remove assignments as one undoable operation, and require an explicit palette destination before changing a ship.

### Patch Changes

- Organize Navy Staff into Plan, Reference, and Share pages, with history and game updates inside Plan. Use compact navigation buttons and a view selector to distinguish plugin navigation from poi's tabs. Improve readability with responsive ship cards and roomier area panels, clarify area label choices, and fix share hints in poi's translation loader. Keep opened references independent from generated share text. Simplify sharing and reference layouts, place feedback beside the relevant controls, and fix text copying with newer Electron versions. Support kana, romaji, and fuzzy ship search. Unify image sharing with the decoded reference's area, list, and grid views, and replace the image renderer to support modern CSS colors and full-height captures in main and detached windows.

  Group shared ship cards by captured area and omit visible ship IDs from all shared views and images.

  Close the gap above the sticky planning filters so scrolled cards cannot peek through below the navigation.

  Keep the planning list in stable level order, clear selection after applying assignments, and tint assigned rows. Add roomier page navigation and accessible icon-only view switches, clarify original/translated area labels, and tailor help to the selected view.

  Suggest meaningful PNG filenames using the plan title, view, and save time.

  Add area-color markers to planning list rows, rename the sharing entry to Start sharing, remove redundant area-label help, and add a Paste button to the reference form.

  Keep list batch actions sticky with their filters. Show current fleet-number icons in every planning view without including them in history or sharing.

  Restore live actual sortie-tag badges in all three planning views, separate from planned assignments. Keep tagged ships identifiable when host tag metadata is unavailable, without changing saved plans or the sharing format.

  Improve wording across all five languages, correct ship-type names, distinguish list and grid views, and clarify plan synchronization, assignment removal, reference plans, and sharing a historical state.

  Fix actual-tag and empty-plan translations when loaded through poi's translation-key normalization.

- Package each plugin independently with Vite+ and tsdown. Bundle shared plugin
  code while keeping poi-provided UI libraries external, and include each
  plugin's own translations and resources.

  Tie saved-state loading and queued writes to the plugin lifecycle. Add explicit
  saved-file format versions and ordered migrations for older data; Ship Info
  retains legacy planner data for Navy Staff to import.

- Rename the private shared workspace package to `@poi-plugins/shared`, align the third shared fleet icon with the supplied SVG crop, and remove the unused Ship Info fleet PNGs and their packaging entry.

  Consolidate the Navy Staff share and reference tools into single generated/open result objects, remove the unused reference-open callback, the history share view argument, and a dead workspace helper, and delete four obsolete translation keys.

<!-- Release sections are generated from .changeset intents by pnpm version -r. Do not edit released sections by hand. -->
