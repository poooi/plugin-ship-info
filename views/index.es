const {React, ReactDOM, config, remote, $} = window

$('#font-awesome').setAttribute('href', require.resolve('font-awesome/css/font-awesome.css'))

window.shipInfoWindow = remote.getCurrentWindow()
const handleWindowMoveResize = function(){
  const b1 = window.shipInfoWindow.getBounds()
  setTimeout((function(){
    const b2 = window.shipInfoWindow.getBounds()
    if (JSON.stringify(b2) == JSON.stringify(b1))
      config.set ('plugin.ShipInfo.bounds', b2)
  }
   ), 5000)
}
window.shipInfoWindow.on('move', handleWindowMoveResize)
window.shipInfoWindow.on('resize', handleWindowMoveResize)

import ShipInfoTableArea from './ship-info-table-area'
import ShipInfoCheckboxArea from './ship-info-checkbox-area'

import sallyTags from "../assets/SallyTags.json"

const tagStyles = [
  'default',
  'primary',
  'success',
  'info',
  'warning',
]
function range(start, end){
  const ret = []
  for(let i = start; i <= end; i++)
    ret.push(i)
  return ret
}

const ShipInfoArea = React.createClass({
  getInitialState: function(){
    return {
      sortName: config.get("plugin.ShipInfo.sortName", "lv"),
      sortOrder: config.get("plugin.ShipInfo.sortOrder", 0),
      shipTypeBoxes: JSON.parse(config.get("plugin.ShipInfo.shipTypeBoxes", JSON.stringify(range(1,21)))),
      lvRadio: config.get("plugin.ShipInfo.lvRadio", 2),
      lockedRadio: config.get("plugin.ShipInfo.lockedRadio", 1),
      expeditionRadio: config.get("plugin.ShipInfo.expeditionRadio", 0),
      modernizationRadio: config.get("plugin.ShipInfo.modernizationRadio", 0),
      remodelRadio: config.get("plugin.ShipInfo.remodelRadio", 0),
      sallyAreaBoxes: JSON.parse(config.get("plugin.ShipInfo.sallyAreaBoxes", JSON.stringify(sallyTags.map(()=>true)))),
    }
  },
  sortRules: function(name, order){
    config.set("plugin.ShipInfo.sortName", name)
    config.set("plugin.ShipInfo.sortOrder", order)
    this.setState({
      sortName: name,
      sortOrder: order,
    })
  },
  filterRules: function(filterType, val){
    switch(filterType){
    case 'type':
      config.set("plugin.ShipInfo.shipTypeBoxes", JSON.stringify (val))
      this.setState({shipTypeBoxes: val})
      break
    case 'lv':
      config.set("plugin.ShipInfo.lvRadio", val)
      this.setState({lvRadio: val})
      break
    case 'locked':
      config.set("plugin.ShipInfo.lvRadio", val)
      this.setState({lockedRadio: val})
      break
    case 'expedition':
      config.set ("plugin.ShipInfo.expeditionRadio", val)
      this.setState({expeditionRadio: val})
      break
    case 'modernization':
      config.set ("plugin.ShipInfo.modernizationRadio", val)
      this.setState({modernizationRadio: val})
      break
    case 'remodel':
      config.set ("plugin.ShipInfo.remodelRadio", val)
      this.setState({remodelRadio: val})
      break
    case 'sallyArea':
      config.set ("plugin.ShipInfo.sallyAreaBoxes", JSON.stringify (val))
      this.setState({sallyAreaBoxes: val})
      break
    }
  },
  
  render: function(){
    return(
    <div>
      <ShipInfoCheckboxArea
        sortRules={this.sortRules}
        filterRules={this.filterRules}
        sortKey={this.state.sortName}
        order={this.state.sortOrder}
        shipTypeBoxes={this.state.shipTypeBoxes}
        lvRadio={this.state.lvRadio}
        lockedRadio={this.state.lockedRadio}
        expeditionRadio={this.state.expeditionRadio}
        modernizationRadio={this.state.modernizationRadio}
        remodelRadio={this.state.remodelRadio}
        sallyTags={sallyTags}
        sallyAreaBoxes={this.state.sallyAreaBoxes}
        tagStyles={tagStyles}
      />
      <ShipInfoTableArea
        sortRules={this.sortRules}
        sortName={this.state.sortName}
        sortOrder={this.state.sortOrder}
        shipTypeBoxes={this.state.shipTypeBoxes}
        lvRadio={this.state.lvRadio}
        lockedRadio={this.state.lockedRadio}
        expeditionRadio={this.state.expeditionRadio}
        modernizationRadio={this.state.modernizationRadio}
        remodelRadio={this.state.remodelRadio}
        sallyTags={sallyTags}
        sallyAreaBoxes={this.state.sallyAreaBoxes}
        tagStyles={tagStyles}
      />
    </div>)
  },
})

ReactDOM.render(<ShipInfoArea />, $('ship-info'))

