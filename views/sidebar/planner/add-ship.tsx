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
import { IShipInfoMenuData, shipMenuDataSelector } from '../../selectors'

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
  overflow: scroll;
  width: 20em;

  ::-webkit-scrollbar {
    width: 1em;
  }

  ::-webkit-scrollbar-thumb {
    background: ${props => props.theme.BLUE1};
    width: 1em;
  }

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
  onSelect: (id: number) => void
}

const Menu = compose<ComponentType<{}>>(
  withTranslation('poi-plugin-ship-info'),
  connect(state => ({
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
        this.fuse.list = values(this.props.ships)
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
      const { ships, t } = this.props

      const filtered = _(this.fuse.search(query))
        .map(Number)
        .value() as number[]
      return (
        <Wrapper>
          <InputGroup
            value={query}
            placeholder={t('Search')}
            onChange={this.handleQueryChange}
            rightElement={
              <Button
                minimal={true}
                onClick={this.handleClear}
                intent={Intent.WARNING}
              >
                <FA name="times" />
              </Button>
            }
          />

          <Tabs
            vertical={true}
            id="ship-selection"
            renderActiveTabPanelOnly={true}
          >
            {map(searchOptions, ({ name, value: type }) => (
              <Tab
                key={type}
                id={type}
                title={t(name)}
                panel={
                  <ShipList>
                    {_(ships)
                      .filter(ship => type === -1 || type === ship.typeId)
                      .filter(
                        ship => !query || (filtered || []).includes(ship.id),
                      )
                      .sortBy([
                        ship => (filtered || []).indexOf(ship.id),
                        ship => -ship.lv,
                        ship => -ship.exp,
                      ])
                      .map(ship => (
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
                          {ship.area && ship.area > 0 && (
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
  <Popover minimal={true}>
    <Button>
      <FA name="plus" />
    </Button>
    <Menu {...props} />
  </Popover>
)