export { reducer, reactClass } from './views'

export const pluginDidLoad = (): void => {
  global.config.set('plugin.ShipInfo.shipTypeChecked')
  global.config.set('plugin.ShipInfo.bounds')
}

export const windowMode = true
