import { screen, Display } from 'electron'

const { workArea } = screen.getPrimaryDisplay()
let { x, y, width, height } = global.config.get(
  'plugin.ShipInfo.bounds',
  workArea,
)
const validate = (n: number, min: number, range: number): boolean =>
  n != null && n >= min && n < min + range

const withinDisplay = (d: Display): boolean => {
  const wa = d.workArea
  return validate(x, wa.x, wa.width) && validate(y, wa.y, wa.height)
}

if (!screen.getAllDisplays().some(withinDisplay)) {
  ;({ x, y } = workArea)
}
if (width == null) {
  ;({ width } = workArea)
}
if (height == null) {
  ;({ height } = workArea)
}

export const windowOptions = {
  x,
  y,
  width,
  height,
}
export { reducer, reactClass } from './views'

export const pluginDidLoad = (): void => {
  global.config.set('plugin.ShipInfo.shipTypeChecked')
}
export const windowMode = true
