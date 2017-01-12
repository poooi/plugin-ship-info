import React, { Component } from 'react'
import FontAwesome from 'react-fontawesome'

const Divider = (props) => {
  const { text, icon, show } = props
  return (
    <div className="divider">
      <hr />
      <h5>
        <span>{`${text}  `}</span>
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

export default Divider

