import React from 'react'
import ReactDOM from 'react-dom'
import { Provider } from 'react-redux'

import { store, extendReducer } from 'views/create-store'

import { reducer, PLUGIN_KEY } from './redux'
import TableView from './table-view'
import SettingsView from './settings-view'

const { $ } = window

$('#font-awesome').setAttribute('href', require.resolve('font-awesome/css/font-awesome.css'))

const ShipInfoArea = () =>
  (
    <div className="ship-info-wrap">
      <SettingsView />
      <TableView />
    </div>
  )

extendReducer(PLUGIN_KEY, reducer)
window.store = store

ReactDOM.render(
  <Provider store={store}>
    <ShipInfoArea />
  </Provider>,
  $('#ship-info')
)
