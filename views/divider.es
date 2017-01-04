import React, {Component} from 'react'
import FontAwesome from 'react-fontawesome'

export default class Divider extends Component {
  render(){
    const {text, icon, show} = this.props
    return(
      <div className="divider">
        <hr />
        <h5>
          <span>{text + '  '}</span>
          <span>
            {
              icon &&
              <FontAwesome name={show ? 'chevron-circle-down' : 'chevron-circle-right'} />
            }
          </span>
        </h5>
      </div>      
    )
  }
}