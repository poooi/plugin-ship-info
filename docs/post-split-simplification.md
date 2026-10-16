# Post-split simplification

The simplification audit identified four bounded follow-ups to the plugin split:

1. Remove unused filtering, sorting, historical fleet lists, and remodel-chain
   calculations.
2. Derive table filter and sorting inputs directly from Redux props, removing
   intermediate state that merely mirrors those props.
3. Share the two plugins' identical build configuration inside the repository.
4. Derive the planner's Fuse search index from its roster with React memoization,
   removing manual index synchronization and forced updates.

These changes preserve the plugin entry points, saved configuration, host
dependency rules, and user workflows. Persistence, legacy import, cancellation,
and cross-reload write serialization remain outside this cleanup.

## Active table behavior

TanStack owns table filtering and sorting. CSV export reads the table's ordered
result through `filteredShipIdsAtom`, including rows outside the virtualized
viewport. The obsolete `filterShipIdsSelector` and its private helpers had no
production consumer and have been removed rather than maintained as a second
implementation.

The unused historical fleet lists, remodel-chain selectors, and obsolete
configuration projections are also removed. Existing user configuration is not
deleted or rewritten.

The old selector-only filter tests are replaced by the existing production-path
coverage: `tests/ui-table.test.tsx` and the filter, table workflow, and export
browser stories exercise displayed rows, config changes, host updates, and CSV
results. Validation must continue to cover those behaviors rather than restoring
the unused implementation merely to test it.

## Table state ownership

Redux-backed props are the source of truth for table filters and sorting. The
table derives memoized TanStack inputs directly from those props; it does not
copy them into Jotai atoms or local React state after rendering. Header actions
continue to write the same poi configuration keys.

Jotai still owns cell highlighting and the table's ordered result IDs consumed
by CSV export. These are independent UI state and a real cross-component
consumer, respectively, rather than copies of the filter inputs. The plugin's
existing provider continues to isolate these values between mounted views.
