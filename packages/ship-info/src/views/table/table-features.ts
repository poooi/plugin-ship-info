import {
  columnFilteringFeature,
  columnOrderingFeature,
  columnPinningFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  createFilteredRowModel,
  createSortedRowModel,
  globalFilteringFeature,
  rowSortingFeature,
  tableFeatures,
} from '@tanstack/react-table'

// Single stable feature registry shared by the column definitions and the
// table instance so both agree on the exact TFeatures type and neither has to
// import the other (avoiding a type cycle).
export const shipInfoTableFeatures = tableFeatures({
  columnFilteringFeature,
  globalFilteringFeature,
  rowSortingFeature,
  columnOrderingFeature,
  columnVisibilityFeature,
  columnSizingFeature,
  columnPinningFeature,
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
})

export type ShipInfoTableFeatures = typeof shipInfoTableFeatures
