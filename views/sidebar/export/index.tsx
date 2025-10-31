import { Button, ButtonGroup, HTMLSelect } from '@blueprintjs/core'
import { clipboard, remote } from 'electron'
import { outputFile } from 'fs-extra'
import { map, values } from 'lodash'
import React, { FormEvent, useCallback } from 'react'
import FA from 'react-fontawesome'
import { useTranslation } from 'react-i18next'
import { Popover } from 'views/components/etc/overlay'
import { useAtomValue } from 'jotai'

import { allShipRowsMapSelector } from '../../selectors'
import { filteredShipIdsAtom } from '../../table'
import { IShipRawData } from '../../table/cells'
import { Checkbox, CheckboxLabel } from '../components/checkbox'
import { Container } from '../components/layout'
import { buildCsv } from './build-csv'

const { dialog } = remote

const isWin = process.platform === 'win32'

interface ISelectOptions {
  name: string
  value: string
}

interface ISelectProps {
  label: string
  options: ISelectOptions[]
  value: string
  onChange: (value: string) => void
}

const Select = ({ label, options, value, onChange }: ISelectProps) => {
  const handleChange = useCallback(
    (e: FormEvent<HTMLSelectElement>) => {
      onChange(e.currentTarget.value)
    },
    [onChange],
  )

  const { t } = useTranslation('poi-plugin-ship-info')

  return (
    <Checkbox>
      <CheckboxLabel>{t(label)}</CheckboxLabel>
      <HTMLSelect value={value} onChange={handleChange}>
        {map(options, ({ name, value: V }) => (
          <option key={name} value={V}>
            {t(name)}
          </option>
        ))}
      </HTMLSelect>
    </Checkbox>
  )
}

const sepOptions: ISelectOptions[] = [
  {
    name: 'comma',
    value: ',',
  },
  {
    name: 'semicolon',
    value: ';',
  },
  {
    name: 'tab',
    value: '\t',
  },
]

const endOptions: ISelectOptions[] = [
  {
    name: 'Windows (CRLF)',
    value: '\r\n',
  },
  {
    name: 'Unix (LF)',
    value: '\n',
  },
]

const selectionOptions: ISelectOptions[] = [
  {
    name: 'Current list',
    value: 'current',
  },
  {
    name: 'All',
    value: 'all',
  },
]

const ExportContent = () => {
  const { t } = useTranslation(['poi-plugin-ship-info'])
  const [sep, setSep] = React.useState(',')
  const [end, setEnd] = React.useState(isWin ? '\r\n' : '\n')
  const [selection, setSelection] = React.useState('current')

  // Get filtered ship IDs from the table
  const filteredShipIds = useAtomValue(filteredShipIdsAtom)

  const handleChange =
    (name: 'sep' | 'end' | 'selection') => (value: string) => () => {
      if (name === 'sep') setSep(value)
      else if (name === 'end') setEnd(value)
      else if (name === 'selection') setSelection(value)
    }

  const getShipData = useCallback((): IShipRawData[] => {
    const state = window.getStore()
    const ships = allShipRowsMapSelector(state)

    // Use filtered IDs from table for 'current', all ships for 'all'
    if (selection === 'current') {
      return map(filteredShipIds, (id) => ships[id]).filter(
        Boolean,
      ) as IShipRawData[]
    }
    return values(ships) as IShipRawData[]
  }, [selection, filteredShipIds])

  const handleExportToClipboard = useCallback(() => {
    clipboard.writeText(buildCsv(getShipData(), sep, end))
  }, [getShipData, sep, end])

  const handleExportToFile = useCallback(async () => {
    const bw = remote.getCurrentWindow()
    const result = await dialog.showSaveDialog(bw, {
      filters: [
        {
          extensions: ['csv'],
          name: 'CSV file',
        },
      ],
      title: t('Position the file to save into'),
    })

    if (!result.canceled && result.filePath) {
      try {
        await outputFile(result.filePath, buildCsv(getShipData(), sep, end))
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e)
      }
    }
  }, [t, getShipData, sep, end])

  return (
    <Container>
      <div>
        <Select
          label="Data"
          options={selectionOptions}
          value={selection}
          onChange={handleChange('selection')}
        />
        <Select
          label="Separator"
          options={sepOptions}
          value={sep}
          onChange={handleChange('sep')}
        />
        <Select
          label="Line break"
          options={endOptions}
          value={end}
          onChange={handleChange('end')}
        />
      </div>
      <div>
        <ButtonGroup>
          <Button onClick={handleExportToClipboard}>
            {t('Copy to clipboard')}
          </Button>
          <Button onClick={handleExportToFile}>{t('Export to file')}</Button>
        </ButtonGroup>
      </div>
    </Container>
  )
}

export const Export = () => {
  return (
    <Popover content={<ExportContent />} hasBackdrop>
      <Button minimal>
        <FA name="download" />
      </Button>
    </Popover>
  )
}
