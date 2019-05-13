import React, { StatelessComponent, ReactElement } from 'react'
import { join } from 'path'
import { WindowEnv } from 'views/components/etc/window-env'
import { StyleSheetManager } from 'styled-components'

import TableView from './table-view'
import SettingsView from './settings-view'

export { reducer } from './redux'
export const reactClass: StatelessComponent<null> = (): ReactElement => (
  <WindowEnv.Consumer>
    {({ window }): ReactElement => (
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
