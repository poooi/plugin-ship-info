import React, { ReactElement, FunctionComponent } from 'react'
import styled, { createGlobalStyle } from 'styled-components'

import { Sidebar } from './sidebar'
import { TableView } from './table'
import { Provider } from 'jotai'

export { reducer } from './redux'

const ShipInfo = styled.div`
  display: flex;
  height: 100%;
`

const GlobalStyle = createGlobalStyle`
  .ship-info-scrollable {
    ::-webkit-scrollbar {
      height: 16px;
      width: 16px;
    }

    ::-webkit-scrollbar-thumb {
      background: ${(props) => props.theme.BLUE1};
      height: 16px;
      width: 16px;
    }
  }
`

export const reactClass: FunctionComponent<null> = (): ReactElement => (
  <Provider>
    <ShipInfo id="poi-plugin-ship-info">
      <GlobalStyle />
      <Sidebar />
      <TableView />
    </ShipInfo>
  </Provider>
)
