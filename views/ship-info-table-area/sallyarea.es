import React, { Component } from 'react'
import { OverlayTrigger, Tooltip, Label } from 'react-bootstrap'
import FontAwesome from 'react-fontawesome'
import { get } from 'lodash'
import { connect } from 'react-redux'

const { __ } = window

const SallyArea = connect(
  (state, props) =>{
    const area = props.area || -1
    const mapname = get(state, `fcd.shiptag.mapname.${area}`, '')
    const color = get(state, `fcd.shiptag.color.${area}`, '')

    return({
      area,
      mapname,
      color,
    })
  }
)(class SallyArea extends Component{
  shouldComponentUpdate = (nextProps, nextState) => {
    return nextProps.area != this.props.area ||
      nextProps.mapname != this.props.mapname ||
      nextProps.color != this.props.color
  }

  render(){
    const {area, mapname, color, info_id} = this.props
    return(
        area >= 0 ? 
          <OverlayTrigger 
            placement="top" 
            overlay={
              <Tooltip id={`sally-area-${info_id}`} className='info-tooltip'>
                {__('Ship tag: %s'), mapname}
              </Tooltip>
            }
          >
            <Label style={{color: color}}>
              <FontAwesome name='tag' />
            </Label>
          </OverlayTrigger>
        : 
          <Label className="status-label text-default" style={{opacity: 0}}></Label>

    )
  }


})

export default SallyArea
