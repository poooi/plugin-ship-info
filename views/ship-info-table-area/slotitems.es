import React, { Component } from 'react'
import { OverlayTrigger, Tooltip } from 'react-bootstrap'
import Path from 'path'
import { SlotitemIcon } from 'views/components/etc/icon'
import { isEqual } from 'lodash'
import { connect } from 'react-redux'

import { equipDataSelectorFactory } from 'views/utils/selectors'

const { ROOT } = window

const getBackgroundStyle = () => {
  return window.isDarkTheme
  ? { backgroundColor: 'rgba(33, 33, 33, 0.7)' }
  : { backgroundColor: 'rgba(256, 256, 256, 0.7)' }
}

const Slotitem = ({ _item, item, isEx = false }) =>
  <div className="slotitem-container">
    <OverlayTrigger
      placement="top"
      overlay={
        <Tooltip id={`item-${_item.api_id}`} className="info-tooltip">
          {window.i18n.resources.__(item.api_name)}
          {
            item.api_level > 0 ?
              <strong style={{ color: '#45A9A5' }}>★+{_item.api_level}</strong>
            : ''
          }
          {
            _item.api_alv && _item.api_alv <= 7 && _item.api_alv >= 1 ?
              <img
                className="alv-img"
                src={Path.join(ROOT, 'assets', 'img', 'airplane', `alv${_item.api_alv}.png`)}
              />
            : ''
           }
        </Tooltip>
        }
    >
      <span>
        <SlotitemIcon slotitemId={item.api_type[3]} />
        {
          isEx &&
          <span className="slotitem-onslot" style={getBackgroundStyle()} >
            +
          </span>
        }
      </span>
    </OverlayTrigger>
  </div>

const Slotitems = connect(
  (state, props) => {
    const items = []
    const _items = []
    const exitems = []
    const _exitems = []
    const { slot = [], exslot = 0 } = props
    slot.forEach((itemId) => {
      const data = equipDataSelectorFactory(itemId)(state)
      if (typeof data != 'undefined') {
        _items.push(data[0])
        items.push(data[1])
      }
    })
    ;[exslot].forEach((itemId) => {
      const data = equipDataSelectorFactory(itemId)(state)
      if (typeof data != 'undefined') {
        _exitems.push(data[0])
        exitems.push(data[1])
      }
    })

    return ({
      _items,
      items,
      _exitems,
      exitems,
    })
  }
)(class Slotitems extends Component {

  shouldComponentUpdate = (nextProps, nextState) => {
    return !isEqual(this.props._items, nextProps._items)
  }

  render() {
    const { _items, items, _exitems, exitems } = this.props
    return (
      <div className="slotitem-container">
        {
        _items &&
        _items.map((_item, i) => {
          const item = items[i]
          return (
            <Slotitem
              _item={item}
              item={item}
              key={_item.api_id || 0}
            />
          )
        })
        }
        {
        _exitems &&
        _exitems.map((_item, i) => {
          const item = exitems[i]
          return (
            <Slotitem
              _item={item}
              item={item}
              key={_item.api_id || 0}
              isEx
            />
          )
        })
      }
      </div>
    )
  }
})

export default Slotitems
