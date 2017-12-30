const got = require('got')
const fs = require('fs-extra')
const _ = require('lodash')

const buildEvasion = async () => {
  const resp = await got('https://raw.githubusercontent.com/TeamFleet/WhoCallsTheFleet-DB/master/db/ships.nedb')
  const res = _(resp.body)
    .split('\n')
    .filter(Boolean)
    .map(str => JSON.parse(str))
    .map(ship => ([ship.id, ship.stat.evasion]))
    .fromPairs()
    .value()

  await fs.outputJSON('./evasion.json', res)
}


buildEvasion()
