# Navy Staff workspaces, history, and references

Status: implementation in progress; the delivery status and verification are recorded in section 13. The design below defines the intended behavior across the stack. This extends the completed [plugin split](plugin-split-design.md), which deliberately preserved a single plan. Domain terms are defined in [CONTEXT.md](../CONTEXT.md).

Current delivery scope: reference snapshots are imported and viewed read-only inside Navy Staff. Website decoding and deployment are deferred. Keep the URL/QR PoC as experimental evidence, not a dependency of the plugin feature; do not add browser WASM support or advertise scan-to-open website viewing in this stage.

## 1. Requirements

- Multiple independent workspaces.
- Operation history within each workspace, including undo and restoration of earlier states.
- Captured area information that remains available after poi updates or removes its event data.
- Explicit, manual synchronization with newer area information.
- Static reference export, beyond screenshots, with import for read-only viewing inside the plugin. A future web viewer is deferred. Reference import is not an editable workspace import.
- Text data only: do not embed ship artwork or other images.
- Copyable, compressed sharing with a fleet-themed appearance. Avoid unfamiliar characters and characters with negative meanings; do not use an arbitrary large Unicode range merely to maximize density.

Do not add collaboration, cloud storage, automatic fleet composition, editable imports, or a new corruption-recovery system. Keep the existing file-missing and version-migration policies.

## 2. Baseline before this enhancement

- `planner/redux.ts` stores one `current: number[][]` and an opaque `archive` object. The latter is not a working workspace system.
- `views/index.tsx` renders groups directly from `fcd.shiptag.mapname`, localized `fleetname`, and `color`. Its effect also reconciles assignments with live sortie tags and removes ships missing from the loaded roster.
- `planner/ship-chip.tsx` independently moves ships to their live sortie tags during component updates. Removing only the top-level reconciliation would leave this mutation in place.
- The reducer preserves assignments beyond the current area count, but the interface renders only the current host groups. Retained data can therefore become invisible.
- Ship labels and levels come from the live roster and master data; images use host image paths. Saved owned-ship IDs alone cannot support an independent reference viewer.
- Navy Staff persistence currently uses version 1 and can import Ship Info's legacy plan only when the Navy Staff file is absent.

The integration consumes ordered tag slots, not verified permanent area identifiers. The local host declaration types `shiptag` as `any`; neither a stable event ID nor stable area IDs have been established by this investigation. A name, color, or unchanged array length does not prove that two datasets describe the same event.

## 3. Workspace ownership

Use one concept, **workspace**, without adding a project/workspace hierarchy. Offer create, rename, duplicate, switch, and delete. Duplicating copies the selected plan state into a new workspace with a fresh initial revision; it does not copy the source's undo history. Deletion explicitly removes the workspace and its history and requires confirmation.

Each workspace owns:

- A stable local ID, name, and creation time.
- A local owner account association, separate from the account-free reference format.
- Its area snapshot and ship assignments.
- Saved display information for ships referenced by the plan.
- Its history and selected revision.

Keep the selected workspace ID outside individual histories. Switching workspaces, changing filters, switching views, and opening a reference do not create planning revisions. Existing plugin-wide display preferences can stay plugin-wide.

Continue using one Navy Staff JSON file and the existing serialized persistence lifecycle. Multiple workspaces do not require multiple writers, files, or a database. Application windows operate on the same plugin state; they must not start independent histories or persistence owners.

The proposed version 2 durable root is `{ version, selectedWorkspaceId, workspaces, legacyArchive }`. Each workspace contains identity metadata and a revision list with an editable cursor; its name belongs to revision content so renaming is undoable. `legacyArchive` round-trips the original opaque archive without interpretation. Persist this explicit payload, not the entire runtime Redux slice. Reference contents, history preview targets, synchronization dialogs, search, and tabs stay outside the observed persistence slice, so opening a reference or preview cannot schedule a write. Merely stripping those fields during serialization would still permit unnecessary writes.

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

A preview captures its workspace ID, base revision, and the host metadata it compares; actual-tag previews also capture the relevant roster/tag sample and account. Accept only while those inputs and the active workspace remain unchanged. Otherwise mark the preview stale and require a refreshed comparison. Switching workspaces or losing/replacing the host session invalidates an open preview. Do not apply a prepared full state over newer edits or silently substitute newly arrived host data. This is a check at acceptance, not a synchronization framework.

Freeze the exact proposed batch. Freshness checks include the candidate ship membership and fields used to decide that batch, not only ships already listed as changed. For tag assignment, this includes candidate owned IDs and sortie tags, the owner, and the source mapping; include any other fields actually used to compute the proposed changes. A previously untagged ship acquiring a tag while the dialog is open must invalidate the comparison, not become an unreviewed extra change during commit. Changes to unrelated host fields do not invalidate the preview.

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

Owned IDs are account-scoped. Store `ownerMemberId` locally when creating a workspace from a verified current roster; poi exposes this as `info.basic.api_member_id` and resets its roster on account switches. Only a loaded roster with a matching owner may supply live overlays, new ship choices, refreshed display details, actual-tag changes, or live details for current exports. An unknown or different owner uses saved records; existing plan editing and reference export remain available. Do not use master IDs to infer ownership. Bind an imported legacy workspace explicitly before its first live-roster operation; absence of an owner must not silently mean the currently logged-in account. Ownership is workspace identity metadata and is not reassigned by content undo/restore. Account transfer is outside this design. Never include the owner identifier in references.

Normalize valid member identifiers to strings before storing and comparing them; use explicit equality after normalization, not general loose coercion. Missing identity remains unknown, not a stringified placeholder.

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

The compact sharing direction omits ship names and type labels. The plugin and future viewer bundle a public master-ID catalog to resolve them without a user's game session or network access. This changes the earlier fully self-contained-display proposal: the share code fixes assignments, forms, levels, and area labels, while ship names/types depend on the viewer's catalog. An older catalog shows an explicit ID placeholder for a new ship until the viewer's catalog is updated; it must not guess or drop that entry. A legacy entry with no recoverable master ID needs an unknown entry, not an owned ID misinterpreted as a master ID. The encoding experiment measures known numeric IDs and a numeric unknown-ID case, not that missing-ID schema decision.

Use a compact projection for the share format rather than serializing the editable workspace or its full display records: schema version, title, capture/export times, locale, one captured display label and color per group, and ordered `[masterId, level]` entries. Snapshot capture time describes the saved plan state, not a promise that every ship value was observed simultaneously. Per-ship observation times and alternative translated labels are not part of the minimal experiment. A master-ID-only variant without levels is measured separately as a lower-information option, not an equivalent replacement. See the [encoding experiment](navy-staff-sharing-experiment.md) for measured sizes and verification limits.

Do not include unassigned roster entries, account identifiers, local paths, configuration, artwork, operation history, or opaque legacy archives. Do not export current fleet membership badges unless they become an explicit, captured field in the reference contract.

The plugin offers **Open reference** from pasted text or a text file. This is the reference-import operation: decode and validate a snapshot, then open a separate read-only view alongside the editable workspace, with a visible reference title and capture/export times. It does not create, merge into, or overwrite a workspace. Opening or closing it does not change the selected workspace, write plugin state, or create history. References need no persistent library in the first release. Searching and switching views are allowed; assigning ships, syncing, and saving as an editable workspace are not.

A future web viewer may render the same plan data without Electron, poi globals, host translations, game artwork, or access to a game session; its own bundled catalog would supply names and types. Its decoding, rendering, WASM integration, and deployment are outside the current deliverable. Keep the reference data contract separate from host data capture, but do not build a browser viewer or require browser compatibility acceptance to deliver plugin import/viewing. `fleet.poi.moe` remains the intended future address, not an available viewing service promised by this feature.

## 8. Fleet-themed share text

Compress UTF-8 JSON with gzip, then encode the compressed bytes as copyable text. Compression and text encoding solve different problems; switching to TOML does not remove the need for either. Gzip is a practical initial choice for Node and modern browser decoding, subject to checking the supported poi runtime. No claim of optimal compression is made without representative measurements.

The [compression experiment](navy-staff-sharing-experiment.md#compression-and-browser-wasm-comparison) found roughly 13% smaller compact JSON with Brotli 11, versus small gains with Zstd, while tested browser decoders added about 99/29 KiB of gzip-compressed assets respectively. For scan-to-open QR sharing, compare the complete path: JSON -> compression -> Base64url -> viewer URL fragment -> QR. Count the entire URL and its actual QR version at each error-correction level. Raw binary QR requires a dedicated reader and is not this interaction. WASM decoding works and is fast enough; decide on Brotli from the URL/QR PoC rather than binary-serialization or thematic-text comparisons.

The preferred direction is a fixed, curated alphabet with one canonical, locale-independent fleet-themed wire prefix. For example, a prefix could be `舰队密电一：`; all locales would copy that exact prefix and separator. Only surrounding UI labels are translated. The exact prefix and alphabet are proposals, not yet a published format. The outer version is recognizable before payload decoding and selects the alphabet/compression decoding rules; the decoded reference's own version selects its schema. These are separate compatibility decisions, and unsupported versions at either layer are rejected explicitly.

Start by evaluating **256 approved single characters**:

- Draw familiar characters from ship names, the sea, weather, and related vocabulary.
- Exclude obscure characters, negative meanings, invisible characters, compatibility variants, and easily confused glyphs. Review generated sequences as well as individual entries; a whitelist alone does not guarantee every combination reads well.
- One compressed byte maps to one character, avoiding bit packing and padding rules. Character count is approximately 25% lower than Base64, excluding headers and rounding.
- Do not force a larger dictionary just to reach a target size. Evaluate 512 characters only if the additional characters remain suitable and the extra bit-packing complexity is justified by actual samples.
- Version and check in the ordered alphabet. Never derive it from the installed game's ship list or locale. Old share codes must not change meaning when new ships are added.

Complete ship names are an alternative thematic vocabulary, but 256 names encode only eight bits per name while typically using multiple characters. They are not the default recommendation for short text.

Reject the earlier proposal of a contiguous 16,384-character CJK alphabet: although dense, it conflicts with the readability and vocabulary requirements. Unicode normalization stability does not make a character suitable for this product.

Text length has several meanings:

| Encoding | Bits per output character | Relative character count vs Base64 | UTF-8 bytes per compressed byte, approximately |
| --- | --- | --- | --- |
| Base64url | 6 | 100% | 1.33 |
| Curated 256 CJK characters | 8 | 75% | 3 |
| Curated 512 CJK characters | 9 | 67% | 2.67 |

CJK characters typically occupy two display cells. Fewer characters does not imply fewer screen columns or fewer UTF-8 bytes. Platform limits and wrapping vary; test actual copy/paste before choosing the default. Base64url remains a compatibility option to evaluate, not a required second mode in the initial implementation.

Decoding recognizes an explicit format version, tolerates inserted spaces and line breaks, rejects unknown payload characters, and validates the reference schema after decompression. Do not silently normalize arbitrary punctuation or guess corrections. Unsupported formats produce a reference-view error and never touch workspace data. Bound compressed input and decompressed output sizes at this external-input seam; choose documented limits from representative payloads. Render fields as text, never executable markup or host paths. Gzip integrity checks detect many accidental changes but do not authenticate the sender.

Before finalizing the alphabet, produce readable samples from real-sized plans and compare character count, UTF-8 bytes, generation/decode time, and round-trip copy/paste. A synthetic 240-ship/12-group JSON sample measured during design was 22,290 UTF-8 bytes, 2,886 gzip bytes, and 3,848 Base64url characters. A 256-character encoding would need 2,886 payload characters. This illustrates encoding arithmetic, not a production compression ratio or a tested share-code implementation.

No target chat service or message-length limit has been specified. Do not claim every plan fits one message or invent a product hard cap from an assumed platform limit. The same share text can already be saved and sent as a text file when pasting is inconvenient. Multipart sharing and alternate compression formats are not required without measured need; decoder resource limits remain a separate input-safety requirement.

## 9. Migration

Add the next ordered Navy Staff file migration after version 1. An existing `current` plan becomes one workspace with an initial revision; existing `archive` data moves unchanged to the root `legacyArchive` field rather than being interpreted as workspaces. The current validator and normal save serializer must round-trip it. Ship Info data and files remain untouched.

The old format did not save area metadata or ship labels. Migration cannot reconstruct disappeared information. Preserve every positional group and ship ID using neutral labels where necessary. Offer an explicit association with available current area information; do not label today's metadata as a recovered historical snapshot. Missing host data must not block the structural migration or hide existing assignments.

Legacy Ship Info import still runs only when the Navy file is absent and feeds the same workspace conversion. Existing-file migration, legacy import, and missing-both initialization all emit the same version 2 durable shape before readiness; none may stamp version 2 onto the old `planner.current/archive` shape. Empty existing Navy data remains authoritative. Unsupported file versions and I/O errors retain the existing behavior; this enhancement does not introduce fallback imports, backups, or reset flows. Reference schema versions are independent from the editable storage version.

## 10. Implementation seams and reviewable sequence

Keep planning behavior in Navy Staff. Do not introduce another published package or a general history framework.

1. **Workspace state and migration:** establish independent workspace content and area IDs, preserve legacy data, and remove hidden assignment mutations. Both existing views use workspace metadata. Test absent host data and cross-event preservation.
2. **History:** centralize workspace edits through one operation interface that computes a next state and history entry. UI callers must not manually coordinate assignments, snapshots, and history. Add undo, redo, preview, and restore with persisted history.
3. **Explicit synchronization:** prepare comparisons as pure data and accept them as one operation. Verify source mapping, additions, retained missing groups, cancellation, and undo. Keep live tag comparison distinct from metadata updates.
4. **References and sharing:** define the reference contract, curated alphabet, codec, and plugin read-only renderer. Isolate host data capture from decoding/rendering. Implement pasted/file reference import and verify it in the supported poi runtime. Complete copy/paste checks before calling the format stable; website decoding, browser WASM, and scan-to-open website delivery are deferred.

These are proposed review layers, not instructions to publish PRs before the design is agreed. Every intermediate runtime change must remain usable; basic workspace snapshots and removal of automatic reconciliation belong in the same behavior change.

## 11. Acceptance evidence

- Workspace A edits and undo never affect B. Switching, duplicating, deleting, and reopening preserve the specified identities and history behavior.
- Renaming, reordering, shrinking, or removing host event data cannot silently reinterpret or hide saved assignments. Explicit updates and their undo affect both labels and plan state consistently.
- A newly tagged or absent ship cannot overwrite an old plan or an undo result during rendering. Same tag numbers in different events do not imply the same group.
- Identical owned IDs across accounts never cause live joins or tag application to the wrong workspace. Unknown legacy ownership needs explicit binding; owner identifiers never appear in exported data. Missing ships remain visible in both views.
- A changed workspace, revision, account, host metadata, or applicable roster sample invalidates a synchronization preview. Restoring old metadata never restores trust in a live event association.
- Legacy empty/nonempty plans, retained extra groups, unknown ships, and opaque archive data survive migration. Structural migration works without loaded host data.
- A single bulk sync creates one revision; no-op/cancel creates none. Undo/redo after restart and edit-after-undo behavior match the design. Restore is itself undoable.
- History preview is read-only and produces no writes; undo selects an editable state. Restore with a redo tail copies its target before truncation and follows the documented linear-history example.
- Reference content remains identical after host data changes. Opening a reference cannot dispatch workspace mutations or write persistence. History exports contain historical display data.
- Pasted/file reference import opens read-only inside Navy Staff without a website or network request. It never creates, merges, or overwrites an editable workspace. Website decoding and physical QR scanning are not acceptance gates for this stage.
- Codec tests cover all alphabet entries, Unicode normalization, actual gzip/JSON round trips, whitespace wrapping, invalid characters, truncation, unsupported versions, size limits, and schema rejection. Measure representative payloads and test copy/paste in intended sharing channels.
- Browser tests exercise workspace selection, history, sync previews, both planning views, pasted/file references, and read-only controls. Run type checks, relevant tests, builds, and packed-artifact verification for implementation changes.

This design-only change requires document/link and whitespace checks, not runtime-suite claims. Remaining product review points are the proposed live-tag behavior, linear redo/retention semantics, and the actual curated vocabulary and share-text samples.

## 12. Adversarial design review

DeepSeek V4.1 Flash through OpenCode Go and Codex GPT-6.1-Sol independently reviewed the proposal and relevant source, then challenged each other's findings and the primary agent's proposed corrections. Reviews were local; no GitHub comments were posted. This records design review, not runtime verification.

| Finding | Source | Disposition |
| --- | --- | --- |
| P1: event association lacks a validity rule | Both | Removed persistent live-event trust; confirmation is scoped to an explicit synchronization operation. A content fingerprint is not event identity. |
| P1: owned-ship IDs can join another account's roster | Sol; independently verified in poi source | Added local owner identity, guarded live resolution, explicit legacy binding, and exclusion of owner data from references. |
| P2: history preview and editable undo cursor are ambiguous | Sol | Separated transient preview from durable cursor and specified restore with a redo tail. |
| P2: accepted synchronization may use stale inputs | Sol | Bound acceptance to workspace, revision, source, owner, and candidate data; froze the reviewed batch. |
| P2: transient reference state can trigger persistence | DeepSeek; refined by Sol | Isolated transient state from the observed persistence slice, rather than only filtering serialization. |
| P2: saved ships can disappear from the live-only grid | DeepSeek; refined by Sol | Included saved referenced ships and an explicit unknown-type group in every applicable view. |
| P2: migration/archive output shape is underspecified | DeepSeek | Named the version 2 durable shape, preserved `legacyArchive`, and required all initialization/import paths to produce the same current shape. |

The canonical wire prefix was clarified. DeepSeek withdrew the claims that the sample necessarily exceeds most messaging limits, that separate encoding/schema versions conflict, and that 512-character evaluation was not already gated. The proposed fingerprint-based proof of event continuity was also rejected. No evidence justified adding server/world identity machinery or multipart sharing. Per-slot mismatch correction remains necessary to prevent incorrect mappings; automatic background tag badges are deferred.

Sol accepted the adjudication with qualifications for write-trigger isolation, unknown ship types, and synchronization candidate freshness; those qualifications are included above. DeepSeek reread the amended document and reported no remaining blockers. The primary agent checked the amendments and local document links/whitespace. Alphabet suitability, actual sharing-channel behavior, and long-history performance remain implementation acceptance work, not completed checks.

## 13. Implementation progress

Layer 1 (workspaces, captured metadata, v2 migration, usable UI) is implemented in `packages/navy-staff`.

- Durable v2 root `{ version: 2, selectedWorkspaceId, workspaces, legacyArchive }`; each workspace has a stable local id, creation time, normalized `ownerMemberId` (or null), a revision list, and an editable cursor. Revisions carry a stable id and operation time.
- Each revision's content holds the workspace name, stable local area ids with captured map label, localized fleet labels, color, tag-slot hint, and capture time, plus area-keyed assignments and saved ship display records.
- Ordered v0/v1 to v2 migration preserves every area slot and owned id with neutral labels, keeps ownership unknown, and round-trips the opaque archive; existing-file migration, legacy Ship Info import, and missing-both initialization all emit the same v2 shape. A v1/v0 Navy file without a planner is invalid; only the legacy absent-file import may create an empty plan.
- The observed persistence payload is the durable root only; transient view state stays outside the slice. The persistence boundary validates nested areas, ship records, assignments, and the selected-workspace reference, and rejects malformed data without reset or filtering.
- UI offers create, rename, duplicate, switch, and confirmed delete. Both planning views render captured areas and include saved ships missing from the roster plus an Unknown type group. Live roster overlay, the ship picker, fleet badges, and live enrichment are gated on a matching workspace owner; a fresh workspace binds the owner only from a verified loaded roster.
- The two automatic reconciliation paths were removed: rendering no longer moves, adds, or removes assignments from live sortie tags, and chips/cells remain manually editable. The Refresh action and live-tag badges are gone.
- A single `appendRevision` helper is in place so the history layer needs no further storage migration; undo/preview are intentionally not exposed yet.
- Exported for later layers: workspace types and factories, the operation append helper, plain action creators, thunks, selectors (`areaViewsSelector`, `gridRowsSelector`, `ownerStatusSelector`, `assignedShipIdsSelector`, and related), and the migration/validation helpers.

Verification: `pnpm run check`, `pnpm test` (111 passed), `pnpm run test:browser` (103 passed), `pnpm run build`, `pnpm run build-storybook`, `pnpm run pack`, `pnpm run verify:package`, and `git diff --check` pass. The persistence boundary additionally rejects duplicate workspace ids and duplicate revision ids. Browser regressions cover workspace CRUD and switching, delete/rename confirmation invalidated by a selection change, duplicate/source independence, palette selection not recoloring unedited ships, and an unknown-master row never borrowing owned-ID artwork. Packed-artifact checks cover the v2 migration, legacy archive preservation, independent plugin saves, and no writes after unload. Local GPT-6.1-Sol review findings were fixed and the focused follow-up found no remaining actionable issues. Undo/redo, preview, explicit synchronization, and reference import/export remain for later layers.
