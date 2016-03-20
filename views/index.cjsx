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

ShipInfoArea = React.createClass
  getInitialState: ->
    sortName: "lv"
    sortOrder: 0
    shipTypeBoxes: [1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13,
                    14, 15, 16, 17, 18, 19, 20, 21]
    lvRadio: 2
    lockedRadio: 1
    expeditionRadio: 0
    modernizationRadio: 0
    remodelRadio: 0
  componentWillMount: ->
    sortName = config.get "plugin.ShipInfo.sortName", @state.sortName
    sortOrder = config.get "plugin.ShipInfo.sortOrder", @state.sortOrder
    shipTypeBoxes = JSON.parse config.get "plugin.ShipInfo.shipTypeBoxes", JSON.stringify @state.shipTypeBoxes
    lvRadio = config.get "plugin.ShipInfo.lvRadio", @state.lvRadio
    lockedRadio = config.get "plugin.ShipInfo.lockedRadio", @state.lockedRadio
    expeditionRadio = config.get "plugin.ShipInfo.expeditionRadio", @state.expeditionRadio
    modernizationRadio = config.get "plugin.ShipInfo.modernizationRadio", @state.modernizationRadio
    remodelRadio = config.get "plugin.ShipInfo.remodelRadio", @state.remodelRadio
    @setState
      sortName: sortName
      sortOrder: sortOrder
      shipTypeBoxes: shipTypeBoxes
      lvRadio: lvRadio
      lockedRadio: lockedRadio
      expeditionRadio: expeditionRadio
      modernizationRadio: modernizationRadio
      remodelRadio: remodelRadio

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
      />
    </div>

ReactDOM.render <ShipInfoArea />, $('ship-info')
