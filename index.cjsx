{React, ReactBootstrap, FontAwesome} = window
{Button} = ReactBootstrap
remote = require 'remote'
windowManager = remote.require './lib/window'

i18n = require './node_modules/i18n'
path = require 'path-extra'
{__} = i18n

i18n.configure
  locales: ['en-US', 'ja-JP', 'zh-CN', 'zh-TW']
  defaultLocale: 'zh-CN'
  directory: path.join(__dirname, 'i18n')
  updateFiles: false
  indent: '\t'
  extension: '.json'
i18n.setLocale(window.language)

window.shipInfoWindow = null
handleWindowMoveResize = ->
  b1 = window.shipInfoWindow.getBounds()
  # console.log "Moved to: #{JSON.stringify(b1)}"
  setTimeout((->
    b2 = window.shipInfoWindow.getBounds()
    if JSON.stringify(b2) == JSON.stringify(b1)
      config.set 'plugin.ShipInfo.bounds', b2
      # console.log "   Saved:  #{JSON.stringify(b2)}"
  ), 5000)
initialShipInfoWindow = ->
  window.shipInfoWindow = windowManager.createWindow
    x: config.get 'plugin.ShipInfo.bounds.x', 0
    y: config.get 'plugin.ShipInfo.bounds.y', 0
    width: config.get 'plugin.ShipInfo.bounds.width', 1020
    height: config.get 'plugin.ShipInfo.bounds.height', 650
  window.shipInfoWindow.on 'move', handleWindowMoveResize
  window.shipInfoWindow.on 'resize', handleWindowMoveResize
  window.shipInfoWindow.loadURL "file://#{__dirname}/index.html"
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
  version: '1.6.0'
  description: __ 'Show detailed information of all owned ship girls'
  handleClick: ->
    window.shipInfoWindow.show()
