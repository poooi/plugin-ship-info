import 'views/env'

import i18n2 from 'i18n-2'
import { join } from 'path-extra'
import { remote } from 'electron'
import { ceil } from 'lodash'

import html2canvas from './lib/html2canvas'

const i18n = new i18n2({ // eslint-disable-line new-cap
  locales: ['en-US', 'ja-JP', 'zh-CN', 'zh-TW', 'ko-KR'],
  defaultLocale: 'zh-CN',
  directory: join(__dirname, 'i18n'),
  devMode: false,
  extension: '.json',
})
i18n.setLocale(window.language)

if (i18n.resources == null) {
  i18n.resources = {}
}

if (i18n.resources.__ == null) {
  i18n.resources.__ = str => str
}
if (i18n.resources.translate == null) {
  i18n.resources.translate = (locale, str) => str
}
if (i18n.resources.setLocale == null) {
  i18n.resources.setLocale = () => {}
}
window.i18n = i18n
try {
  require('poi-plugin-translator').pluginDidLoad() // eslint-disable-line global-require
} catch (error) {
  console.warn(error)
}

window.__ = i18n.__.bind(i18n)
window.__r = i18n.resources.__.bind(i18n.resources) // eslint-disable-line no-underscore-dangle
document.title = window.__('Ship Girls Info')

// // augment font size with poi zoom level
// const zoomLevel = config.get('poi.zoomLevel', 1)
// const additionalStyle = document.createElement('style')

// remote.getCurrentWindow().webContents.on('dom-ready', (e) => {
//   document.body.appendChild(additionalStyle)
// })

// additionalStyle.innerHTML = `
//   ship-info,
//   .info-tooltip {
//     font-size: ${zoomLevel * 100}%;
//   }
// `
// remember window size
window.shipInfoWindow = remote.getCurrentWindow()
window.shipInfoContents = remote.getCurrentWebContents()

remote.getCurrentWindow().on('close', () => {
  const b = window.shipInfoWindow.getBounds()
  window.config.set('plugin.ShipInfo.bounds', b)
})

window.captureRect = async (query) => {
  const rect = document.querySelector(query)
  if (!rect) {
    return
  }
  const { width, height } = rect.getBoundingClientRect()
  const canvas = await html2canvas(rect, {
    background: '#333',
    width: ceil(width, 16),
    height: ceil(height, 16),
  })
  remote.getCurrentWebContents().downloadURL(canvas.toDataURL('image/png'))
}

require('./views')
