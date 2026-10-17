import {
  Button,
  Classes,
  InputGroup,
  Intent,
  Tab,
  Tabs,
} from '@blueprintjs/core'
import cls from 'classnames'
import Fuse from 'fuse.js'
import _, { map, padEnd } from 'lodash'
import React, { useMemo, useState } from 'react'
import FA from 'react-fontawesome'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import styled from 'styled-components'
import { Popover } from 'views/components/etc/overlay'

import { IShipSuperType, shipSuperTypeMap } from '@poi-plugins/ship-info-shared/ship-types'
import { assignedShipIdsSelector, livePickerRowsSelector } from '../workspace/selectors'

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
  ${`.${Classes.TAB_PANEL}`} {
    margin-top: 0;
  }
`

const ShipList = styled.ul`
  padding: 0;
  margin: 0;
  height: 30em;
  overflow-y: scroll;
  width: 20em;
`

const ShipItem = styled.li`
  display: flex;
  padding: 0.5em 1em;
  border-radius: 4px;
  cursor: pointer;

  &:hover {
    background-color: var(
      --bp-surface-background-color-default-hover,
      rgba(143, 153, 168, 0.15)
    );
  }

  &:active {
    background-color: var(
      --bp-surface-background-color-default-active,
      rgba(143, 153, 168, 0.3)
    );
  }
`

const ShipLv = styled.span`
  width: 3em;
`

const ShipName = styled.span`
  flex: 1;
`

export interface AddShipProps {
  onSelect: (id: number) => void
}

// The picker lists eligible live-roster ships only. It is empty (and the button
// hidden by the caller) when the live roster is unavailable, so another
// account's roster can never be assigned.
const Menu = ({ onSelect }: AddShipProps) => {
  const { t } = useTranslation('poi-plugin-navy-staff')
  const ships = useSelector(livePickerRowsSelector)
  const assigned = useSelector(assignedShipIdsSelector)
  const [query, setQuery] = useState('')

  const fuse = useMemo(
    () =>
      new Fuse(ships, {
        keys: ['name', 'yomi', 'romaji'],
        shouldSort: true,
      }),
    [ships],
  )

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.currentTarget.value)
  }

  const filtered = _.map(fuse.search(query), (result) => result.item.id)

  return (
    <Wrapper>
      <InputGroup
        value={query}
        placeholder={t('Search')}
        onChange={handleQueryChange}
        rightElement={
          <Button
            aria-label={t('Clear')}
            minimal
            onClick={() => setQuery('')}
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
                  .filter((ship) => type === -1 || type === ship.superTypeIndex)
                  .filter((ship) => !query || (filtered || []).includes(ship.id))
                  .filter((ship) => !assigned.has(ship.id))
                  .sortBy([
                    (ship) => (filtered || []).indexOf(ship.id),
                    (ship) => -ship.lv,
                    (ship) => -ship.exp,
                  ])
                  .map((ship) => (
                    <ShipItem
                      key={ship.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => onSelect(ship.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          // Replay the click so Blueprint's POPOVER_DISMISS
                          // handling closes the menu too.
                          event.currentTarget.click()
                        }
                      }}
                      className={cls(Classes.POPOVER_DISMISS)}
                    >
                      <ShipLv>Lv.{padEnd(String(ship.lv), 4)}</ShipLv>
                      <ShipName>
                        {t(ship.name || '', { ns: 'resources' })}
                      </ShipName>
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

// separate menu from popover component to prevent unnecessary updates
export const AddShip = ({ onSelect }: AddShipProps) => {
  const { t } = useTranslation('poi-plugin-navy-staff')
  return (
    <Popover content={<Menu onSelect={onSelect} />} hasBackdrop>
      <Button aria-label={t('Add ship')} minimal>
        <FA name="plus" />
      </Button>
    </Popover>
  )
}
