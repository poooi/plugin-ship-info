import React, { Component } from 'react'
import { Row, Col, Input, Label } from 'react-bootstrap'
import { connect } from 'react-redux'
import { get, isEqual } from 'lodash'

const __ = window.__

// to ensure a downgrade compatibility, another config key is used
const SallyAreaCheck = connect(
  (state, props) => {
    const mapname = get(state, 'fcd.shiptag.mapname', [])
    const defaultChecked = mapname.slice().fill(true)
    let checked = get(state.config, 'plugin.ShipInfo.sallyAreaChecked', defaultChecked)

    checked = mapname.length == checked.length ? checked : defaultChecked
    const checkedAll = checked.reduce((a, b) => a && b, true)

    return ({
      mapname,
      color: get(state, 'fcd.shiptag.color', []),
      checked,
      checkedAll,
    })
  }
)(class SallyAreaCheck extends Component {

  shouldComponentUpdate = (nextProps, nextState) => {
    return nextProps.mapname.length != this.props.mapname.length ||
      !isEqual(nextProps.checked, this.props.checked)
  }

  handleClickBox = index => () => {
    const checked = this.props.checked.slice()
    let { checkedAll } = this.props

    if (index == -1) {
      checkedAll = !checkedAll
      checked.fill(checkedAll)
    } else {
      checked[index] = !checked[index]
      checkedAll = checked.reduce((a, b) => a && b, true)
    }

    config.set('plugin.ShipInfo.sallyAreaChecked', checked)
  }

  render() {
    const { mapname, color, checked, checkedAll } = this.props
    return (
      <Row>
        <Col xs={8} className="radio-check">
          <div className="filter-span"><span>{__('Sally Area')}</span></div>

          <div>
            <Input
              type="checkbox"
              label={__('All')}
              onChange={this.handleClickBox(-1)}
              checked={checkedAll}
            />
          </div>
          {
            mapname.map((name, idx) =>
              <div key={name}>
              
                <Input
                  type="checkbox"
                  label={<Label style={{ color: color[idx] }}>{__(name)}</Label>}
                  onChange={this.handleClickBox(idx)}
                  checked={checked[idx]}
                  style={{ color: color[idx] || '' }}
                />
              </div>
            )
          }
        </Col>
      </Row>
    )
  }
})

export default SallyAreaCheck
