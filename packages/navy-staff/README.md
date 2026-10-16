# poi-plugin-navy-staff

Navy Staff plugin for [poi](https://github.com/poooi/poi).

Localized display names:

| Language | Name |
| --- | --- |
| English | Navy Staff |
| Japanese | 作戦参謀 |
| Korean | 작전참모 |
| Simplified Chinese | 作战参谋 |
| Traditional Chinese | 作戰參謀 |

The package name remains `poi-plugin-navy-staff`.

Plans which ship girls to send to each sortie area, with an area view and a ship
grid view, manual add/move/remove, and an image export in detached windows. Live
sortie tags are never applied automatically; they will be offered through an
explicit synchronization action in a later layer.

The main view shows the planner tabs directly. It owns its own plugin state and
saved file (`poi-plugin-navy-staff.json`) and imports an existing sortie plan
from Ship Info's legacy data the first time it runs.

Each workspace keeps a linear operation history. Undo and redo move the editable
cursor, a new edit discards the redo tail, and selecting an earlier revision
opens a read-only preview (captured records only). Restoring a previewed revision
appends one new undoable revision. History previews are transient and never
write to the saved file.

Saved files use format `version: 2`, with independent workspaces and captured
area labels and colors. Existing unversioned and v1 plans migrate on load,
preserving their assignments and opaque archive. Ship Info imports accept its
unversioned and v1 formats and leave the source untouched. Only a missing Navy
file triggers an import; if both files are missing, Navy Staff creates an empty
workspace collection. Unsupported newer formats are left untouched and reported
as load errors.

Create, rename, duplicate, switch, and delete workspaces from the planner.
Captured areas and saved ships remain visible when the host event or roster
changes. New workspaces associate with the loaded account; live ship details
are shown only for the matching owner. Imported legacy plans retain unknown
ownership until explicitly associated with an account.

## Install

The npm package `poi-plugin-navy-staff` already exists as a placeholder. The
planner implementation in this repository has not yet been released there.

Once the planner release is available and Navy Staff is added to poi's plugin
list, open **Settings → Plugins**, find **Navy Staff** and click **Install**.
For manual installation, use **Install directly from npm**, enter
`poi-plugin-navy-staff` and click **Install**. Manual installation also requires
the planner implementation to have been released.

poi provides React, Redux, Blueprint and the other host UI libraries at runtime;
this package bundles the rest of its implementation.

## Development

Developed in the repository's pnpm workspace. See the repository
[README](https://github.com/poooi/plugin-ship-info#readme) for commands and
[docs/plugin-split-design.md](https://github.com/poooi/plugin-ship-info/blob/master/docs/plugin-split-design.md)
for the split design.

## License

MIT
