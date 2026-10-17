# Navy Staff interface

Navy Staff is a planning tool inside poi. Its interface uses poi's typography,
Blueprint components, and light/dark themes. The plan is the main working
surface; managing a workspace, inspecting history, synchronizing game data, and
sharing a reference are separate tasks.

## Navigation

The workspace selector remains visible across pages. New workspace is a direct
action; rename, duplicate, and delete belong in the workspace menu. Rename and
delete use focused dialogs, with the affected workspace identified before
confirmation. Undo and redo remain reachable without opening history. Duplicate
is unavailable during a historical preview because it copies the editable
workspace, not the previewed revision.

| Page | Purpose |
| --- | --- |
| Plan | Edit assignments in Area View or Ship Grid; choose fleet labels and save an image. |
| History | Compare revisions with a plan preview alongside the revision selector, or restore an earlier state. |
| Synchronize | Review and explicitly accept newer area information or actual sortie tags. |
| Share & reference | Export the selected plan, or open a shared snapshot for read-only reference. |

Area View and Ship Grid are two presentations of the same plan, so their
switch belongs inside Plan. Sharing controls do not sit below the roster.
The reference page remains available without a loaded account or workspace.
An empty plan provides a route to Synchronize to set up areas; unavailable host
metadata explains why that setup cannot proceed yet.

A historical preview must be recognizable outside History. The persistent
preview notice offers an exit, and exporting identifies the selected historical
state. Changing pages does not restore a revision, create a revision, or write
the account file. Imported references and import drafts survive page changes
within the mounted plugin view; they are not saved as workspaces.
The selected plan view, assignment destination, and synchronization draft also
survive navigation. Switching workspace or account clears the destination, and
synchronization retains its existing source/session invalidation rules.
History renders captured revision data even at the editable cursor; today's
unassigned roster belongs to Plan.

## Layout and density

Cards size themselves from the plugin's available width, not the browser's
viewport. The original Ship Info planner opened in an `80vw` dialog; Navy Staff
uses a plugin panel, which can be narrow inside a wide application window.
Retaining the original viewport breakpoint could therefore select ten columns
for a panel only wide enough for a few readable cards.

Ship names and levels need enough room to scan. Assignment colors remain
visible, with a readable text background when portraits are enabled. Long
names have a full-name hover label. The assigned area (or Unassigned) is also
available as text, so assignment is not communicated through color alone.
Keyboard focus and activation remain
available for editable cards. Historical and imported views remain read-only.

Area panels use consistent padding and separation, with the area label and
add-ship action in the header. A panel is not styled as a clickable card unless
the entire panel performs an action. Counts and group headings describe the
content; occasional help does not occupy a permanent full-width notice above
every plan.

The grid's assignment destination uses a labeled Blueprint select. A long
event's area list must not turn the sticky control into several rows of buttons
that obscure the ships while scrolling.

## Verification

Use populated Storybook scenarios to inspect the real plugin components at
narrow, medium, and detached-window widths. Use **300 owned ships** as the
visual baseline, including repeated master IDs, varied levels, assigned and
unassigned ships, and uneven assignments across multiple areas. Include long ship
and area names, both themes, localized controls, portrait and text-only cards,
empty workspaces, and historical previews. Check menus and dialogs as well as
the initial page.

Browser checks cover navigation, retained reference state, assignment behavior,
and overflow. Screenshots need human visual review in addition to passing those
checks. Storybook substitutes poi services and artwork; it does not establish
that the real Electron host has rendered the build correctly. See
[browser-testing.md](browser-testing.md) for those boundaries.
