import React from 'react'
import propTypes from 'prop-types'
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

Divider.propTypes = {
  text: propTypes.string.isRequired,
  icon: propTypes.bool,
  show: propTypes.bool,
}

export default Divider

