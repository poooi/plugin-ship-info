export interface ColumnWidthInput {
  id: string
  baseWidth: number
  minWidth: number
}

/**
 * Give every data column its measured minimum, then grow with the configured
 * base widths as weights. The row index is excluded and stays fixed.
 */
export const distributeColumnWidths = (
  columns: ColumnWidthInput[],
  availableWidth: number,
  rowIndexWidth: number,
) => {
  const totalMin = columns.reduce((sum, column) => sum + column.minWidth, 0)
  const totalWeight = columns.reduce(
    (sum, column) => sum + column.baseWidth,
    0,
  )
  const spare = Math.max(0, availableWidth - rowIndexWidth - totalMin)

  return Object.fromEntries(
    columns.map((column) => [
      column.id,
      column.minWidth +
        (spare > 0 && totalWeight > 0
          ? (spare * column.baseWidth) / totalWeight
          : 0),
    ]),
  )
}
