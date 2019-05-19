import { Menu, MenuItem, Tag } from '@blueprintjs/core'
import { get } from 'lodash'
import path from 'path'
import React, { ComponentType, PureComponent } from 'react'
import FA from 'react-fontawesome'
import { withTranslation, WithTranslation } from 'react-i18next'
import { connect, DispatchProp } from 'react-redux'
import { compose } from 'redux'
import { Popover } from 'views/components/etc/overlay'

import { onDisplaceShip, onRemoveShip } from '../../redux'
import {
  shipFleetIdSelectorFactory,
  shipItemSelectorFactory,
} from '../../selectors'
import { fileUrl, shipTypes } from '../../utils'

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
      const { planArea, shipId } = this.props
      this.props.dispatch(
        onDisplaceShip({
          fromAreaIndex: planArea,
          shipId,
          toAreaIndex: areaIndex,
        }),
      )
    }

    public handleRemove = () => {
      const { shipId, planArea } = this.props
      this.props.dispatch(
        onRemoveShip({
          areaIndex: planArea,
          shipId,
        }),
      )
    }

    public componentDidUpdate = () => {
      const { area, planArea, shipId } = this.props
      if (area > 0 && area - 1 !== planArea) {
        this.props.dispatch(
          onDisplaceShip({
            fromAreaIndex: planArea,
            shipId,
            toAreaIndex: area - 1,
          }),
        )
      }
    }

    public render() {
      const { typeId, name, lv, area, color, others, fleetId, t } = this.props

      return (
        <Popover
          content={
            <Menu>
              {others.map(_area => (
                <MenuItem
                  key={_area.color}
                  onClick={this.handleDisplace(_area.areaIndex)}
                >
                  {t('Move to ')}{' '}
                  <Tag style={{ color: _area.color }}>
                    <FA name="tag" />
                    {_area.name}
                  </Tag>
                </MenuItem>
              ))}
            </Menu>
          }
        >
          <Tag
            interactive={true}
            onRemove={this.handleRemove}
            onContextMenu={!(area > 0) ? this.handleRemove : undefined}
          >
            <span>
              {shipTypes[typeId as keyof typeof shipTypes]}
              {' | '}
              {t(name)}
              <span>Lv.{lv}</span>
            </span>
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
          </Tag>
        </Popover>
      )
    }
  },
)