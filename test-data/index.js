const start2 = require('./start2.json').api_data
const port = require('./1476118113704_port.json').body
const detail = require('./1476118113704_port.json')
const _ships = ArrayByApi_id(port.api_ship)
const $ships = ArrayByApi_id(start2.api_mst_ship.filter(ship=>ship.api_id<500))
const $shipTypes = ArrayByApi_id(start2.api_mst_stype)



function ArrayByApi_id(src){
  const data = []
  for (const ship of src){
    data[ship.api_id] = ship
  }
  return data
}



window._ships = _ships
window.$ships = $ships
window.$shipTypes = $shipTypes

const event = new CustomEvent('game.response', {
  bubbles: true,
  cancelable: true,
  detail: detail,
})

window.dispatchEvent(event)
