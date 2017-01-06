import { screen } from 'electron'

const {workArea} = screen.getPrimaryDisplay()
let {x, y, width, height} = config.get('plugin.ShipInfo.bounds', workArea)
const validate = (n, min, range) => (n != null && n >= min && n < min + range)
const withinDisplay = (d) => {
  const wa = d.workArea
  return validate(x, wa.x, wa.width) && validate(y, wa.y, wa.height)
}
if (!screen.getAllDisplays().some(withinDisplay)) {
  x = workArea.x
  y = workArea.y
}
if (width == null) {
  width = workArea.width
}
if (height == null) {
  height = workArea.height
}

export const windowOptions = {
  x,
  y,
  width,
  height,
}
export const windowURL = `file://${__dirname}/index.html`
export const useEnv = true
