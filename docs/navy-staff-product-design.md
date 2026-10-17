# Navy Staff product design

Status: the user has accepted the prototype's functional layout for implementation.
The prototype is not an authoritative specification of plugin behavior. This
document inventories the existing capabilities and proposes how people
should use them. It is not a description of a completed interface. It revisits
the navigation in PR #603; the persistence, history, synchronization, and share
format contracts in [the workspace design](navy-staff-workspaces-design.md)
remain in force.

## Approved implementation boundary

Apply the Plan / Reference / Share layout, contextual history and update tasks,
and separate ship list and grid palette to the real plugin. The user explicitly
requested multi-selection followed by batch application in the list. Keep the
real persistence, account isolation, history, synchronization validation,
reference codec, master-data resolution, and host screenshot integration.
Separate opened reference state from generated share output as required by the
two destinations.

Other details explored in the temporary mock are proposals, not automatically
approved functionality. Do not copy its simulated data, local-only storage,
demo sharing format, screenshot renderer, or arbitrary behavior into production.
In particular, this layout work does not introduce new image-scope modes,
workspace naming rules, migrations, or synchronization rules. Record the actual
implemented behavior in [the interface guide](navy-staff-interface.md).

## Product purpose

Navy Staff helps a player decide which owned ships to reserve for each sortie
group, revise that decision during an event, and consult or share a plan.
It does not deploy fleets, change actual game tags, or optimize compositions.

The central object is a **plan**: one workspace with its own assignments,
captured area information, and history. There is no project above a workspace.
An area is a planning group derived from a sortie-tag slot; it is not necessarily
one geographical map or one of the player's active in-game fleets.

Three kinds of information must remain distinguishable:

| Information | Meaning | Can the user change it here? |
| --- | --- | --- |
| Current plan | The user's intended assignments | Yes; edits are saved and undoable |
| Historical state | A captured state of that plan | View only, until explicitly restored |
| Reference | A shared snapshot opened for consultation | View only; it never becomes an editable plan |

Actual sortie tags are game facts. Plan assignments are intentions. A matching
color must not imply that the plan has been applied in the game.

## Existing capabilities

The inventory below describes the implemented capability, including the
interface on PR #603. Proposed changes are listed separately later.

| Capability | Available today | Current interaction problem |
| --- | --- | --- |
| Multiple plans | Create, select, rename, duplicate, delete; separate files per account | Management actions compete with the main planning task |
| Area view | Inspect assignments by captured area; add an unassigned ship, move or remove an assigned ship | Dense repeated labels make a large plan hard to scan |
| Ship grid | Inspect saved assigned ships plus eligible live ships by type; choose a destination and click ships to assign them | No main-grid search/filter; the default `None` destination also means removal |
| Ship picker | Search and filter the live unassigned roster by type | Finding a ship already assigned elsewhere requires another path |
| History | Undo/redo, preview captured revisions, restore as a new edit | Preview is a global mode that changes other pages and the share source |
| Area snapshots | Keep labels, colors, and assignments when host event data changes or disappears | The distinction between saved information and the current source is not prominent |
| Area update | Review mapping and metadata changes; apply as one undoable operation | Its purpose is obscured by the generic word "synchronize" |
| Actual tags | Review mapping and proposed ship moves from the game; apply as one undoable operation | Easy to confuse with updating area labels or changing game state |
| Image share | Save the displayed planning view as a PNG in a detached plugin window | Separate from other share actions; unavailable in the main window |
| Reference share | Generate, copy, or save a text snapshot of the current or previewed state | The source depends on a history preview elsewhere |
| Reference viewing | Open pasted text or a file; search and switch area/type views; close it | Generating shared output and opening a reference use one result slot, so generation replaces the opened reference |

There is no editable import, reference library, multi-reference comparison,
cloud sync, automatic assignment, website viewer, or production QR sharing.

## Proposed information architecture

Use three primary destinations, organized by what the user is doing:

```text
Navy Staff
  Plan
    Current plan selector + New + plan actions
    Undo / Redo / History / Update from game
    Area view, Ship list, or Grid palette
  Reference
    Open share text or file
    Read-only reference, search, area/type views
  Share
    Explicit source: current plan or a chosen historical state
    Image or share text
    Preview and output actions
```

History and updating from the game are contextual tasks inside Plan, not peer
destinations. They act on the selected plan and return the user to it. Reference
and Share have their own state and do not share an output slot.

Plan management and undo/redo are shown in the Plan context. Reference does not
display editing controls that appear to act on the opened reference. Share
shows its own source identity instead of relying on a globally selected preview.

The exact arrangement of panels, drawers, typography, cards, and colors is a
later visual-design decision. These responsibilities do not depend on it.

## Plan: the primary working task

### Start and manage a plan

- Start on the last selected plan for the active account. The existing account
  layer selects the file; do not add account binding or a project hierarchy.
- New plan asks for a name and captures available area information. It starts
  with no assignments. A user who wants actual tags can explicitly apply them.
- If no area information is available, explain that the user must load it in
  poi, then offer the existing area-update flow when it becomes available.
  Show this prerequisite in the creation flow, but allow creation without an
  additional confirmation. The empty plan cannot receive assignments until area
  information is applied. Arrival of host data enables the explicit update action;
  it does not populate the plan automatically.
  Do not introduce manual area authoring in this redesign.
- Duplicate copies the current editable plan into an independent plan with a
  fresh history, gives it an unused name such as `Event plan (copy)` or
  `Event plan (copy 2)`, and selects it. Ordinary Rename remains available without
  adding a mandatory naming step to duplication. Rename and delete live in plan
  actions. Deletion names the affected plan and confirms removal of its history;
  it is not ordinary undo.

### Three views, three tasks

| View | User's question | Main actions |
| --- | --- | --- |
| Area view | "Who have I allocated to each group?" | Add a ship, move it to another group, remove it |
| Ship list | "Which ships should I change together?" | Search, inspect assignments, select ships, and apply one batch |
| Grid palette | "Which ships should go to this group?" | Choose a destination, then click individual ship tiles to assign or move them |

All three views edit the same plan. Switching between them preserves the chosen
destination and navigation position. List and palette share search and filters;
temporary list selection is cleared when leaving the list. Ship names, levels, and assignment labels
must be available without interpreting color alone. Saved ships still assigned
in the plan remain visible when absent from the current roster, and can be moved
directly between groups. Explicit removal takes such a ship out of the plan
view; Undo or restoration of an earlier plan state can reverse that removal.
Cached display records do not become an inventory of unassigned ships or new
live-roster choices. An unavailable roster does not establish that a ship was lost.

For a 300-ship roster, add search, ship-type filtering, and
**All / Unassigned / Assigned** filtering to both Ship list and Grid palette. These are proposed
additions, not existing features. Filtering never edits a plan. "Unassigned"
means eligible live ships not allocated in this plan; assigned totals may also
include retained ships absent from the live roster.

In Grid palette, keep the existing destination-first assignment interaction:
choose the target group, then click ship tiles to assign them. Make the default **Choose destination**,
which does not mutate anything. Use a separately named **Remove assignment**
choice for clearing assignments; do not overload "None". Clicking without a
destination gives a nearby instruction to choose one. Moving to the same group
does nothing. Undo remains immediately accessible.

Area view retains its direct add and move/remove actions. Moving or removing
must have an explicit discoverable control; right-click may remain a shortcut.

Ship list uses checkboxes for selection. Show name, level, ship type, and current
group in each row; selecting a row does not change its assignment. The batch
toolbar shows the selected count, **Select all matching**, **Clear selection**,
a destination or explicitly named **Remove assignment**, and **Apply to selected**.
Select all matching covers the complete filtered result, including offscreen rows.
Apply is unavailable without a selection and a valid action. Apply the selected
changes as one history operation so one Undo reverses the batch; ships already
in the target group and removals of unassigned ships are no-ops. A wholly unchanged
batch creates no revision. Clear selection after applying.

Clear list selection when search or filters change, when leaving the list or
changing plans, and when entering history/update or using undo/redo. This keeps
the batch limited to the visible task; do not retain hidden selections. Selection
itself creates no history and is not part of shared output.

Drag-and-drop, composition recommendations, and a new ship-detail page are outside
this proposal.

### Undo and history

Undo/redo support quick corrections without opening history. History answers
"What did I change, and what did the plan look like then?" Show meaningful
operation descriptions with time and ship/area names where available; preserve
an ID fallback when names cannot be resolved.

Opening history creates a local read-only inspection task. Selecting a revision
shows its captured assignments and ship details, not today's unassigned roster.
The actions are **Return to current plan**, **Restore this state**, and
**Share this state**. Restore appends a new operation and is undoable. Existing
linear undo semantics remain: editing after undo discards the redo tail; state
that restore would discard must not be presented as retained history.

Leaving the history task returns to the editable cursor; it must not silently
leave the rest of the plugin in a global historical mode. Share this state
passes an explicit historical source to Share without restoring it. Switching
plans or accounts closes history inspection.

### Update from game

Offer two explicitly named operations under the plan's update action:

| Operation | What changes | What stays |
| --- | --- | --- |
| Update area information | Captured labels, colors, associations, and newly added groups | Existing allocations and groups absent from the new source |
| Apply actual sortie tags | Allocations for the reviewed, mapped, tagged ships | The game itself; ships/groups outside the accepted batch |

Each flow is: choose operation -> review the current source and group matching
-> inspect proposed differences -> apply or cancel -> return to the plan.
Show human-readable source and destination labels first; expose slot details
where needed to correct matching. The user confirms the intended event because
the source does not provide a verified event identity. Do not replace this with
a claimed automatic event match.

The actual-tag differences identify each affected ship by name and level, with
its old and proposed group. Keep the owned ID available to distinguish duplicate
ships and as a fallback when a name is unavailable. A list of numeric owned IDs
alone is not sufficient for a user to review a batch of moves.

The preview also supports comparison without applying anything: inspect the
differences, then Cancel. Reopening prepares a fresh comparison; this iteration
does not add a persistent discrepancy summary or a freshness indicator.

One accepted batch is one undoable operation. A pending update survives a detour
to Reference or Share for the same plan, but not a plan/account change. Returning
to it never bypasses the existing freshness check. History can be inspected while
an update is pending: suspend the update's review controls, including Apply, and
return to the same draft after inspection. Sharing a historical state during
this detour also leaves the update draft untouched; returning to Plan resumes
its review with the same freshness checks. There is still only one editable plan.
Restoring a historical state invalidates the prepared comparison; a fresh review
is required before applying the update. It must never apply against the inspected
historical state merely because that state is visible. Changes to other relevant
inputs likewise require a refreshed preview; cancel and no-op do not edit history.
Another event should usually start a new plan. Opening the plugin or receiving
new host data never silently updates assignments or captured areas.

## Reference: consult another snapshot

Open pasted share text or a text file. On success, show the reference title,
capture and generation times, a read-only indicator, and its area/type views and search.
Use **Open reference**, not language suggesting restoration or editable import.

Keep one opened reference for the plugin session. Switching to Plan or Share
preserves it, its query, view, and scroll position; returning to it should not
require pasting again. A successful new open replaces it. A failed open leaves
the previous valid reference available. Closing it clears only reference state.

There is no persistent library or simultaneous multi-reference view in this
iteration. Consulting a reference and editing one's plan uses the two retained
destinations. Wide-screen side-by-side comparison can be considered separately
if this navigation proves insufficient.

Opening a reference requires neither an active account nor an editable plan.
Only the exact current format version is accepted. Older/newer formats are
rejected; missing master data in an otherwise valid reference displays `???`
with the preserved master ID and level. No bundled catalog or artwork is added
to the share format.

## Share: let others view a plan

Use **Share**, not **Export**, throughout navigation and actions. Shared text
opens only as a read-only reference; it cannot be imported as an editable plan
or used to restore a workspace. Images are for viewing. This is sharing, not
a backup-and-restore workflow.

Share starts with a clearly identified source: plan title plus **Current plan**
or the historical operation/time selected through History. First entry selects
the current editable plan; subsequent navigation retains the source and result.
An explicit **Use current plan** action selects the editable plan again, while
sharing a historical state is an explicit path from History. This selection
must never depend on an unrelated page's hidden mode or fall back silently to
another plan.

Switching the selected plan or deleting the source plan clears an ungenerated
source. Ordinary edits do not clear a current-plan selection: generation captures
the current state at that time. If undo followed by editing removes a selected
historical revision, require the user to select a source again. This does not
discard an already generated result, whose captured content and original label
remain available.

Offer two outputs from that source:

- **Image:** select the scope, generate an exact preview, then save that result.
  **Current Plan view** preserves the selected editing presentation and its
  search/type/status filters, including eligible unassigned ships. It captures
  all matching content, not just the visible viewport. This is the default for
  a current-plan image and preserves the existing screenshot use. **Full plan**
  includes every captured group and its allocated ships, ignores editor filters,
  and offers area or ship presentation. Historical sources use Full plan only;
  they must not acquire today's roster or silently switch to the current plan.
  The preview states the scope and shows exactly what Save produces. Generation
  freezes the membership, displayed values, and presentation for that result.
  Preserve the existing detached-window restriction until host support is
  verified; explain how to use the detached plugin window when unavailable.
- **Share text:** generate a reference, inspect its summary/preview, copy the
  text or save it to a file. It contains allocated ships and captured group
  information, not the unassigned roster, account identity, or full history.

Generating output freezes that result. Later edits to the plan do not change
the text behind a visible Copy or Save button. Regeneration is explicit, and the
result identifies its source/time. A generated result belongs to Share and
does not replace the reference opened in Reference. A changed source requires
new output rather than relabeling an old result.

There is no website, QR, URL publication, or editable backup in this
iteration. Output errors remain beside the attempted action and permit retry.

## Essential state rules

| Event | Required behavior |
| --- | --- |
| Change primary destination | Retain normal view/search/scroll state; no new planning revision |
| Change selected plan | Show that plan's saved state; clear assignment destination, history inspection, and pending sync |
| Change active account | Use the existing account-file boundary; no old-account plan actions can reach the new account |
| Leave history inspection | Return to the editable plan; only an explicit share action carries historical data to Share |
| Inspect history during an update | Suspend update controls, preserve the draft, and return without applying anything |
| Restore history during an update | Invalidate its prepared comparison; require a fresh review before Apply |
| Generate shared output | Freeze a separate result; do not replace an opened reference |
| Receive host metadata or roster updates | Do not rewrite saved assignments or historical snapshots |
| No editable plan/account | Reference remains available; plan creation/live operations/share explain their specific prerequisites |
| Failed write | Display the existing save failure; do not imply the edit is safely persisted |

Account changes invalidate any ungenerated share source and pending generation.
An already generated snapshot remains a clearly labeled immutable result until
replaced or cleared; it cannot mutate either account. The independently opened
reference also remains available. No new recovery or compatibility mechanism is
introduced here.

## Scope and product acceptance

The proposed implementation work is navigation/context separation, discovery of
existing actions, independent reference/share state, a usable 300-ship search
and assignment flow, meaningful history and update labels, distinguishable plan
copies, and explicit image-share scope. Storage and share formats, automatic
synchronization, new data-management features, and appearance are not part of
this design pass.

Review the product through complete tasks before discussing styling:

1. Create an empty plan from available area data; assign ships; duplicate it to
   try another allocation without changing the first plan. Distinguish the copy
   from the original in the selector without first having to rename it.
2. In a 300-ship roster, find a named ship, identify its current allocation,
   move it in Grid palette, and undo. In Ship list, select several ships without
   editing, apply a destination, and undo the whole batch once. Verify filtered
   select-all, explicit batch removal, no-op batches, and selection clearing on
   filter/context changes. Find unassigned ships without scrolling the whole roster.
3. Inspect an older state, return without changing anything, then restore it
   and undo the restoration. Share an older state without restoring it.
4. Update area names without moving ships; separately apply reviewed actual
   tags, identify changed ships by name/level/group, undo the batch, and retain
   groups that disappeared from the source. Inspect a comparison and cancel
   without applying it.
5. Open someone else's reference, switch to one's plan, share one's own plan,
   and return to the same reference with its position intact.
6. Generate share text, edit the source plan, and verify that copying still
   copies the labeled frozen result until it is regenerated.
7. View a valid reference without master data; reject a different format version
   without replacing an already opened reference.
8. With an active account but no area data, create an empty plan and see why
   assignment is unavailable. Load the data in poi, explicitly update areas,
   then assign ships; data arrival alone never edits the plan.
9. Prepare an actual-tag update with corrected matching, inspect an older plan,
   and return with the draft intact. Restoring instead requires a new comparison
   before that update can be applied.
10. Share an Unassigned-filtered Ship list or Grid palette as an image, then share Full plan.
    Each preview matches its saved result; the former includes matching unassigned
    ships and the latter ignores that filter. Historical shares never add live
    unassigned ships.

These are proposed acceptance scenarios, not claims that the current UI passes
them. Once the product flow is agreed, use it to guide the visual design and
implementation tests.

## Design review decisions

Codex GPT-6.1-Sol and DeepSeek V4.1 Flash through OpenCode Go reviewed the draft
independently and then challenged each other's findings. The primary agent
consolidated the following decisions. This is product review, not implementation
or visual validation; the document remains a proposal for user discussion.

| Issue | Decision |
| --- | --- |
| Overall responsibilities | Keep Plan / Reference / Share, with history and updates contextual to the selected plan |
| Indistinguishable duplicated plans | Generate an unused copy name and select the copy |
| Unreadable actual-tag batches | Show ship name, level, and old/new group; retain owned-ID disambiguation |
| Loss of existing screenshot uses | Keep Current Plan view images alongside Full plan output; share text remains full-plan, allocated-only |
| Lost update work when consulting history | Permit a suspended, read-only history detour; restoring invalidates the comparison rather than introducing another editing context |
| Missing roster rows | Clarify the guarantee for retained assigned ships; reject an additional cached-ship inventory |
| Compare-only updates | Use the existing preview/Cancel flow; reject a new persistent diff or freshness system |
| Empty plan without area data | Explain the prerequisite and test explicit setup after data arrives; no manual area editor |

For the history detour, DeepSeek suggested disabling Restore while an update is
pending; Sol recommended invalidating the prepared comparison on Restore. The
proposal adopts the latter: it uses the same rule as any edit that changes the
comparison's base and avoids an additional restriction on restoration.

Both reviewers rechecked the consolidated proposal and reported no remaining
blocking contradiction in the reviewed product flows. Follow-up wording clarifies
that empty-plan creation remains allowed and sharing a historical state preserves a
suspended update draft. No runtime or appearance acceptance is implied.

The subsequent user review names the output destination **Share**, rather than
**Export**, to avoid implying an editable import or backup/restore workflow.
