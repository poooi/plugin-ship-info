import { join } from 'path'
import React, { ReactElement, StatelessComponent } from 'react'
import styled, { StyleSheetManager } from 'styled-components'
import { WindowEnv } from 'views/components/etc/window-env'

import SettingsView from './settings-view'
import { TableView } from './table'
export { reducer } from './redux'

const ShipInfo = styled.div`
  display: flex;
  height: 100%;
`

export const reactClass: StatelessComponent<null> = (): ReactElement => (
  <WindowEnv.Consumer>
    {({ window }): ReactElement => (
      <StyleSheetManager target={window.document.head}>
        <ShipInfo id="poi-plugin-ship-info">
          {/* <link
            rel="stylesheet"
            href={join(__dirname, '..', 'assets', 'main.css')}
          /> */}
          {/* <SettingsView /> */}
          <TableView />
        </ShipInfo>
      </StyleSheetManager>
    )}
  </WindowEnv.Consumer>
)
