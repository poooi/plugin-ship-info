import React from 'react'
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

const Slotitem = ({ item, isEx = false }) =>
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
                className="alv-img"
                src={Path.join(ROOT, 'assets', 'img', 'airplane', `alv${item.api_alv}.png`)}
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

export default Slotitems
