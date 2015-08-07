{React} = window

ShipInfoTableArea = require './ship-info-table-area'
ShipInfoCheckboxArea = require './ship-info-checkbox-area'

ShipInfoArea = React.createClass
  getInitialState: ->
    sortName: "lv"
    sortOrder: 0
    shipTypeBoxes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13,
                    14, 15, 16, 17, 18, 19, 20, 21]
    lvRadio: 0
    lockedRadio: 0
    expeditionRadio: 0

  sortRules: (name, order) ->
    @setState
      sortName: name
      sortOrder: order

  filterRules: (filterType, val) ->
    switch filterType
      when 'type'
        @setState
          shipTypeBoxes: val
      when 'lv'
        @setState
          lvRadio: val
      when 'locked'
        @setState
          lockedRadio: val
      when 'expedition'
        @setState
          expeditionRadio: val

  render: ->
    <div>
      <ShipInfoCheckboxArea
        sortRules={@sortRules}
        filterRules={@filterRules}
      />
      <ShipInfoTableArea
        sortName={@state.sortName}
        sortOrder={@state.sortOrder}
        shipTypeBoxes={@state.shipTypeBoxes}
        lvRadio={@state.lvRadio}
        lockedRadio={@state.lockedRadio}
        expeditionRadio={@state.expeditionRadio}
      />
    </div>

React.render <ShipInfoArea />, $('ship-info')
