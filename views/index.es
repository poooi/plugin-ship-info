import React, {Component} from 'react'
import ReactDOM from 'react-dom'
import { connect, Provider } from 'react-redux'

import { store } from 'views/create-store'

import ShipInfoTableArea from './ship-info-table-area'
import ShipInfoCheckboxArea from './ship-info-checkbox-area'

$('#font-awesome').setAttribute ('href', require.resolve('font-awesome/css/font-awesome.css'))

const sallyTags = require("../assets/SallyTags.json")

const tagStyles = [
  'default',
  'primary',
  'success',
  'warning',
  'info',
  'warning',
]

const ShipInfoArea = connect(
  (state, props) => ({
    sortName: config.get("plugin.ShipInfo.sortName", "lv"),
    sortOrder: config.get ("plugin.ShipInfo.sortOrder", 0),
    shipTypeBoxes: JSON.parse(config.get("plugin.ShipInfo.shipTypeBoxes")) || [...Array(22).keys()].slice(1),
    lvRadio: config.get ("plugin.ShipInfo.lvRadio", 2),
    lockedRadio: config.get ("plugin.ShipInfo.lockedRadio", 1),
    expeditionRadio: config.get ("plugin.ShipInfo.expeditionRadio", 0),
    modernizationRadio: config.get ("plugin.ShipInfo.modernizationRadio", 0),
    remodelRadio: config.get ("plugin.ShipInfo.remodelRadio", 0),
    sallyAreaBoxes: JSON.parse (config.get("plugin.ShipInfo.sallyAreaBoxes")) || JSON.stringify(sallyTags.slice().fill(true)),  
  })
)(class ShipInfoArea extends Component {
  sortRules = (name, order) => {
    config.set ("plugin.ShipInfo.sortName", name)
    config.set ("plugin.ShipInfo.sortOrder", order)  
  }

  filterRules = (filterType, val) => {
    switch (filterType) {
    case 'type':
      config.set ("plugin.ShipInfo.shipTypeBoxes", JSON.stringify (val))
      break
    case 'lv':
      config.set ("plugin.ShipInfo.lvRadio", val)
      break
    case 'locked':
      config.set ("plugin.ShipInfo.lockedRadio", val)
      break
    case 'expedition':
      config.set ("plugin.ShipInfo.expeditionRadio", val)
      break
    case 'modernization':
      config.set ("plugin.ShipInfo.modernizationRadio", val)
      break
    case 'remodel':
      config.set ("plugin.ShipInfo.remodelRadio", val)
      break
    case 'sallyArea':
      config.set ("plugin.ShipInfo.sallyAreaBoxes", JSON.stringify(val))
      break
    }
  }

  render(){
    return(
      <div>
        <ShipInfoCheckboxArea
          sortRules={this.sortRules}
          filterRules={this.filterRules}
          sortKey={this.props.sortName}
          order={this.props.sortOrder}
          shipTypeBoxes={this.props.shipTypeBoxes}
          lvRadio={this.props.lvRadio}
          lockedRadio={this.props.lockedRadio}
          expeditionRadio={this.props.expeditionRadio}
          modernizationRadio={this.props.modernizationRadio}
          remodelRadio={this.props.remodelRadio}
          sallyTags={sallyTags}
          sallyAreaBoxes={this.props.sallyAreaBoxes}
          tagStyles={tagStyles}
        />
        <ShipInfoTableArea
          sortRules={this.sortRules}
          sortName={this.props.sortName}
          sortOrder={this.props.sortOrder}
          shipTypeBoxes={this.props.shipTypeBoxes}
          lvRadio={this.props.lvRadio}
          lockedRadio={this.props.lockedRadio}
          expeditionRadio={this.props.expeditionRadio}
          modernizationRadio={this.props.modernizationRadio}
          remodelRadio={this.props.remodelRadio}
          sallyTags={sallyTags}
          sallyAreaBoxes={this.props.sallyAreaBoxes}
          tagStyles={tagStyles}
        />
      </div>      
    )
  }
})

ReactDOM.render (
  <Provider store={store}>
    <ShipInfoArea />
  </Provider>,
  $('ship-info')
)