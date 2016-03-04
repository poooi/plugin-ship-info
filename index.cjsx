module.exports =
  windowOptions:
    x: config.get 'plugin.ShipInfo.bounds.x', 0
    y: config.get 'plugin.ShipInfo.bounds.y', 0
    width: config.get 'plugin.ShipInfo.bounds.width', 1020
    height: config.get 'plugin.ShipInfo.bounds.height', 650
  windowURL: "file://#{__dirname}/index.html"
