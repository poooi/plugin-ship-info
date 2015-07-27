{React, ReactBootstrap, FontAwesome} = window
{Button} = ReactBootstrap
remote = require 'remote'
windowManager = remote.require './lib/window'

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
  displayName: <span><FontAwesome name='ship' key={0} /> 舰娘信息</span>
  author: 'Yunze'
  link: 'https://github.com/myzwillmake'
  version: '1.2.1'
  description: '提供已有舰娘详细信息查看'
  handleClick: ->
    window.shipInfoWindow.show()
