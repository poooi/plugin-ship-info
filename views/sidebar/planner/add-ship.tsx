import {
  Button,
  Classes,
  InputGroup,
  Intent,
  Tab,
  Tabs,
  Tag,
} from '@blueprintjs/core'
import cls from 'classnames'
import Fuse from 'fuse.js'
import _, { get, map, padEnd, values } from 'lodash'
import React, { Component, ComponentType, FormEvent } from 'react'
import FA from 'react-fontawesome'
import { withTranslation, WithTranslation } from 'react-i18next'
import { connect } from 'react-redux'
import { compose } from 'redux'
import styled from 'styled-components'
import { Popover } from 'views/components/etc/overlay'

import { IShipSuperType, shipSuperTypeMap } from '../../constants'
import {
  deckPlannerAllShipIdsSelector,
  IShipInfoMenuData,
  shipMenuDataSelector,
} from '../../selectors'

const searchOptions = [
  {
    name: 'All',
    value: -1,
  },
  ...(_(shipSuperTypeMap)
    .map(({ name }: IShipSuperType, index) => ({ name, value: index }))
    .value() as Array<{ name: string; value: number }>),
]

const Wrapper = styled.div`
  .bp3-tab-panel {
    margin-top: 0;
  }
`

const ShipList = styled.ul`
  padding: 0;
  margin: 0;
  height: 30em;
  overflow-y: scroll;
  width: 20em;

  span {
    cursor: pointer;
  }
`

const ShipItem = styled.li`
  display: flex;
  padding: 0.5em 1em;
`

const ShipLv = styled.span`
  width: 3em;
`

const ShipName = styled.span`
  flex: 1;
`

interface IProps extends WithTranslation {
  ships: IShipInfoMenuData[]
  allSelectedId: number[]
  onSelect: (id: number) => void
}

const Menu = compose<ComponentType<{}>>(
  withTranslation('poi-plugin-ship-info'),
  connect((state) => ({
    allSelectedId: deckPlannerAllShipIdsSelector(state),
    ships: shipMenuDataSelector(state),
  })),
)(
  class MenuBase extends Component<IProps> {
    public fuse: Fuse<IShipInfoMenuData>

    public state = {
      query: '',
    }

    constructor(props: IProps) {
      super(props)

      const options = {
        id: 'id',
        keys: ['name', 'yomi', 'romaji'],
        shouldSort: true,
      }
      this.fuse = new Fuse(props.ships, options)
    }

    public componentDidUpdate = (prevProps: IProps) => {
      if (values(this.props.ships).length !== values(prevProps.ships).length) {
        this.fuse.setCollection(this.props.ships)
        this.forceUpdate()
      }
    }

    public handleQueryChange = (e: FormEvent<HTMLInputElement>) => {
      this.setState({
        query: e.currentTarget.value,
      })
    }

    public handleClear = () => {
      this.setState({
        query: '',
      })
    }

    public handleSelect = (id: number) => () => {
      this.props.onSelect(id)
    }

    public render() {
      const { query } = this.state
      const { ships, allSelectedId, t } = this.props

      const filtered = _.map(
        this.fuse.search(query),
        (result) => result.item.id,
      )
      return (
        <Wrapper>
          <InputGroup
            value={query}
            placeholder={t('Search')}
            onChange={this.handleQueryChange}
            rightElement={
              <Button
                minimal
                onClick={this.handleClear}
                intent={Intent.WARNING}
              >
                <FA name="times" />
              </Button>
            }
          />

          <Tabs vertical id="ship-selection" renderActiveTabPanelOnly>
            {map(searchOptions, ({ name, value: type }) => (
              <Tab
                key={type}
                id={type}
                title={t(name)}
                panel={
                  <ShipList className="ship-info-scrollable">
                    {_(ships)
                      .filter(
                        (ship) => type === -1 || type === ship.superTypeIndex,
                      )
                      .filter(
                        (ship) => !query || (filtered || []).includes(ship.id),
                      )
                      .filter((ship) => !ship.area)
                      .filter((ship) => !allSelectedId.includes(ship.id))
                      .sortBy([
                        (ship) => (filtered || []).indexOf(ship.id),
                        (ship) => -ship.lv,
                        (ship) => -ship.exp,
                      ])
                      .map((ship) => (
                        <ShipItem
                          key={ship.id}
                          onClick={this.handleSelect(ship.id)}
                          className={cls(
                            Classes.POPOVER_DISMISS,
                            Classes.MENU_ITEM,
                          )}
                        >
                          <ShipLv>Lv.{padEnd(String(ship.lv), 4)}</ShipLv>
                          <ShipName>
                            {t(ship.name || '', { ns: 'resources' })}
                          </ShipName>
                          {ship.area! > 0 && (
                            <Tag intent={Intent.PRIMARY}>{ship.area}</Tag>
                          )}
                        </ShipItem>
                      ))
                      .value()}
                  </ShipList>
                }
              />
            ))}
          </Tabs>
        </Wrapper>
      )
    }
  },
)

// separate menu from popover component to prevent unnecessary updates
export const AddShip = ({ ...props }) => (
  <Popover content={<Menu {...props} />} hasBackdrop>
    <Button minimal>
      <FA name="plus" />
    </Button>
  </Popover>
)
