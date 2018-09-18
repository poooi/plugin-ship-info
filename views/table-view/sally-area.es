import React from 'react'
import { OverlayTrigger, Tooltip, Label } from 'react-bootstrap'
import FontAwesome from 'react-fontawesome'
import { connect } from 'react-redux'
import { translate } from 'react-i18next'
import { compose } from 'redux'

import { sallyAreaSelectorFactory } from '../selectors'

const SallyArea = compose(
  translate(['poi-plugin-ship-info']),
  connect((state, props) => {
    const { area } = props
    const { mapname, color } = sallyAreaSelectorFactory(area)(state)
    return {
      area,
      mapname,
      color,
      info_id: props.info_id || 0,
    }
  }),
)(
  ({ area, mapname, color, info_id, t }) =>
    area > 0 && (
      <OverlayTrigger
        placement="top"
        overlay={
          <Tooltip id={`sally-area-${info_id}`} className="info-tooltip">
            {t('ship_tag', { map: mapname })}
          </Tooltip>
        }
      >
        <Label style={{ color }} className="sally-area-label">
          <FontAwesome name="tag" />
        </Label>
      </OverlayTrigger>
    ),
)

export default SallyArea
