import { screen } from 'electron'

const { workArea } = screen.getPrimaryDisplay()
let { x, y, width, height } = config.get('plugin.ShipInfo.bounds', workArea)
const validate = (n, min, range) => n != null && n >= min && n < min + range
const withinDisplay = d => {
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
export const pluginDidLoad = () => {
  config.set('plugin.ShipInfo.shipTypeChecked')
}
export const windowMode = true
