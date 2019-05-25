import React, { ReactElement, StatelessComponent } from 'react'
import styled, {
  createGlobalStyle,
  StyleSheetManager,
  ThemeProps,
} from 'styled-components'
import { WindowEnv } from 'views/components/etc/window-env'

import { Sidebar } from './sidebar'
import { TableView } from './table'
export { reducer } from './redux'

const ShipInfo = styled.div`
  display: flex;
  height: 100%;
`

const GlobalStyle = createGlobalStyle`
  ::-webkit-scrollbar {
    height: 16px;
    width: 16px;
  }

  ::-webkit-scrollbar-thumb {
    background: ${(props: ThemeProps<{ BLUE1: string }>) => props.theme.BLUE1};
    height: 16px;
    width: 16px;
  }
`

export const reactClass: StatelessComponent<null> = (): ReactElement => (
  <WindowEnv.Consumer>
    {({ window }): ReactElement => (
      <StyleSheetManager target={window.document.head}>
        <ShipInfo id="poi-plugin-ship-info">
          <GlobalStyle />
          <Sidebar />
          <TableView />
        </ShipInfo>
      </StyleSheetManager>
    )}
  </WindowEnv.Consumer>
)
