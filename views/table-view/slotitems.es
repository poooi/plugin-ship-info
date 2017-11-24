import React from 'react'
import propTypes from 'prop-types'
import { OverlayTrigger, Tooltip } from 'react-bootstrap'
import Path from 'path'
import { SlotitemIcon } from 'views/components/etc/icon'
import { map, filter } from 'lodash'
import { connect } from 'react-redux'

import { equipDataSelectorFactory } from 'views/utils/selectors'

const { ROOT } = window

const getBackgroundStyle = () =>
  window.isDarkTheme
    ? { backgroundColor: 'rgba(33, 33, 33, 0.7)' }
    : { backgroundColor: 'rgba(256, 256, 256, 0.7)' }

const Slotitem = ({ item, isEx = false }) => (
  <div className="slotitem-container">
    <OverlayTrigger
      placement="top"
      overlay={
        <Tooltip id={`item-${item.api_id}`} className="info-tooltip">
          {window.i18n.resources.__(item.api_name)}
          {
            item.api_level > 0 ?
              <strong style={{ color: '#45A9A5' }}>★+{item.api_level}</strong>
            : ''
          }
          {
            item.api_alv && item.api_alv <= 7 && item.api_alv >= 1 ?
              <img
                alt="alv"
                className="alv-img"
                src={Path.join(ROOT, 'assets', 'img', 'airplane', `alv${item.api_alv}.png`)}
              />
            : ''
           }
        </Tooltip>
        }
    >
      <span>
        <span className="slotitem-background">&#x2B22;</span>
        <SlotitemIcon
          alt={window.i18n.resources.__(item.api_name)}
          slotitemId={item.api_type[3]}
          style={{ zIndex: 1 }}
        />
        {
          isEx &&
          <span className="slotitem-onslot" style={getBackgroundStyle()} >
            +
          </span>
        }
      </span>
    </OverlayTrigger>
  </div>
)

const itemShape = {
  api_name: propTypes.string.isRequired,
  api_level: propTypes.number.isRequired,
  api_alv: propTypes.number,
  api_type: propTypes.arrayOf(propTypes.number).isRequired,
}

Slotitem.propTypes = {
  item: propTypes.shape(itemShape),
  isEx: propTypes.bool,
}

const Slotitems = connect(
  (state, { slot, exslot }) => {
    const items = map(filter(slot, itemId => itemId > 0), (itemId) => {
      const [item, $item] = equipDataSelectorFactory(itemId)(state)
      return { ...$item, ...item }
    })
    let exitem
    if (exslot > 0) {
      const [item, $item] = equipDataSelectorFactory(exslot)(state)
      exitem = { ...$item, ...item }
    }
    return {
      items,
      exitem,
    }
  }
)(({ items, exitem }) => (
  <div className="slotitem-container">
    {
      items &&
      items.map(item =>
        (
          <Slotitem
            item={item}
            key={item.api_id || 0}
          />
        )
      )
    }
    {
      exitem &&
        <Slotitem
          item={exitem}
          isEx
        />
    }
  </div>
)
)

Slotitems.WrappedComponent.propTypes = {
  items: propTypes.arrayOf(propTypes.object),
  exitem: propTypes.shape(itemShape),
}

export default Slotitems
