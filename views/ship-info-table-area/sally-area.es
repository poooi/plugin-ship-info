import React, { Component } from 'react'
import { OverlayTrigger, Tooltip, Label } from 'react-bootstrap'
import FontAwesome from 'react-fontawesome'
import { get } from 'lodash'
import { connect } from 'react-redux'

import { sallyAreaSelectorFactory } from './selectors'

const { __ } = window

const SallyArea = connect(
  (state, props) => {
    const area = props.area
    const { mapname, color } = sallyAreaSelectorFactory(area)(state)
    return ({
      mapname,
      color,
    })
  }
)(class SallyArea extends Component {
  shouldComponentUpdate = (nextProps, nextState) => nextProps.area != this.props.area ||
      nextProps.mapname != this.props.mapname ||
      nextProps.color != this.props.color

  render() {
    const { area, mapname, color, info_id } = this.props
    return (
        area > 0 &&
          <OverlayTrigger
            placement="top"
            overlay={
              <Tooltip id={`sally-area-${info_id}`} className="info-tooltip">
                {__('Ship tag: %s', mapname)}
              </Tooltip>
            }
          >
            <Label style={{ color: color }} className="sally-area-label" >
              <FontAwesome name="tag" />
            </Label>
          </OverlayTrigger>

    )
  }


})

export default SallyArea
