import React, { PureComponent } from 'react'
import propTypes from 'prop-types'

export default class DisplaceToggle extends PureComponent {
  static propTypes = {
    onClick: propTypes.func,
    children: propTypes.element,
  }

  handleClick = (e) => {
    e.preventDefault()

    this.props.onClick(e)
  }

  render() {
    return (
      // eslint-disable-next-line jsx-a11y/interactive-supports-focus
      <span role="link" onClick={this.handleClick}>
        { this.props.children}
      </span>
    )
  }
}
