# Navy Staff workspaces, history, and references

Status: implementation in progress; the delivery status and verification are recorded in section 13. The design below defines the intended behavior across the stack. This extends the completed [plugin split](plugin-split-design.md), which deliberately preserved a single plan. Domain terms are defined in [CONTEXT.md](../CONTEXT.md).

Current delivery scope: reference snapshots are imported and viewed read-only inside Navy Staff. Website decoding and deployment are deferred. Keep the URL/QR PoC as experimental evidence, not a dependency of the plugin feature; do not add browser WASM support or advertise scan-to-open website viewing in this stage.

The current page structure, responsive layout, and navigation behavior are
documented in the [interface guide](navy-staff-interface.md). Planning, history,
synchronization, and sharing use separate pages; the 300-ship browser scenarios
cover the larger planning surface.

## 1. Requirements

- Multiple independent workspaces.
- Operation history within each workspace, including undo and restoration of earlier states.
- Captured area information that remains available after poi updates or removes its event data.
- Explicit, manual synchronization with newer area information.
- Static reference export, beyond screenshots, with import for read-only viewing inside the plugin. A future web viewer is deferred. Reference import is not an editable workspace import.
- Text data only: do not embed ship artwork or other images.
- Copyable, compressed sharing as compact JSON compressed with Brotli and encoded as unpadded Base64url. A curated fleet-themed character alphabet was evaluated and is not implemented; do not add one merely to maximize density.

Do not add collaboration, cloud storage, automatic fleet composition, editable imports, or a new corruption-recovery system. Keep the existing file-missing and version-migration policies for the per-account files described below.

## 2. Baseline before this enhancement

- `planner/redux.ts` stores one `current: number[][]` and an opaque `archive` object. The latter is not a working workspace system.
- `views/index.tsx` renders groups directly from `fcd.shiptag.mapname`, localized `fleetname`, and `color`. Its effect also reconciles assignments with live sortie tags and removes ships missing from the loaded roster.
- `planner/ship-chip.tsx` independently moves ships to their live sortie tags during component updates. Removing only the top-level reconciliation would leave this mutation in place.
- The reducer preserves assignments beyond the current area count, but the interface renders only the current host groups. Retained data can therefore become invisible.
- Ship labels and levels come from the live roster and master data; images use host image paths. Saved owned-ship IDs alone cannot support an independent reference viewer.
- Navy Staff has never released, so no unscoped Navy file compatibility is required. The pre-enhancement branch stored a single plan and could import Ship Info's legacy plan when no Navy file existed; the design replaces that with per-account files and a one-time Ship Info import.

The integration consumes ordered tag slots, not verified permanent area identifiers. The local host declaration types `shiptag` as `any`; neither a stable event ID nor stable area IDs have been established by this investigation. A name, color, or unchanged array length does not prove that two datasets describe the same event.

## 3. Workspaces and per-account storage

Use one concept, **workspace**, without adding a project/workspace hierarchy. Offer create, rename, duplicate, switch, and delete. Duplicating copies the selected plan state into a new workspace with a fresh initial revision; it does not copy the source's undo history. Deletion explicitly removes the workspace and its history and requires confirmation.

Each workspace owns:

- A stable local ID, name, and creation time.
- Its area snapshot and ship assignments.
- Saved display information for ships referenced by the plan.
- Its history and selected revision.

A workspace has no owner association and is not bound to any account; ownership is a property of the file that contains it.

Keep the selected workspace ID outside individual histories. Switching workspaces, changing filters, switching views, and opening a reference do not create planning revisions. Existing plugin-wide display preferences can stay plugin-wide.

Navy Staff has never released, so there is no unscoped Navy JSON file or owner field to keep compatible with. Store **one Navy Staff JSON file per teitoku (member ID)**: the active account's file is the durable root, and each account's workspaces, history, and legacy archive live in its own file. Account selection and filename resolution are the account layer's concern; this design only requires that the durable root of the active file is `{ version, selectedWorkspaceId, workspaces, legacyArchive }`. Each workspace contains identity metadata and a revision list with an editable cursor; its name belongs to revision content so renaming is undoable. `legacyArchive` round-trips the opaque archive carried over from the released Ship Info import without interpretation. Persist this explicit payload, not the entire runtime Redux slice. Reference contents, history preview targets, synchronization dialogs, search, and tabs stay outside the observed persistence slice, so opening a reference or preview cannot schedule a write. Merely stripping those fields during serialization would still permit unnecessary writes.

Application windows operate on the same active account file; they must not start independent histories or persistence owners.

## 4. Area snapshots and explicit synchronization

Give each planning area a stable local ID. Assignments refer to this ID rather than the current position in a host array. Capture the map label, available localized fleet labels, color, original tag slot, and capture time. Record an upstream event identity or revision only if the actual host data supplies one; a local capture time is not an upstream version.

Both views use area metadata from the workspace snapshot. Switching the display language or choosing fleet labels must not change area identity or the number of areas. Missing translations fall back to a captured label. The editing grid includes all saved referenced ships, including those absent from the live roster, plus eligible current-roster ships for assignment. Grouping, sorting, and labels use saved records when live resolution is unavailable. History and reference grids contain only their captured ships, never today's unassigned roster.

All views include an **Unknown type** group for missing or unrecognized ship types. In particular, migrated entries with only an owned ID must not disappear because the current grid enumerates only known type groups.

**Update area information** prepares a comparison against the latest host data and applies it only after the user accepts it:

- Show renamed or recolored groups, additions, and groups absent from the new data.
- Preserve local area IDs and assignments for accepted matches.
- Add new groups without moving existing ships.
- Keep absent groups and their assignments visible; do not delete them as a side effect of synchronization.
- Do not infer continuity across events from matching positions, names, or colors. When stable upstream identity is unavailable, make the proposed slot mapping visible for confirmation; permit correcting mismatches. For a different event, recommend creating a new workspace.
- Apply the accepted update as one undoable operation. Undo restores both the previous metadata and the assignments affected by that operation.
- Cancel and unchanged comparisons do not create revisions.

A preview captures its workspace ID, base revision, and the host metadata it compares; actual-tag previews also capture the relevant roster/tag sample and loaded account. Accept only while those inputs and the active workspace remain unchanged. Otherwise mark the preview stale and require a refreshed comparison. Switching workspaces or losing/replacing the host session invalidates an open preview. Do not apply a prepared full state over newer edits or silently substitute newly arrived host data. This is a check at acceptance, not a synchronization framework.

Freeze the exact proposed batch. Freshness checks include the candidate ship membership and fields used to decide that batch, not only ships already listed as changed. For tag assignment, this includes candidate owned IDs and sortie tags, the loaded account, and the source mapping; include any other fields actually used to compute the proposed changes. A previously untagged ship acquiring a tag while the dialog is open must invalidate the comparison, not become an unreviewed extra change during commit. Changes to unrelated host fields do not invalidate the preview.

Empty or unloaded host data does not clear a workspace. A workspace can be viewed without a current event. Creating a new plan may capture available host information; later host refreshes never silently replace that capture.

## 5. Live roster and actual sortie tags

Proposed behavior change: stop automatic assignment mutations on render, including both reconciliation paths identified above. Otherwise selecting a historical revision could immediately overwrite it again.

Distinguish these operations:

| Operation | Changes |
| --- | --- |
| Update area information | Captured group labels, colors, source associations, and additions |
| Apply actual sortie tags | Proposed assignments, using the accepted mapping to the current event |

Do not persist a trusted association with a live event when the host provides no verified event identity. Saved source slots are mapping hints, not proof of continuity. Compare actual tags only inside an explicitly opened synchronization preview: show the current source, let the user confirm that it is the intended event and correct the slot mapping for this operation, then preview affected assignments. Even unchanged source contents do not prove event identity; a source fingerprint can detect a change but cannot establish continuity. Reopening, undo, or restore must not silently authorize a live association. Automatic background live-tag badges are deferred.

Applying actual tags commits the accepted batch as one operation. It must not automatically remove historical ships absent from the current roster. Retained groups absent from the new source have no live tag mapping; never leave them competing with a newly mapped group for the same tag slot. Within one accepted source, each mapped slot identifies at most one local area, and each local area has at most one mapped slot. Group merging is outside this design.

Actual tags remain facts reported by the game. Workspace assignments are proposals: edits and undo can differ from those facts, with discrepancies shown in the explicit comparison. This replaces the current mix of disabled editing and automatic correction for tagged ships and requires dedicated browser tests.

Capture a small ship display record when adding or explicitly refreshing a referenced ship: owned ID, master ID if known, name, type label/ID, level, and observation time. Current editing may show live roster details as an explicitly live overlay; historical previews use their saved records. Missing live ships remain readable using saved information. The ship picker continues to use the current roster.

Owned IDs are account-scoped, which is why plans are stored one file per account. Live roster data — overlays, new ship choices, refreshed display details, and actual-tag changes — is used only while the account file loaded by the account layer matches the live host member (`info.basic.api_member_id`) and a roster is loaded; poi resets its roster on account switches. Otherwise saved records are shown, and existing plan editing and reference export remain available. There is no per-workspace owner field and no explicit binding step. Do not use master IDs to infer ownership. Never include the account identifier in references.

Normalize valid member identifiers to strings before comparing the loaded account with the live host member; use explicit equality after normalization, not loose coercion. Missing identity remains unknown, not a stringified placeholder.

Do not persist the whole poi store or silently rewrite every workspace when a ship levels up. An old ID with no recoverable display data remains visible as an unknown ship with its ID; do not invent a name.

## 6. History semantics

Start with complete workspace-state snapshots per meaningful operation rather than action replay, inverse patches, or event sourcing. This makes metadata synchronization and bulk assignment changes undoable through the same mechanism. Store operation kind, timestamp, and summary parameters alongside the resulting state; translate the summary when displaying it.

Proposed first-release behavior:

- One add, remove, move, rename, or accepted synchronization is one revision. A bulk user action is one revision, not one per affected ship. No-op actions add nothing.
- Undo/redo moves through a linear history. A new edit after undo clears the redo tail, following normal editor behavior. This is an editing history, not an immutable audit log.
- Viewing an earlier revision is read-only and uses a transient `previewRevisionId`, separate from the persisted editable cursor. Opening/closing preview neither moves that cursor nor saves anything; undo moves the editable cursor and leaves that state editable.
- **Restore this revision** is an ordinary edit at the editable cursor: copy the chosen content first, discard any redo tail, and append the restored content as a new revision. Earlier history up to that cursor remains; redo history is not retained. For `R1, R2, R3` with the cursor at `R2`, restoring a preview of `R3` creates `R1, R2, R4(copy of R3)`; undo of `R4` returns to `R2`. The target must still exist at acceptance. Switching workspaces closes preview, and edits that remove its target invalidate it.
- Save history and the undo position so reopening poi does not reset them.
- History includes area snapshots and saved ship display records; restoring assignments alone is insufficient.
- Initial proposal: no automatic age-based or count-based pruning. Do not silently promise unlimited practical capacity: measure file size and write latency for representative long histories before implementation is accepted. Any retention limit is a separate, visible product decision.

Store history states without embedding their own histories. Use a revision list and cursor as the source of current content rather than maintaining a second independently mutable current-state copy. The proposed linear redo behavior and retention policy remain review points.

## 7. Read-only references

Export the current workspace or a selected historical revision into a separate, independently versioned reference schema. Export one state, not its history or every workspace.

Include:

- Format identity/version, workspace title, export time, and display locale.
- Area order, captured labels and colors, and ship assignments.
- Ship master IDs and levels in ordered entries. Repeated entries remain distinct occurrences, including copies with the same master ID and level; do not deduplicate them or send owned-game IDs just to distinguish rows.
- The relevant snapshot time so readers can distinguish when the information was captured from when it was exported.

For a current-plan export, resolve displayed live ship details once at export time and freeze them into the reference. Historical exports use that revision's captured details without substituting today's levels or tags. Explicitly identify missing details rather than fetching replacement data from a future viewer's game session.

The compact sharing direction omits ship names and type labels. The plugin resolves names and types from the current poi Redux store masters at view time; it bundles no catalog and uses no static name snapshot. The share code fixes assignments, forms, levels, and area labels, while ship names/types depend on the viewer's current masters. A row whose master metadata is missing (a master ID absent from the current masters, or a null master ID) stays valid: the master ID and level are preserved and the display shows a `???` fallback. Owned-game IDs are never substituted for master IDs. The encoding experiment measures known numeric IDs and a numeric unknown-ID case; it is historical evidence, not the schema decision.

Use a compact projection for the share format rather than serializing the editable workspace or its full display records: schema version, title, capture/export times, locale, one captured display label and color per group, and ordered `[masterId, level]` entries. Snapshot capture time describes the saved plan state, not a promise that every ship value was observed simultaneously. Per-ship observation times and alternative translated labels are not part of the minimal experiment. A master-ID-only variant without levels is measured separately as a lower-information option, not an equivalent replacement. See the [encoding experiment](navy-staff-sharing-experiment.md) for measured sizes and verification limits.

Do not include unassigned roster entries, account identifiers, local paths, configuration, artwork, operation history, or opaque legacy archives. Do not export current fleet membership badges unless they become an explicit, captured field in the reference contract.

The plugin offers **Open reference** from pasted text or a text file. This is the reference-import operation: decode and validate a snapshot, then open a separate read-only view alongside the editable workspace, with a visible reference title and capture/export times. It does not create, merge into, or overwrite a workspace. Opening or closing it does not change the selected workspace, write plugin state, or create history. References need no persistent library in the first release. Searching and switching views are allowed; assigning ships, syncing, and saving as an editable workspace are not.

A future web viewer may render the same plan data without Electron, poi globals, host translations, game artwork, or access to a game session; it would supply names and types from its own data source. Its decoding, rendering, WASM integration, and deployment are outside the current deliverable. Keep the reference data contract separate from host data capture, but do not build a browser viewer or require browser compatibility acceptance to deliver plugin import/viewing. `fleet.poi.moe` remains the intended future address, not an available viewing service promised by this feature.

## 8. Reference share text

The plugin's reference format is compact UTF-8 JSON compressed with native Node
Brotli (quality 11, generic mode, input-size hint) and encoded as unpadded
Base64url. A share code is the canonical raw form `ns1:b:PAYLOAD`. Compression
and text encoding solve different problems. The
[compression experiment](navy-staff-sharing-experiment.md#compression-and-browser-wasm-comparison)
measured roughly 13% smaller compact JSON with Brotli 11 versus gzip, which is
why Brotli is the export codec; its gzip and `ns1:g:` forms are historical PoC
evidence, not accepted input and not a second export mode.

This is a plugin-only text format. Website decoding, browser WASM, QR
integration, and scan-to-open delivery are deferred; `fleet.poi.moe` remains an
intended future address, not an available service. No curated character alphabet
is implemented. The earlier proposal of a curated 256/512-character fleet-themed
alphabet, and the rejected contiguous 16,384-character CJK alphabet, are not part
of the implementation; do not add a thematic alphabet merely to reduce character
count.

Decoding recognizes the explicit outer version, tolerates inserted spaces and
line breaks, rejects unknown payload characters, and validates the reference
schema after decompression. Only the Base64url alphabet is accepted; truncation
and non-canonical encodings are rejected. Unsupported formats produce a
reference-view error and never touch workspace data. Compressed input,
decompressed output, and raw input length are bounded at this external-input
seam, with `maxOutputLength` passed to the native decompressor to prevent
decompression bombs. Render fields as text, never executable markup or host
paths. Decoding and schema validation reject malformed data but do not
authenticate the sender; no additional checksum is added. Names and types resolve
from the current poi Redux store masters; nothing is bundled, fetched, or
persisted. A row whose master metadata is missing shows `???` while keeping its
master ID and level.

No target chat service or message-length limit has been specified. Do not claim
every plan fits one message or invent a product hard cap from an assumed platform
limit. The same share text can be saved and sent as a text file when pasting is
inconvenient. Decoder resource limits remain an input-safety requirement.

## 9. Migration and legacy import

Navy Staff has never released, so it does not probe or import an unscoped Navy JSON file or preserve workspace owner fields. The only legacy import source is the released Ship Info plugin's saved file. Account files retain the existing ordered format-version migration mechanism.

The released Ship Info legacy import runs only while no Navy Staff account file exists; the first created account consumes it. It writes directly into that new per-account file using the same versioned durable root as section 3. Once an account file is present, import does not run again, and the Ship Info file and other accounts' Navy files are left untouched. Imported plans preserve every positional group and owned ID using neutral labels; ownership is irrelevant because the data already belongs to one account. The opaque Ship Info `archive` moves unchanged into that account file's `legacyArchive`, and the validator and normal save serializer round-trip it. The old plan did not save area metadata or ship labels, so the import cannot reconstruct disappeared information; missing host data must not block the structural import or hide existing assignments. Unsupported versions and I/O errors retain the existing behavior; this does not introduce fallback imports, backups, or reset flows. Reference schema versions are independent from the editable storage version.

## 10. Implementation seams and reviewable sequence

Keep planning behavior in Navy Staff. Do not introduce another published package or a general history framework.

1. **Workspace state and legacy import:** establish independent workspace content and area IDs, import the released Ship Info plan into the first account file, and remove hidden assignment mutations. Both existing views use workspace metadata. Test absent host data and cross-event preservation.
2. **History:** centralize workspace edits through one operation interface that computes a next state and history entry. UI callers must not manually coordinate assignments, snapshots, and history. Add undo, redo, preview, and restore with persisted history.
3. **Explicit synchronization:** prepare comparisons as pure data and accept them as one operation. Verify source mapping, additions, retained missing groups, cancellation, and undo. Keep live tag comparison distinct from metadata updates.
4. **References and sharing:** define the reference contract, codec, and plugin read-only renderer. Isolate host data capture from decoding/rendering. Implement pasted/file reference import and verify it in the supported poi runtime. Complete copy/paste checks before calling the format stable; website decoding, browser WASM, and scan-to-open website delivery are deferred.

These are proposed review layers, not instructions to publish PRs before the design is agreed. Every intermediate runtime change must remain usable; basic workspace snapshots and removal of automatic reconciliation belong in the same behavior change.

## 11. Acceptance evidence

- Workspace A edits and undo never affect B. Switching, duplicating, deleting, and reopening preserve the specified identities and history behavior.
- Renaming, reordering, shrinking, or removing host event data cannot silently reinterpret or hide saved assignments. Explicit updates and their undo affect both labels and plan state consistently.
- A newly tagged or absent ship cannot overwrite an old plan or an undo result during rendering. Same tag numbers in different events do not imply the same group.
- Each account's plans live in that account's own file, so owned IDs never cross accounts. Live joins and tag application occur only while the active account file matches the live host member and a roster is loaded; account identifiers never appear in exported data. Missing ships remain visible in both views.
- A changed workspace, revision, account, host metadata, or applicable roster sample invalidates a synchronization preview. Restoring old metadata never restores trust in a live event association.
- Legacy empty/nonempty plans, retained extra groups, unknown ships, and opaque archive data survive migration. Structural migration works without loaded host data.
- A single bulk sync creates one revision; no-op/cancel creates none. Undo/redo after restart and edit-after-undo behavior match the design. Restore is itself undoable.
- History preview is read-only and produces no writes; undo selects an editable state. Restore with a redo tail copies its target before truncation and follows the documented linear-history example.
- Reference content remains identical after host data changes. Opening a reference cannot dispatch workspace mutations or write persistence. History exports contain historical display data.
- Pasted/file reference import opens read-only inside Navy Staff without a website or network request. It never creates, merges, or overwrites an editable workspace. Website decoding and physical QR scanning are not acceptance gates for this stage.
- Codec tests cover Brotli JSON round trips, exact-current-version enforcement (older, newer, and missing versions rejected), Base64url canonical/truncation rejection, unsupported codecs (including no gzip fallback), size limits, unexpected fields, schema rejection, and projection with supplied masters where missing metadata shows `???` and keeps the master ID and level. Measure representative payloads and test copy/paste in intended sharing channels.
- Browser tests exercise workspace selection, history, sync previews, both planning views, pasted/file references, and read-only controls. Run type checks, relevant tests, builds, and packed-artifact verification for implementation changes.

This design-only change requires document/link and whitespace checks, not runtime-suite claims. Remaining product review points are the proposed live-tag behavior, linear redo/retention semantics, and measured share-text sizes with real copy/paste samples.

## 12. Adversarial design review

DeepSeek V4.1 Flash through OpenCode Go and Codex GPT-6.1-Sol independently reviewed the proposal and relevant source, then challenged each other's findings and the primary agent's proposed corrections. Reviews were local; no GitHub comments were posted. This records design review, not runtime verification.

| Finding | Source | Disposition |
| --- | --- | --- |
| P1: event association lacks a validity rule | Both | Removed persistent live-event trust; confirmation is scoped to an explicit synchronization operation. A content fingerprint is not event identity. |
| P1: owned-ship IDs can join another account's roster | Sol; independently verified in poi source | Resolved by per-account storage: each account's plans live in its own file, live resolution is gated on the loaded account matching the live host member, and account identifiers are excluded from references. |
| P2: history preview and editable undo cursor are ambiguous | Sol | Separated transient preview from durable cursor and specified restore with a redo tail. |
| P2: accepted synchronization may use stale inputs | Sol | Bound acceptance to workspace, revision, source, loaded account, and candidate data; froze the reviewed batch. |
| P2: transient reference state can trigger persistence | DeepSeek; refined by Sol | Isolated transient state from the observed persistence slice, rather than only filtering serialization. |
| P2: saved ships can disappear from the live-only grid | DeepSeek; refined by Sol | Included saved referenced ships and an explicit unknown-type group in every applicable view. |
| P2: migration/archive output shape is underspecified | DeepSeek | Named the version 2 durable shape, preserved `legacyArchive`, and required all initialization/import paths to produce the same current shape. |

The canonical wire prefix was clarified. DeepSeek withdrew the claims that the sample necessarily exceeds most messaging limits, that separate encoding/schema versions conflict, and that 512-character evaluation was not already gated. The proposed fingerprint-based proof of event continuity was also rejected. No evidence justified adding server/world identity machinery or multipart sharing. Per-slot mismatch correction remains necessary to prevent incorrect mappings; automatic background tag badges are deferred.

Sol accepted the adjudication with qualifications for write-trigger isolation, unknown ship types, and synchronization candidate freshness; those qualifications are included above. DeepSeek reread the amended document and reported no remaining blockers. The primary agent checked the amendments and local document links/whitespace. Alphabet suitability, actual sharing-channel behavior, and long-history performance remain implementation acceptance work, not completed checks.

## 13. Implementation progress

Layer 1 (workspaces, captured metadata, durable root, usable UI) is implemented in `packages/navy-staff`. The account-file layer in section 15 supersedes the earlier single-file/owner approach.

- Durable root `{ version, selectedWorkspaceId, workspaces, legacyArchive }`; each workspace has a stable local id, creation time, a revision list, and an editable cursor. Revisions carry a stable id and operation time. The root lives in one file per account (see section 3); there is no per-workspace owner field.
- Each revision's content holds the workspace name, stable local area ids with captured map label, localized fleet labels, color, tag-slot hint, and capture time, plus area-keyed assignments and saved ship display records.
- The released Ship Info legacy import preserves every area slot and owned id with neutral labels and moves the opaque archive unchanged into the account file's `legacyArchive`. No unscoped Navy file is probed or imported.
- The observed persistence payload is the durable root only; transient view state stays outside the slice. The persistence boundary validates nested areas, ship records, assignments, and the selected-workspace reference, and rejects malformed data without reset or filtering.
- UI offers create, rename, duplicate, switch, and confirmed delete. Both planning views render captured areas and include saved ships missing from the roster plus an Unknown type group. Live roster overlay, the ship picker, fleet badges, and live enrichment are gated on the loaded account matching the live host member with a roster present; there is no per-workspace owner or binding step.
- The two automatic reconciliation paths were removed: rendering no longer moves, adds, or removes assignments from live sortie tags, and chips/cells remain manually editable. The Refresh action and live-tag badges are gone.
- A single `appendRevision` helper is in place so the history layer needs no further storage migration.
- Exported for later layers: workspace types and factories, the operation append helper, plain action creators, thunks, selectors (`areaViewsSelector`, `gridRowsSelector`, `assignedShipIdsSelector`, and related), and the import/validation helpers.

Verification: `pnpm run check`, `pnpm test` (111 passed), `pnpm run test:browser` (103 passed), `pnpm run build`, `pnpm run build-storybook`, `pnpm run pack`, `pnpm run verify:package`, and `git diff --check` pass. The persistence boundary additionally rejects duplicate workspace ids and duplicate revision ids. Browser regressions cover workspace CRUD and switching, delete/rename confirmation invalidated by a selection change, duplicate/source independence, palette selection not recoloring unedited ships, and an unknown-master row never borrowing owned-ID artwork. Packed-artifact checks cover the durable root, legacy archive preservation, independent plugin saves, and no writes after unload. Local GPT-6.1-Sol review findings were fixed and the focused follow-up found no remaining actionable issues. Undo/redo and preview are recorded in section 14; explicit synchronization is recorded in section 16, and reference import/export in section 17.

## 14. History layer

The linear history from section 6 is implemented in `packages/navy-staff`.

- The durable workspace keeps its revision list and editable cursor. Undo and redo move the cursor; a new edit after undo discards the redo tail. Every revision keeps a stable id and operation time, and its operation kind and summary parameters.
- Restore resolves the target revision before appending, copies it as one new revision at the cursor (discarding any redo tail), and leaves workspace identity metadata unchanged. A missing target or a target whose content equals the current content is a no-op.
- The transient `previewRevisionId` lives in React state provided by `NavyStaffContent`, not in the observed persistence slice. Opening or closing a preview therefore dispatches no action and writes no file. Switching workspaces closes the preview, and a preview is invalidated if an edit removes its target. Restore leaves the preview so Undo applies to the restored revision immediately.
- A preview is read-only in both views and renders captured records only: no live overlay, no fleet badges, and no live-only roster. While previewing, add, move, remove, and rename are disabled; workspace switching stays available.
- The reusable display-content boundary (`workspace/display.ts`, `buildDisplayContent`) produces both the editable view models (with a live overlay when live data is available for the loaded account) and the captured-only view models used by previews and reference export.

Verification: `pnpm run check`, `pnpm test` (121 passed, including undo/redo, divergent edit, restore of a target in the redo tail, workspace isolation, reloaded cursor/history, and a jsdom test proving preview toggling dispatches nothing), and `pnpm run test:browser` (109 passed, including read-only area and grid previews, a preview showing the captured level while editing shows the live level, restore followed by immediate undo, preview closing on workspace switch, a pending rename closing on preview, and a lifecycle scenario proving preview toggling writes no file).

### Long-history measurement

`scripts/benchmark-navy-history.mjs` is a standalone acceptance measurement (not a unit test, no timing gate). It builds a clearly labeled synthetic corpus in the version 2 serializer shape with full-state revisions and no pruning, then records serialized size, `JSON.stringify` time, and real file-write time on this environment (Node 24.22.0, pinned):

| Scenario | Revisions | Serialized bytes | stringify | write |
| --- | --- | --- | --- | --- |
| 100 ops / ~100 ships | 101 | 766,591 (~749 KiB) | 1.5 ms | 0.9 ms |
| 1000 ops / 480 ships | 1001 | 54,201,352 (~52 MiB) | 79.9 ms | 42.5 ms |

These are synthetic single-run figures on local cached I/O; they are not a durability or slow-disk guarantee, and write latency may be much higher on slower or uncached storage. File growth is linear in retained operations (each retained revision is a full snapshot, so a larger plan raises the per-revision size), and no pruning is implemented. Retention or a compaction strategy remains a separate, visible product decision.

## 15. Per-teitoku files

The account-file layer replaces workspace binding with `APPDATA/poi-plugin-navy-staff/<member-id>.json`. A small host-store subscriber switches the existing persistence engine when the member ID changes. Readiness and the transient loaded-account marker reset together; queued writes retain their original path, and the shared writer drains before the next load. Missing identity prevents editing and file initialization. Detached windows consume the shared state without starting another writer.

Only released Ship Info data is a legacy import source. When the requested account file is missing, the first account file may import that plan and archive; the presence of any account JSON file prevents repeated imports for later accounts. Ship Info remains untouched. No unscoped Navy Staff file is probed or imported, and workspaces contain no owner/binding field.

Verification: type checking, full unit tests, the focused lifecycle suite (10 tests), browser tests (110 tests), both plugin builds, and fresh packed-artifact verification passed. Lifecycle coverage includes A-to-B-to-A history isolation, a pending A save while switching to B, identity loss after loading, stale loads, duplicate initialization, and detached windows. Local GPT-6.1-Sol review found no remaining actionable account-isolation issue. Explicit synchronization is recorded in section 16; reference import/export is recorded in section 17.

## 16. Explicit synchronization layer

The manual synchronization from sections 4-5 is implemented in `packages/navy-staff/src/views/sync`.

- Two separate flows, **Update area information** and **Apply actual sortie tags**, each an explicit, reviewable preview shown above the planning views and below the history bar.
- The caller supplies a visible, correctable one-to-one slot -> area mapping. In area sync an unmapped slot means "New area"; in tag sync it means "Ignore (unmapped)" and never creates an area.
- Area sync preserves local area IDs and assignments, retains areas absent from the source, adds new areas with fresh IDs, and shows the old -> new label, color, and fleet-label changes before acceptance. A retained area whose slot hint is claimed by a mapped or newly created area has its hint cleared.
- Tag sync places only tagged ships with a mapped slot and captures their display records; ships absent from the roster and retained groups are never removed or moved. The roster candidate set is built from the raw owned ships, so an owned ship whose master metadata is missing keeps its owned ID and sortie tag while its display fields stay nullable.
- `prepare*` freezes the source, mapping, base workspace/revision, and the transient loaded account, plus the full candidate roster. Acceptance re-checks fresh store state in a thunk — workspace, revision, account, source/mapping, and the whole roster candidate set — and a fresh, changed batch is committed as one durable revision through the shared `appendRevision` helper. No-op and cancel append nothing.
- The durable action carries the target workspace, base revision, and loaded account; the combined reducer rejects a mismatched account or a not-ready reload before the navy slice can append, and the workspace reducer rejects a stale base revision. An open flow is discarded when a history preview starts, when the account or workspace changes, or when the host source is replaced or unloaded.
- The runtime source generation is a transient reference identity of the host `fcd.shiptag`; it is not a persisted event id and never establishes continuity. No per-workspace owner or binding exists.

Verification: type checking, all 155 unit tests, all 118 Chromium browser tests, fresh packaging and package verification, and whitespace checks passed. Eight integrated browser scenarios cover metadata updates and undo, tag application, cancellation without writes, no-op acceptance, history preview, workspace/account switching, and stale roster rejection. Local Codex GPT-6.1-Sol review found an omitted unknown-master candidate; the raw-roster fix and regression were verified, with no remaining actionable findings.

## 17. Reference layer

The read-only reference layer is implemented under `packages/navy-staff/src/views/reference`.

- Encode and decode a compact reference with native Node Brotli and unpadded Base64url (`ns1:b:`). One exact current schema version covers both the wire structure and the meaning of master IDs; older and newer versions are rejected, and there is no compatibility path or gzip/alternative-codec decode.
- Validate strictly at the input boundary: exact version, Base64url alphabet and canonical form, bounded input/compressed/decompressed sizes (with `maxOutputLength`), JSON and schema checks, exact fields only, and `#RRGGBB` colors. Owner IDs, local paths, and history cannot enter.
- Project a decoded reference for display using the current poi Redux store masters, supplied by the caller; nothing is bundled, fetched, or persisted. Groups and repeated occurrences are preserved. A row whose master metadata is missing shows `???` while keeping its master ID and level.
- Import pasted text or a text file into a separate read-only view. It never creates, merges into, or overwrites an editable workspace. Website decoding, browser WASM, QR, and URL export remain deferred; the URL/QR and gzip findings in the encoding experiment are historical PoC evidence, not this feature.

Verification: type checking, all 171 unit tests, all 127 Chromium browser tests, both plugin builds, the static Storybook build, fresh packages and packed-artifact verification, and whitespace checks passed. Real native-codec tests cover exact version rejection, schema and size boundaries, and missing-master projection. Browser scenarios cover paste/file import without workspace mutations, current versus historical levels, raw IDs/levels without master metadata, import with no account or masters, stale asynchronous file reads, empty groups, area labels in the type grid, localized copy/save failures, and account-supervisor disposal. Local Codex GPT-6.1-Sol review identified a current-export raw-roster omission; the fix and focused follow-up were verified.

Review follow-up: reference search matches both the displayed localized ship type and its abbreviation (for example, `驱逐` and `DD`), while grouping retains the type key. Chinese, Japanese, and Korean browser regressions cover localized labels, abbreviations, unmatched queries, and master-ID searches. Type checking, all 171 unit tests, all 130 browser tests, plugin builds, fresh packaging, and package verification passed after this fix.
