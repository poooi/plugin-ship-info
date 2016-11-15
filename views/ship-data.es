let $ships;
let $shipTypes;
const togos = ['api_houg','api_raig','api_tyku','api_souk','api_luck'];
const getTogo = (ship, index) =>{
  let range = $ships[ship.api_ship_id][togos[index]];
  return range[1] - range[0] - ship.api_kyouka[index];
};
let shipData = {
  id: (ship)=> ship.api_id,
  type_id: (ship)=> $ships[ship.api_ship_id].api_stype,
  type: (ship)=> $shipTypes[$ships[ship.api_ship_id].api_stype].api_name,
  name: (ship)=> $ships[ship.api_ship_id].api_name,
  yomi: (ship)=> $ships[ship.api_ship_id].api_yomi,
  sortno: (ship)=> $ships[ship.api_ship_id].api_sortno,
  lv: (ship)=> ship.api_lv,
  cond: (ship)=> ship.api_cond,
  //firepower
  //karyoku: (ship)=> ship.api_karyoku,
  //houg: (ship)=> $ships[ship.api_ship_id].api_houg,
  karyoku: (ship) => ship.api_karyoku[0],
  karyoku_togo: (ship)=> getTogo(ship, 0),
  //torpedo
  //raisou: (ship)=> ship.api_raisou,
  //raig: (ship)=> $ships[ship.api_ship_id].api_raig,
  raisou: (ship)=> ship.api_raisou[0],
  raisou_togo: (ship)=> getTogo(ship, 1),
  //anti_air
  //taiku: (ship)=> ship.api_taiku,
  //tyku: (ship)=> $ships[ship.api_ship_id].api_tyku,
  taiku: (ship)=> ship.api_taiku[0],
  taiku_togo: (ship)=> getTogo(ship, 2),
  //armor
  //soukou: (ship)=> ship.api_soukou,
  //souk: (ship)=> $ships[ship.api_ship_id].api_souk,
  soukou: (ship)=> ship.api_soukou[0],
  soukou_togo: (ship)=> getTogo(ship, 3),
  //lucky
  lucky: (ship)=> ship.api_lucky[0],
  //luck: (ship)=> $ships[ship.api_ship_id].api_luck,
  lucky_togo: (ship)=> getTogo(ship, 4),
  //kyouka: (ship)=> ship.api_kyouka,
  kaihi: (ship)=> ship.api_kaihi[0],
  taisen: (ship)=> ship.api_taisen[0],
  sakuteki: (ship)=> ship.api_sakuteki[0],
  slot: (ship)=> JSON.parse(JSON.stringify(ship.api_slot)),
  exslot: (ship)=> ship.api_slot_ex,
  locked: (ship)=> ship.api_locked,
  nowhp: (ship)=> ship.api_nowhp,
  maxhp: (ship)=> ship.api_maxhp,
  //_losshp: (ship)=> ship.api_maxhp - ship.api_nowhp,
  repairtime: (ship)=> parseInt (ship.api_ndock_time / 1000.0),
  after: (ship)=> $ships[ship.api_ship_id].api_aftershipid,
  sallyArea: (ship)=> ship.api_sally_area
}


export default class  {
  constructor(shipsLib, shipTypesLib){
    $ships = shipsLib;
    $shipTypes = shipTypesLib;
  }
  // getKeys(){
  //   let data = [];
  //   for(const key in shipData){
  //     if (key[0] != '_' )
  //       data.push(key);
  //   }
  //   return data;
  // }
  getData(ship){
    let data = {};
    for (const key in shipData){
      data[key] = shipData[key](ship);
    }
    return data;
  }
};
