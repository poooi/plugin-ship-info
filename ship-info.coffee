require 'coffee-react/register'
require "#{ROOT}/views/env"

path = require 'path-extra'

window.i18n = {}
window.i18n.main = new(require 'i18n-2')
  locales: ['ko-KR', 'en-US', 'ja-JP', 'zh-CN', 'zh-TW'],
  defaultLocale: 'zh-CN',
  directory: path.join(__dirname, 'i18n'),
  devMode: false,
  extension: '.json'
window.i18n.main.setLocale(window.language)
window.__ = window.i18n.main.__.bind(window.i18n.main)
window.i18n.resources = {}
window.i18n.resources.__ = (str) -> return str
window.i18n.resources.translate = (locale, str) -> return str
window.i18n.resources.setLocale = (str) -> return

try
  require('poi-plugin-translator').pluginDidLoad()
catch error
  console.log error

document.title = __ 'Ship Girls Info'

FontAwesome = if require('react-fontawesome')?.default? then require('react-fontawesome').default else require('react-fontawesome')

window.FontAwesome = FontAwesome


require './views'

