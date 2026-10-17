---
"poi-plugin-navy-staff": major
---

Replace the existing npm placeholder with the standalone **Navy Staff** sortie
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
