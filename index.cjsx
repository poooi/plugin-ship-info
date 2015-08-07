{React, ReactBootstrap, FontAwesome} = window
{Button} = ReactBootstrap
remote = require 'remote'
windowManager = remote.require './lib/window'

i18n = require './node_modules/i18n'
path = require 'path-extra'
{__} = i18n

i18n.configure
  locales: ['en_US', 'ja_JP', 'zh_CN']
  defaultLocale: 'zh_CN'
  directory: path.join(__dirname, 'i18n')
  updateFiles: false
  indent: '\t'
  extension: '.json'
i18n.setLocale(window.language)

window.shipInfoWindow = null
initialShipInfoWindow = ->
  window.shipInfoWindow = windowManager.createWindow
    #Use config
    x: config.get 'poi.window.x', 0
    y: config.get 'poi.window.y', 0
    width: 1020
    height: 650
  window.shipInfoWindow.loadUrl "file://#{__dirname}/index.html"
  if process.env.DEBUG?
    window.shipInfoWindow.openDevTools
      detach: true
if config.get('plugin.ShipInfo.enable', true)
  initialShipInfoWindow()

module.exports =
  name: 'ShipInfo'
  priority: 50
  displayName: <span><FontAwesome name='ship' key={0} />{' ' + __('Ship Girls Info')}</span>
  author: 'Yunze'
  link: 'https://github.com/myzwillmake'
  version: '1.3.0'
  description: __ 'Show detailed information of all owned ship girls'
  handleClick: ->
    window.shipInfoWindow.show()
