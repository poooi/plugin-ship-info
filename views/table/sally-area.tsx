import { Position, Tag } from '@blueprintjs/core'
import React from 'react'
import FontAwesome from 'react-fontawesome'
import { useTranslation } from 'react-i18next'
import { connect, DispatchProp } from 'react-redux'
import { Tooltip } from 'views/components/etc/overlay'

import { sallyAreaSelectorFactory } from '../selectors'

interface ISallyAreaProps extends DispatchProp {
  area: number
  mapname: string
  color: string
  info_id: number
}

export const SallyArea = connect(
  // @ts-ignore
  (state, props: Omit<ISallyAreaProps, 'color' | 'mapname' | 'dispatch'>) => {
    const { area } = props
    const { mapname, color } = sallyAreaSelectorFactory(area)(state)
    return {
      area,
      color,
      info_id: props.info_id || 0,
      mapname,
    }
  },
)(({ area, mapname, color, info_id }: ISallyAreaProps) => {
  const { t } = useTranslation(['poi-plugin-ship-info'])

  if (area <= 0) {
    return null
  }

  return (
    <Tooltip position={Position.TOP} content={t('ship_tag', { map: mapname })}>
      <Tag style={{ color }}>
        <FontAwesome name="tag" />
      </Tag>
    </Tooltip>
  )
})
