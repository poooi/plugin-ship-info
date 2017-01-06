
import 'views/env'
import i18n2 from 'i18n-2'
import path from 'path-extra'

const i18n = new i18n2({
  locales: ['en-US', 'ja-JP', 'zh-CN', 'zh-TW'],
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
  console.log (error)
}
document.title = __('Ship Girls Info')

// augment font size with poi zoom level
const zoomLevel = config.get('poi.zoomLevel', 1)
const additionalStyle = document.createElement('style')

remote.getCurrentWindow().webContents.on('dom-ready', (e) => {
  document.body.appendChild(additionalStyle)
})

additionalStyle.innerHTML = `
  ship-info {
    font-size: ${zoomLevel * 100}%;
  }
`


require('./views')
