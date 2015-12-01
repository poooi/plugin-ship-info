require 'coffee-react/register'
require "#{ROOT}/views/env"

i18n = require 'i18n'
path = require 'path-extra'

i18n.configure
  locales: ['en-US', 'ja-JP', 'zh-CN', 'zh-TW']
  defaultLocale: 'zh-CN'
  directory: path.join(__dirname, 'i18n')
  updateFiles: false
  indent: '\t'
  extension: '.json'

i18n.setLocale(window.language)
window.__ = i18n.__

require './views'
