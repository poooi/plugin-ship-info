import { Menu, MenuItem, Position, Tag } from '@blueprintjs/core'
import { get } from 'lodash'
import path from 'path'
import React, { ComponentType, PureComponent } from 'react'
import FA from 'react-fontawesome'
import { withTranslation, WithTranslation } from 'react-i18next'
import { connect, DispatchProp } from 'react-redux'
import { compose } from 'redux'
import styled from 'styled-components'
import { Popover } from 'views/components/etc/overlay'

import { onDisplaceShip, onRemoveShip } from '../../redux'
import {
  shipFleetIdSelectorFactory,
  shipItemSelectorFactory,
} from '../../selectors'
import { fileUrl, shipTypes } from '../../utils'

const Chip = styled(Tag)`
  margin: 0.5ex 1ex;
`

interface IProps extends DispatchProp, WithTranslation {
  shipId: number
  typeId: number
  name: string
  lv: number
  area: number
  color: string[]
  others: IArea[]
  planArea: number
  fleetId: number
  id: number
}

export const ShipChip = compose<
  ComponentType<
    Omit<
      IProps,
      | keyof DispatchProp
      | keyof WithTranslation
      | 'name'
      | 'area'
      | 'color'
      | 'lv'
      | 'typeId'
      | 'fleetId'
      | 'id'
    >
  >
>(
  withTranslation(['resources', 'poi-plugin-ship-info']),
  connect((state, props: IProps) => ({
    ...shipItemSelectorFactory(props.shipId)(state),
    color: get(state, 'fcd.shiptag.color', []),
    fleetId: shipFleetIdSelectorFactory(props.shipId)(state),
  })),
)(
  class ShipChipBase extends PureComponent<IProps> {
    public handleDisplace = (areaIndex: number) => () => {
      const { planArea, id } = this.props
      this.props.dispatch(
        onDisplaceShip({
          fromAreaIndex: planArea,
          shipId: id,
          toAreaIndex: areaIndex,
        }),
      )
    }

    public handleRemove = () => {
      const { id, planArea } = this.props
      this.props.dispatch(
        onRemoveShip({
          areaIndex: planArea,
          shipId: id,
        }),
      )
    }

    public componentDidUpdate = () => {
      const { area, planArea, id } = this.props
      if (area > 0 && area - 1 !== planArea) {
        this.props.dispatch(
          onDisplaceShip({
            fromAreaIndex: planArea,
            shipId: id,
            toAreaIndex: area - 1,
          }),
        )
      }
    }

    public render() {
      const { typeId, name, lv, area, color, others, fleetId, t } = this.props

      return (
        <Chip
          minimal={true}
          interactive={true}
          onRemove={this.handleRemove}
          onContextMenu={!(area > 0) ? this.handleRemove : undefined}
        >
          <Popover
            position={Position.TOP}
            hasBackdrop={true}
            content={
              <Menu>
                {others.map(_area => (
                  <MenuItem
                    key={_area.color}
                    onClick={this.handleDisplace(_area.areaIndex)}
                    text={
                      <>
                        {t('Move to ')}{' '}
                        <Tag
                          minimal={true}
                          style={{
                            color: _area.color,
                          }}
                        >
                          <FA name="tag" />
                          {_area.name}
                        </Tag>
                      </>
                    }
                  />
                ))}
              </Menu>
            }
          >
            <span>
              {shipTypes[typeId as keyof typeof shipTypes]}
              {' | '}
              {t(name)} <span>Lv.{lv}</span>
            </span>
          </Popover>
          <span>
            {area > 0 && (
              <FA
                name="tag"
                style={{ marginLeft: '1ex', color: color[area - 1] }}
              />
            )}
          </span>

          <span>
            {fleetId > -1 && (
              <img
                style={{ height: '10px' }}
                alt={`fleet: ${fleetId + 1}`}
                src={fileUrl(
                  path.resolve(
                    __dirname,
                    `../../../assets/svg/fleet-indicator-${fleetId + 1}.svg`,
                  ),
                )}
              />
            )}
          </span>
        </Chip>
      )
    }
  },
)
