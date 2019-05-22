import { Button, ButtonGroup, HTMLSelect } from '@blueprintjs/core'
import { promisify } from 'bluebird'
import { clipboard, remote } from 'electron'
import fs from 'fs-extra'
import { map, values } from 'lodash'
import React, { Component, FormEvent, useCallback } from 'react'
import FA from 'react-fontawesome'
import { useTranslation, withTranslation, WithTranslation } from 'react-i18next'
import { Popover } from 'views/components/etc/overlay'

import { allShipRowsMapSelector, filterShipIdsSelector } from '../../selectors'
import { Checkbox, CheckboxLabel } from '../components/checkbox'
import { Container } from '../components/layout'
import { buildCsv } from './build-csv'

const { dialog } = remote
const outputFile = promisify(fs.outputFile)

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

interface IState {
  sep?: string
  end?: string
  selection?: string
}

const ExportContent = withTranslation(['poi-plugin-ship-info'])(
  class ExportContentBase extends Component<WithTranslation, IState> {
    public state = {
      end: isWin ? '\r\n' : '\n',
      selection: 'current',
      sep: ',',
    }

    public handleChange = (name: keyof IState) => (value: string) => () => {
      this.setState({
        [name]: value,
      })
    }

    public getShipData = () => {
      const { selection } = this.state
      const state = window.getStore()

      const ids = filterShipIdsSelector(state)
      const ships = allShipRowsMapSelector(state)

      return selection === 'current' ? map(ids, id => ships[id]) : values(ships)
    }

    public handleExportToClipboard = () => {
      const { sep, end } = this.state

      clipboard.writeText(buildCsv(this.getShipData(), sep, end))
    }

    public handleExportToFile = () => {
      const { t } = this.props
      const bw = remote.getCurrentWindow()
      dialog.showSaveDialog(
        bw,
        {
          filters: [
            {
              extensions: ['csv'],
              name: 'CSV file',
            },
          ],
          title: t('Position the file to save into'),
        },
        async filename => {
          if (filename) {
            const { sep, end } = this.state
            try {
              await outputFile(filename, buildCsv(this.getShipData(), sep, end))
            } catch (e) {
              console.error(e)
            }
          }
        },
      )
    }

    public render() {
      const { sep, end, selection } = this.state
      const { t } = this.props
      return (
        <Container>
          <div>
            <Select
              label="Data"
              options={selectionOptions}
              value={selection}
              onChange={this.handleChange('selection')}
            />
            <Select
              label="Separator"
              options={sepOptions}
              value={sep}
              onChange={this.handleChange('sep')}
            />
            <Select
              label="Line break"
              options={endOptions}
              value={end}
              onChange={this.handleChange('end')}
            />
          </div>
          <div>
            <ButtonGroup>
              <Button onClick={this.handleExportToClipboard}>
                {t('Copy to clipboard')}
              </Button>
              <Button onClick={this.handleExportToFile}>
                {t('Export to file')}
              </Button>
            </ButtonGroup>
          </div>
        </Container>
      )
    }
  },
)

export const Export = () => {
  return (
    <Popover hasBackdrop={true}>
      <Button minimal={true}>
        <FA name="download" />
      </Button>
      <ExportContent />
    </Popover>
  )
}
