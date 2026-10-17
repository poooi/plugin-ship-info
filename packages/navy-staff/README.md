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

Plans which ship girls to send to each sortie area, with an area view, a ship
list for batch assignment, and a grid palette for individual assignment. Live
sortie tags are never applied automatically. Separate actions preview and apply
updates to area information and actual sortie tags as undoable revisions.

The interface separates **Plan**, **Reference**, and **Share**. Workspace actions,
undo/redo, history, and updates from the game belong to Plan. The ship list lets
you select ships and apply a destination or remove their assignments together;
one undo reverses the batch. The grid palette retains individual click-to-assign
controls. Share provides text sharing and image capture in detached windows.

The main view shows the planner tabs directly. It owns its own plugin state and
saved files (`poi-plugin-navy-staff/<member ID>.json`), one per teitoku. The first
account file imports an existing sortie plan from Ship Info's legacy data; once
an account file exists, later accounts start empty. The Ship Info source stays
untouched. No unscoped Navy Staff file is imported because Navy Staff has not
been released.

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
changes. Workspaces belong to their account file without a separate binding
step. Live ship details are shown only while the loaded file matches the host
account and its roster is available.

Share the current plan or a historical revision as compressed text, then
copy it or save it to a text file. Paste or open a reference inside the plugin
to view it read-only without changing any workspace. References contain master
IDs and levels, captured area labels and colors, and timestamps. Names and types
come from poi's current master data; missing masters display `???` while keeping
the ID and level. Only the exact current reference version is accepted.
Website viewing and QR generation are not included.

An opened reference is independent of generated share output. Sharing your own
plan does not replace the reference you are consulting. Shared text is for
read-only viewing, not for restoring an editable workspace.

## Install

The npm package `poi-plugin-navy-staff` already exists as a `1.2.0`
placeholder. The repository baseline is normalized to that version so the first
planner release bumps above the placeholder instead of publishing the
provisional repository version. The planner implementation in this repository
has not yet been released there.

Once the planner release is available and Navy Staff is added to poi's plugin
list, open **Settings → Plugins**, find **Navy Staff** and click **Install**.
For manual installation, use **Install directly from npm**, enter
`poi-plugin-navy-staff` and click **Install**. Manual installation also requires
the planner implementation to have been released.

Release notes are generated in [CHANGELOG.md](CHANGELOG.md) from `.changeset`
intents by the repository release workflow; see the repository
[release guide](https://github.com/poooi/plugin-ship-info/blob/master/docs/releases.md).

poi provides React, Redux, Blueprint and the other host UI libraries at runtime;
this package bundles the rest of its implementation.

## Development

Developed in the repository's pnpm workspace. See the repository
[README](https://github.com/poooi/plugin-ship-info#readme) for commands and
[docs/plugin-split-design.md](https://github.com/poooi/plugin-ship-info/blob/master/docs/plugin-split-design.md)
for the split design.

## License

MIT
