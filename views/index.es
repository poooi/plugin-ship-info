import React from 'react'
import ReactDOM from 'react-dom'
import { Provider } from 'react-redux'

import { store, extendReducer } from 'views/create-store'

import { reducer, PLUGIN_KEY } from './redux'
import ShipInfoTableArea from './ship-info-table-area'
import ShipInfoCheckboxArea from './ship-info-checkbox-area'

const { $ } = window

$('#font-awesome').setAttribute('href', require.resolve('font-awesome/css/font-awesome.css'))

const ShipInfoArea = () =>
  (
    <div className="ship-info-wrap">
      <ShipInfoCheckboxArea />
      <ShipInfoTableArea />
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
