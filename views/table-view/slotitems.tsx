import { filter, get, map } from 'lodash'
import Path from 'path'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { connect } from 'react-redux'
import { SlotitemIcon } from 'views/components/etc/icon'
import { Tooltip } from 'views/components/etc/overlay'

import { APISlotItem } from 'kcsapi/api_get_member/require_info/response'
import { APIMstSlotitem } from 'kcsapi/api_start2/getData/response'
import { equipDataSelectorFactory } from 'views/utils/selectors'

const { ROOT } = window

type Item = APIMstSlotitem & APISlotItem

const Slotitem = ({ item, isEx = false }: { item: Item; isEx?: boolean }) => {
  const { t } = useTranslation(['resources'])

  return (
    <div>
      <Tooltip
        content={
          <>
            {t(item.api_name || '', { keySeparator: 'chiba' })}
            {item.api_level > 0 ? (
              <strong style={{ color: '#45A9A5' }}>★+{item.api_level}</strong>
            ) : (
              ''
            )}
            {item.api_alv && item.api_alv <= 7 && item.api_alv >= 1 && (
              <img
                alt="alv"
                className="alv-img"
                src={Path.join(
                  ROOT,
                  'assets',
                  'img',
                  'airplane',
                  `alv${item.api_alv}.png`,
                )}
              />
            )}
          </>
        }
      >
        <span>
          <span className="slotitem-background">&#x2B22;</span>
          <SlotitemIcon
            alt={t(item.api_name || '', { keySeparator: 'chiba' })}
            slotitemId={get(item, 'api_type.3', -1)}
            style={{ zIndex: 1 }}
          />
          {isEx && <span>+</span>}
        </span>
      </Tooltip>
    </div>
  )
}

const Slotitems = connect(
  (state, { slot, exslot }: { slot: number[]; exslot: number }) => {
    const items = map(filter(slot, itemId => itemId > 0), itemId => {
      const [item = {}, $item = {}] =
        equipDataSelectorFactory(itemId)(state) || []
      return { ...$item, ...item }
    })
    let exitem
    if (exslot > 0) {
      const [item = {}, $item = {}] =
        equipDataSelectorFactory(exslot)(state) || []
      exitem = { ...$item, ...item }
    }
    return {
      exitem,
      items,
    }
  },
)(({ items, exitem }: { items: Item[]; exitem: Item }) => (
  <div className="slotitem-container">
    {items &&
      items.map(item => <Slotitem item={item} key={item.api_id || 0} />)}
    {exitem && <Slotitem item={exitem} isEx={true} />}
  </div>
))

export default Slotitems
