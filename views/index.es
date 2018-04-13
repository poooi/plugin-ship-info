import React from 'react'
import { join } from 'path-extra'

import TableView from './table-view'
import SettingsView from './settings-view'

export { reducer } from './redux'
export const reactClass = () =>
  (
    <div className="ship-info-wrap">
      <link rel="stylesheet" href={join(__dirname, '..', 'assets', 'main.css')} />
      <SettingsView />
      <TableView />
    </div>
  )
