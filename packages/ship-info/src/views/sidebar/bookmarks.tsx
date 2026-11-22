import { Button, InputGroup } from '@blueprintjs/core'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import styled from 'styled-components'
import { Popover } from 'views/components/etc/overlay'
import { extensionSelectorFactory } from 'views/utils/selectors'
import { onDelete, onUpdate, PLUGIN_KEY } from '../redux'
import {
  levelRangeFilterSelector,
  shipInfoConfigSelector,
  shipTypesFilterSelector,
} from '../selectors'
import { applySettings, readSettings } from './filter/settings'

const selectPlugin = extensionSelectorFactory(PLUGIN_KEY)

const Panel = styled.div`
  padding: 12px;
  width: min(320px, 80vw);
  max-height: 65vh;
  overflow: auto;
  form,
  li {
    display: flex;
    gap: 6px;
    margin: 4px 0;
  }
  ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  li > button:first-child {
    flex: 1;
    justify-content: start;
    overflow-wrap: anywhere;
  }
`

export function Bookmarks() {
  const { t } = useTranslation('poi-plugin-ship-info')
  const dispatch = useDispatch()
  const plugin = useSelector(selectPlugin)
  const config = useSelector(shipInfoConfigSelector)
  const levelRange = useSelector(levelRangeFilterSelector)
  const shipTypes = useSelector(shipTypesFilterSelector)
  const [name, setName] = useState('')
  const bookmarks = plugin?.bookmark ?? {}
  const trimmed = name.trim()
  const exists = Object.keys(bookmarks).includes(trimmed)
  const saved = Object.entries(bookmarks).filter(
    ([, value]) =>
      value && typeof value === 'object' && !Array.isArray(value),
  )

  return (
    <Popover
      hasBackdrop
      content={
        <Panel>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              if (!trimmed || !plugin?.ready) return
              dispatch(
                onUpdate({
                  bookmark: trimmed,
                  settings: readSettings({
                    ...config,
                    filters: {
                      maxLevel: levelRange[1],
                      minLevel: levelRange[0],
                    },
                    shipTypes,
                  }),
                }),
              )
              setName('')
            }}
          >
            <InputGroup
              aria-label={t('Bookmark name')}
              placeholder={t('Bookmark name')}
              value={name}
              onChange={(event) => setName(event.currentTarget.value)}
            />
            <Button type="submit" disabled={!trimmed || !plugin?.ready}>
              {t(exists ? 'Overwrite' : 'Save')}
            </Button>
          </form>
          <ul>
            {saved.map(([key, settings]) => (
              <li key={key}>
                <Button minimal onClick={() => applySettings(settings)}>
                  {key}
                </Button>
                <Button
                  minimal
                  icon="trash"
                  disabled={!plugin?.ready}
                  aria-label={t('Delete bookmark') + ' ' + key}
                  title={t('Delete bookmark')}
                  onClick={() => dispatch(onDelete({ bookmark: key }))}
                />
              </li>
            ))}
          </ul>
        </Panel>
      }
    >
      <Button
        minimal
        icon="bookmark"
        aria-label={t('Bookmarks')}
        title={t('Bookmarks')}
      />
    </Popover>
  )
}
