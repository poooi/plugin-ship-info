import React, { Component } from 'react'
import ReactDOM from 'react-dom'
import { Provider } from 'react-redux'
import { remote } from 'electron'
import semver from 'semver'

import { store, extendReducer } from 'views/create-store'

import { reducer, PLUGIN_KEY } from './redux'
import ShipInfoTableArea from './ship-info-table-area'
import ShipInfoCheckboxArea from './ship-info-checkbox-area'

const { $, POI_VERSION } = window
const config = remote.require('./lib/config')

function onConfigChange({ path, value }) {
  return {
    type: '@@Config',
    path,
    value,
  }
}

const solveConfSet = (path, value) => {
  const details = {
    path: path,
    value: value,
  }
  store.dispatch(onConfigChange(details))
}
if (semver.lte(POI_VERSION, '7.3.0')) {
  console.warn('Detected poi version less than or equal to 7.3.0, use bundle action')
  config.addListener('config.set', solveConfSet)
  window.addEventListener('unload', (e) => {
    config.removeListener('config.set', solveConfSet)
  })
}

$('#font-awesome').setAttribute('href', require.resolve('font-awesome/css/font-awesome.css'))

const ShipInfoArea = () =>
  <div className="ship-info-wrap">
    <ShipInfoCheckboxArea />
    <ShipInfoTableArea />
  </div>

extendReducer(PLUGIN_KEY, reducer)
window.store = store

ReactDOM.render(
  <Provider store={store}>
    <ShipInfoArea />
  </Provider>,
  $('#ship-info')
)
