import 'views/env'

import i18n2 from 'i18n-2'
import path from 'path-extra'
import { remote } from 'electron'
import { debounce } from 'lodash'

const i18n = new i18n2({
  locales: ['en-US', 'ja-JP', 'zh-CN', 'zh-TW', 'ko-KR'],
  defaultLocale: 'zh-CN',
  directory: path.join(__dirname, 'i18n'),
  devMode: false,
  extension: '.json',
})
i18n.setLocale(window.language)
window.__ = i18n.__.bind(i18n)

try {
  require('poi-plugin-translator').pluginDidLoad()
}
catch (error) {
  console.warn (error)
}
document.title = window.__('Ship Girls Info')

// augment font size with poi zoom level
const zoomLevel = config.get('poi.zoomLevel', 1)
const additionalStyle = document.createElement('style')

remote.getCurrentWindow().webContents.on('dom-ready', (e) => {
  document.body.appendChild(additionalStyle)
})

additionalStyle.innerHTML = `
  ship-info,
  .info-tooltip {
    font-size: ${zoomLevel * 100}%;
  }
`
// remember window size
window.shipInfoWindow = remote.getCurrentWindow()

const rememberSize = debounce(() => {
  const b = window.shipInfoWindow.getBounds()
  config.set('plugin.ShipInfo.bounds', b)
}, 5000)


window.shipInfoWindow.on('move', rememberSize)
window.shipInfoWindow.on('resize', rememberSize)


require('./views')
