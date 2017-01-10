import React, {Component} from 'react'
import ReactDOM from 'react-dom'
import { Provider } from 'react-redux'

import { store } from 'views/create-store'

import ShipInfoTableArea from './ship-info-table-area'
import ShipInfoCheckboxArea from './ship-info-checkbox-area'

const {$} = window

$('#font-awesome').setAttribute ('href', require.resolve('font-awesome/css/font-awesome.css'))

class ShipInfoArea extends Component {


  render(){
    return(
      <div>
        <ShipInfoCheckboxArea />
        <ShipInfoTableArea />
      </div>      
    )
  }
}

ReactDOM.render (
  <Provider store={store}>
    <ShipInfoArea />
  </Provider>,
  $('ship-info')
)
