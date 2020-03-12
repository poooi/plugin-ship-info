import { Card, Tag } from '@blueprintjs/core'
import { get, groupBy, keyBy, keys } from 'lodash'
import fp from 'lodash/fp'
import React, { Component, ComponentType } from 'react'
import FA from 'react-fontawesome'
import { connect, DispatchProp } from 'react-redux'
import styled from 'styled-components'

import { onAddShip } from '../../redux'
import {
  deckPlannerAreaSelectorFactory,
  IShipInfoMenuData,
  shipMenuDataSelector,
} from '../../selectors'
import { AddShip } from './add-ship'
import { ShipChip } from './ship-chip'

const Container = styled(Card)`
  padding: 4px;
`

const Header = styled.div`
  display: flex;
  align-items: center;
`

const Lane = styled.div`
  display: flex;
  flex-wrap: wrap;
`

interface IProps extends DispatchProp {
  ships: IShipInfoMenuData[]
  shipIds: number[]
  index: number
  area: IArea
  others: IArea[]
}

export const Area = connect<
  any,
  any,
  any,
  Pick<IProps, 'index' | 'area' | 'others'>
>((state, props: IProps) => ({
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
        <Container interactive>
          <Header>
            <h5>
              <Tag style={{ color: area.color }} minimal>
                <FA name="tag" />
              </Tag>{' '}
              {area.name}
            </h5>
            <div>
              <AddShip area={index} onSelect={this.handleAddShip} />
            </div>
          </Header>

          <div>
            {keys(groupShipIds).map(idx => (
              <Lane key={idx}>
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
              </Lane>
            ))}
          </div>
        </Container>
      )
    }
  },
)
