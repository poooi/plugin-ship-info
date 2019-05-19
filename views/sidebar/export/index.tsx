import { Button, ButtonGroup, HTMLSelect } from '@blueprintjs/core'
import { promisify } from 'bluebird'
import { clipboard, remote } from 'electron'
import fs from 'fs-extra'
import { map } from 'lodash'
import React, { Component, FormEvent, useCallback } from 'react'
import FA from 'react-fontawesome'
import { useTranslation, withTranslation, WithTranslation } from 'react-i18next'
import { connect } from 'react-redux'
import { Popover } from 'views/components/etc/overlay'

import { allShipRowsSelector, shipRowsSelector } from '../../selectors'
import { IShip } from '../../types'
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

interface IProps extends WithTranslation {
  rows: IShip[]
  allRows: IShip[]
}

interface IState {
  sep?: string
  end?: string
  selection?: string
}

const ExportContent = withTranslation(['poi-plugin-ship-info'])(
  class ExportContentBase extends Component<IProps, IState> {
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

    public handleExportToClipboard = () => {
      const { sep, end, selection } = this.state
      const rows =
        selection === 'current' ? this.props.rows : this.props.allRows
      clipboard.writeText(buildCsv(rows, sep, end))
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
            const { sep, end, selection } = this.state
            const rows =
              selection === 'current' ? this.props.rows : this.props.allRows
            try {
              await outputFile(filename, buildCsv(rows, sep, end))
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

export const Export = connect(state => ({
  allRows: allShipRowsSelector(state),
  rows: shipRowsSelector(state),
}))(({ allRows, rows }: { allRows: IShip[]; rows: IShip[] }) => {
  return (
    <Popover hasBackdrop={true}>
      <Button minimal={true}>
        <FA name="download" />
      </Button>
      <ExportContent allRows={allRows} rows={rows} />
    </Popover>
  )
})
