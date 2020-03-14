import React from 'react'
import { Table } from './index'

import ships from '../mocks/ships.json'

export default { title: 'Table' }

export const TableWithData = () => <Table ships={ships} />
