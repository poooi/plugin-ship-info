import { Card, Tag } from '@blueprintjs/core'
import { get, groupBy, keyBy } from 'lodash'
import fp from 'lodash/fp'
import React, { Component } from 'react'
import FA from 'react-fontawesome'
import { connect, DispatchProp } from 'react-redux'

import { onAddShip } from '../../redux'
import {
  deckPlannerAreaSelectorFactory,
  IShipInfoMenuData,
  shipMenuDataSelector,
} from '../../selectors'
import { AddShip } from './add-ship'
import { ShipChip } from './ship-chip'

interface IProps extends DispatchProp {
  ships: Array<IShipInfoMenuData | undefined>
  shipIds: number[]
  index: number
  area: IArea
  others: IArea[]
}

export const Area = connect((state, props: IProps) => ({
  shipIds: deckPlannerAreaSelectorFactory(props.index)(state),
  ships: shipMenuDataSelector(state),
}))(
  class AreaBase extends Component<IProps> {
    public handleAddShip = (shipId: number) => {
      this.props.dispatch(
        onAddShip({
          areaIndex: this.props.index,
          shipId,
        }),
      )
    }

    public render() {
      const { area, index, others, ships, shipIds } = this.props
      const keyShips = keyBy(ships, 'id')
      const groupShipIds = groupBy(
        shipIds,
        id => ((keyShips[id] || {}) as IShipInfoMenuData).superTypeIndex,
      )
      return (
        <Card interactive={true}>
          <div>
            <h5>
              <Tag style={{ color: area.color }}>
                <FA name="tag" />
              </Tag>
              {area.name}
            </h5>
            <div>
              <AddShip area={index} onSelect={this.handleAddShip} />
            </div>
          </div>
          <div>
            <div>
              <div>
                {Object.keys(groupShipIds).map(idx => (
                  <div className="lane" key={idx}>
                    {fp.flow(
                      fp.sortBy([
                        (id: number) => -get(keyShips[id], 'lv', 0),
                        id => -id,
                      ]),
                      fp.map((id: number) => (
                        <ShipChip
                          shipId={id}
                          others={others}
                          key={id}
                          planArea={index}
                        />
                      )),
                    )(groupShipIds[idx])}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )
    }
  },
)
