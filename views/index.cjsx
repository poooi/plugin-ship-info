{React, ReactDOM, config} = window

$('#font-awesome')?.setAttribute 'href', require.resolve('font-awesome/css/font-awesome.css')

window.shipInfoWindow = remote.getCurrentWindow()
handleWindowMoveResize = ->
  b1 = window.shipInfoWindow.getBounds()
  # console.log "Moved to: #{JSON.stringify(b1)}"
  setTimeout((->
    b2 = window.shipInfoWindow.getBounds()
    if JSON.stringify(b2) == JSON.stringify(b1)
      config.set 'plugin.ShipInfo.bounds', b2
      # console.log "   Saved:  #{JSON.stringify(b2)}"
  ), 5000)
window.shipInfoWindow.on 'move', handleWindowMoveResize
window.shipInfoWindow.on 'resize', handleWindowMoveResize

ShipInfoTableArea = require './ship-info-table-area'
ShipInfoCheckboxArea = require './ship-info-checkbox-area'

sallyTags = require "../assets/SallyTags.json"
tagStyles = [
  'default',
  'primary',
  'success',
  'info',
  'warning'
]

ShipInfoArea = React.createClass
  getInitialState: ->
    sortName: config.get "plugin.ShipInfo.sortName", "lv"
    sortOrder: config.get "plugin.ShipInfo.sortOrder", 0
    shipTypeBoxes: JSON.parse config.get("plugin.ShipInfo.shipTypeBoxes") || JSON.stringify [1..21]
    lvRadio: config.get "plugin.ShipInfo.lvRadio", 2
    lockedRadio: config.get "plugin.ShipInfo.lockedRadio", 1
    expeditionRadio: config.get "plugin.ShipInfo.expeditionRadio", 0
    modernizationRadio: config.get "plugin.ShipInfo.modernizationRadio", 0
    remodelRadio: config.get "plugin.ShipInfo.remodelRadio", 0
    sallyAreaBoxes: JSON.parse config.get("plugin.ShipInfo.sallyAreaBoxes") || JSON.stringify sallyTags.map -> true

  sortRules: (name, order) ->
    config.set "plugin.ShipInfo.sortName", name
    config.set "plugin.ShipInfo.sortOrder", order
    @setState
      sortName: name
      sortOrder: order

  filterRules: (filterType, val) ->
    switch filterType
      when 'type'
        config.set "plugin.ShipInfo.shipTypeBoxes", JSON.stringify val
        @setState
          shipTypeBoxes: val
      when 'lv'
        config.set "plugin.ShipInfo.lvRadio", val
        @setState
          lvRadio: val
      when 'locked'
        config.set "plugin.ShipInfo.lvRadio", val
        @setState
          lockedRadio: val
      when 'expedition'
        config.set "plugin.ShipInfo.expeditionRadio", val
        @setState
          expeditionRadio: val
      when 'modernization'
        config.set "plugin.ShipInfo.modernizationRadio", val
        @setState
          modernizationRadio: val
      when 'remodel'
        config.set "plugin.ShipInfo.remodelRadio", val
        @setState
          remodelRadio: val
      when 'sallyArea'
        config.set "plugin.ShipInfo.sallyAreaBoxes", JSON.stringify val
        @setState
          sallyAreaBoxes: val
  render: ->
    <div>
      <ShipInfoCheckboxArea
        sortRules={@sortRules}
        filterRules={@filterRules}
        sortKey={@state.sortName}
        order={@state.sortOrder}
        shipTypeBoxes={@state.shipTypeBoxes}
        lvRadio={@state.lvRadio}
        lockedRadio={@state.lockedRadio}
        expeditionRadio={@state.expeditionRadio}
        modernizationRadio={@state.modernizationRadio}
        remodelRadio={@state.remodelRadio}
        sallyTags={sallyTags}
        sallyAreaBoxes={@state.sallyAreaBoxes}
        tagStyles={tagStyles}
      />
      <ShipInfoTableArea
        sortRules={@sortRules}
        sortName={@state.sortName}
        sortOrder={@state.sortOrder}
        shipTypeBoxes={@state.shipTypeBoxes}
        lvRadio={@state.lvRadio}
        lockedRadio={@state.lockedRadio}
        expeditionRadio={@state.expeditionRadio}
        modernizationRadio={@state.modernizationRadio}
        remodelRadio={@state.remodelRadio}
        sallyTags={sallyTags}
        sallyAreaBoxes={@state.sallyAreaBoxes}
        tagStyles={tagStyles}
      />
    </div>

ReactDOM.render <ShipInfoArea />, $('ship-info')
