require 'coffee-react/register'
require "#{ROOT}/views/env"

path = require 'path-extra'

window.i18n = {}
window.i18n.main = new(require 'i18n-2')
  locales: ['en-US', 'ja-JP', 'zh-CN', 'zh-TW']
  defaultLocale: 'zh-CN'
  directory: path.join(__dirname, 'i18n')
  updateFiles: false
  indent: '\t'
  extension: '.json'
window.i18n.main.setLocale(window.language)
console.log 'barfoo'
window.__ = window.i18n.main.__.bind(window.i18n.main)
console.log 'barfoo'
window.i18n.resources = {}
window.i18n.resources.__ = (str) -> return str
window.i18n.resources.translate = (locale, str) -> return str
window.i18n.resources.setLocale = (str) -> return

try
  require 'poi-plugin-translator'
catch error
  console.log error

require './views'
