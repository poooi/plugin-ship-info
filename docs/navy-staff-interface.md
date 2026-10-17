# Navy Staff interface

Status: implementation on PR #603. The user accepted the temporary prototype's
functional layout, not its simulated behavior. The
[product design](navy-staff-product-design.md) records that boundary; this guide
describes the real plugin layout.

Navy Staff is a planning tool inside poi. Its interface uses poi's typography,
Blueprint components, and light/dark themes. The plan is the main working
surface; managing a workspace, inspecting history, synchronizing game data, and
sharing a reference are separate tasks.

## Navigation

Plan, Reference, and Share use an icon-and-text button group with generous
horizontal padding, visually distinct from poi's host tabs. Icon-only buttons
switch between Area View, Ship List, and Grid Palette inside Plan, and between
the corresponding read-only views in Share and Reference. Each button retains
a translated accessible name, hover hint, and explicit active state.

The workspace selector belongs to Plan. New workspace is a direct
action; rename, duplicate, and delete belong in the workspace menu. Rename and
delete use focused dialogs, with the affected workspace identified before
confirmation. Undo and redo remain reachable in Plan without opening history. Duplicate
is unavailable during a historical preview because it copies the editable
workspace, not the previewed revision.

| Page | Purpose |
| --- | --- |
| Plan | Edit assignments in Area View, Ship List, or Grid Palette. Manage workspaces, undo/redo, and open contextual History or Update from game tasks. |
| Reference | Open shared text or a file for read-only consultation; retain the reference and its search when visiting other pages. |
| Share | Share the current plan or an explicitly selected historical state as text or an image. Generated text remains independent of the opened reference. |

Area View, Ship List, and Grid Palette are presentations of the same plan, so
their switch belongs inside Plan. Sharing controls do not sit below the roster.
The reference page remains available without a loaded account or workspace.
An empty plan provides a route to Update from game to set up areas; unavailable host
metadata explains why that setup cannot proceed yet.

History is a read-only task within Plan, with an explicit return to the current
plan. Sharing a historical state passes that source explicitly to Share without
restoring it. The ordinary Plan view uses the editable cursor. Changing pages
does not restore a revision, create a revision, or write the account file.
Opened references and reference-opening drafts survive page changes
within the mounted plugin view; they are not saved as workspaces.
The selected plan view, assignment destination, and synchronization draft also
survive navigation. Switching workspace or account clears the destination, and
synchronization retains its existing source/session invalidation rules.
History renders captured revision data even at the editable cursor; today's
unassigned roster belongs to Plan. Synchronization retains its production
freshness checks and preview invalidation rules; the mock's draft behavior does
not replace those rules.

## List and palette interactions

Ship List supports search, type and assignment-status filters, checkboxes,
selection of all matching rows, and an explicit Apply action. Selecting ships
does not edit the plan. Applying a destination or removing assignments creates
one undoable batch; unchanged ships do not create extra revisions. Clear the
selection when filters or the editing context change so hidden rows cannot be
included accidentally. Applying a batch also clears selection, including a
batch that changes nothing. Rows sort by descending level, with descending
owned ID as a stable tie-breaker and unknown levels last. Assignment changes
do not reorder rows. Assigned rows have a subtle background tint in both
themes; the area name remains visible. Help describes the current view: the
list uses selection and Apply, while area/grid cards support right-click removal.

Ship search in the list, grid, add-ship picker, and references accepts names,
kana readings, romaji, and approximate spellings. Hiragana, katakana, halfwidth
kana, and letter case are normalized. Readings come from poi's current master
data and are never added to saved plans or share codes.

Grid Palette keeps destination-first, individual assignment. Choose destination
does not mutate the plan; Remove assignment is a separate action. List and grid
use the real workspace display selectors, including saved assigned ships missing
from the live roster. Ship details, eligibility, and account isolation follow the
existing production rules.

## Reference and sharing

Reference initially shows the paste field and Open/Open file actions together.
Opening a reference collapses that form. The reference title, read-only status,
close action, metadata, search, and view controls sit above the roster. Open
another reference reveals the form again; a failed replacement or cancellation
keeps the current reference. Its encoded source is available through a disclosure.

Use Share and Open reference wording. A reference never becomes an editable
workspace, and shared text is not a backup/restore format. The real codec, exact
version matching, master lookup, and unknown-name behavior remain unchanged.
Generating share text freezes a separate result; opening or closing a reference
does not replace it.

The text-sharing section keeps generation, encoded output, copy/save actions,
and outcome messages together. Generating text does not add a second roster
preview. The result retains its source label when the selected source changes.
Clipboard writes use poi's remote main-process clipboard and await completion;
regeneration is disabled during copying so a late result cannot label newer text
as copied. A failed copy leaves the generated text available for retry or saving.

Image sharing uses the same read-only renderer as an opened text reference.
Generate share text, then optionally reveal its image preview. Both use the
same frozen decoded snapshot: assignments, master IDs, and levels do not change
when the editable plan or selected source changes. Names and types still resolve
from the current poi master data, with `???` for missing masters.

Area View, Ship List, and Ship Grid are available in both the sharing preview
and opened references; each can save its displayed content as PNG. The image
includes the title, metadata, and roster, excluding controls. Editor filters
do not affect it. The preview remains collapsible rather than adding a permanent
second roster after text generation.

Ship Grid groups cards by captured area, preserving area order and showing a
heading, color, and ship count for each group. All three shared views omit
visible ship IDs, including saved images. Master IDs remain inside the compact
share data solely for resolving ship metadata; player-owned ship IDs are not
included in the share format.

Navy Staff uses `modern-screenshot` to render the complete element through
Chromium's SVG/Canvas support, including modern CSS colors such as `oklch`.
Image saving works in the main and detached windows. Capture failures appear
beside the Save to image action and allow retry. The save dialog suggests a
PNG filename containing the plan title, localized view name, and save time.
Cancelling leaves no file and does not render an image; successful saves write
the rendered PNG bytes to the selected location.

## Layout and density

Share and Reference use consistent section padding and gaps between headings,
descriptions, fields, and actions. Errors appear beside the action they describe.
Controls wrap on narrow panels; the reference close action stays with the title.

The Area labels selector offers Show original and Show translation.
It changes the displayed captured-area labels, retaining the original label
when no translation is available. It does not rename owned fleets or alter
area identity, assignments, or stored configuration keys.

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
available for editable cards. Historical and reference views remain read-only.

Area panels use consistent padding and separation, with the area label and
add-ship action in the header. A panel is not styled as a clickable card unless
the entire panel performs an action. Counts and group headings describe the
content; occasional help does not occupy a permanent full-width notice above
every plan.

The grid's assignment destination uses a labeled Blueprint select. A long
event's area list must not turn the sticky control into several rows of buttons
that obscure the ships while scrolling.
The sticky filter bar reaches the scrollport's top edge, including the body's
padding, so scrolled cards cannot show through a gap below the navigation.

## Verification

Use populated Storybook scenarios to inspect the real plugin components at
narrow, medium, and detached-window widths. Use **300 owned ships** as the
visual baseline, including repeated master IDs, varied levels, assigned and
unassigned ships, and uneven assignments across multiple areas. Include long ship
and area names, both themes, localized controls, portrait and text-only cards,
empty workspaces, and historical previews. Check menus and dialogs as well as
the initial page.

Browser checks cover navigation, retained reference state, assignment behavior,
and overflow. Localization regression checks also load keys using poi's
`escapeI18nKey` processing; new message keys avoid trailing punctuation, which
poi removes while reading translation resources. Screenshots need human visual review in addition to passing those
checks. Storybook substitutes poi services and artwork; it does not establish
that the real Electron host has rendered the build correctly. See
[browser-testing.md](browser-testing.md) for those boundaries.
