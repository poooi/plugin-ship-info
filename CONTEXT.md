# Navy Staff planning

Navy Staff organizes ships into sortie plans. These terms distinguish editable plans, historical states, and shared references.

## Language

**Workspace**:
A named, independently editable sortie plan with its own area information and operation history.
_Avoid_: Project (as a second level above a workspace).

**Planning area**:
A group to which ships are assigned in a plan, initially corresponding to a sortie-tag slot. It is not necessarily one unique geographical sea area.

**Area snapshot**:
The area names, fleet names, colors, and source associations captured for a workspace at a particular time.

**Actual sortie tag**:
The assignment reported by the game for an owned ship, distinct from the assignment proposed in a workspace.

**Revision**:
A saved state of a workspace resulting from one meaningful planning operation.

**Reference snapshot**:
A frozen, read-only presentation of one plan state, including the information needed to understand it without the original game session.
_Avoid_: Editable import, backup.

**Share code**:
A text representation of a reference snapshot that can be copied between users and opened in a compatible viewer.
