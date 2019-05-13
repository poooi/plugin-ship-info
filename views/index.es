import React from 'react'
import { join } from 'path-extra'
import { WindowEnv } from 'views/components/etc/window-env'
import { StyleSheetManager } from 'styled-components'

import TableView from './table-view'
import SettingsView from './settings-view'

export { reducer } from './redux'
export const reactClass = () => (
  <WindowEnv.Consumer>
    {({ window }) => (
      <StyleSheetManager target={window.document.head}>
        <div className="ship-info-wrap">
          <link
            rel="stylesheet"
            href={join(__dirname, '..', 'assets', 'main.css')}
          />
          <SettingsView />
          <TableView />
        </div>
      </StyleSheetManager>
    )}
  </WindowEnv.Consumer>
)
