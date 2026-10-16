import { screen, userEvent, within } from 'storybook/test'

// Shared query helpers for the table/filter/export browser stories. All
// assertions use real rendered DOM (roles, text, geometry) rather than mocks.

export const SHIP_NAMES = [
  'Alpha',
  'Beta',
  'Gamma',
  'Delta',
  'Epsilon',
  'Zeta',
  'Eta',
  'Theta',
]

// Read the ship-name span's title attribute inside name cells rather than the
// whole cell text: the name cell also holds the avatar, fleet icon and sally
// tag, which must not pollute the match. DOM order is preserved.
export const renderedNames = (
  root: HTMLElement,
  match: (text: string) => boolean = (text) => SHIP_NAMES.includes(text),
): string[] =>
  Array.from(root.querySelectorAll('[role="gridcell"] span[title]'))
    .map((el) => el.getAttribute('title') ?? '')
    .filter((text) => text.length > 0 && match(text))

export const renderedShipLabels = (root: HTMLElement): string[] =>
  renderedNames(root, (text) => /^Ship \d+$/.test(text))

export const rowFor = (root: HTMLElement, name: string): HTMLElement => {
  const cell = within(root)
    .getByText(name)
    .closest('[role="gridcell"]') as HTMLElement
  // gridcell -> HeaderCell wrapper -> row
  return cell.parentElement!.parentElement as HTMLElement
}

export const rowCells = (root: HTMLElement, name: string): string[] =>
  Array.from(rowFor(root, name).querySelectorAll('[role="gridcell"]')).map(
    (el) => el.textContent ?? '',
  )

// Column index within a data row (row index cell has no gridcell role):
// id0 name1 type2 soku3 lv4 cond5 hp6 karyoku7 raisou8 taiku9 soukou10
// lucky11 kaihi12 taisen13 sakuteki14 repairtime15 equipment16 lock17
export const dataColumnIndex = {
  equipment: 16,
  kaihi: 12,
  karyoku: 7,
  repairtime: 15,
  taisen: 13,
} as const

export const headerCellByTitle = (
  root: HTMLElement,
  title: string,
): HTMLElement =>
  within(root).getByRole('button', { name: title })
    .parentElement as HTMLElement

export const headerTitles = (root: HTMLElement): string[] =>
  Array.from(root.querySelectorAll('[role="button"]'))
    .map((el) => el.textContent ?? '')
    .filter(Boolean)

export const openPopover = async (
  canvasElement: HTMLElement,
  label: string,
): Promise<void> => {
  await userEvent.click(
    within(canvasElement).getByRole('button', { name: label }),
  )
  await screen.findByText(label === 'Filter' ? 'Ship types' : 'Data')
}

export const tableScroller = (root: HTMLElement): HTMLElement =>
  root.querySelector('.ship-info-scrollable') as HTMLElement

// The currently open Blueprint popover content (portaled outside the canvas).
export const popoverContent = (): HTMLElement =>
  document.querySelector('.bp6-popover-content') as HTMLElement

export const scopedPopover = () => within(popoverContent())
