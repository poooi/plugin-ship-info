import { TFunction } from 'i18next'
import { get } from 'lodash'
import React, { Component, ComponentType } from 'react'
import { withTranslation, WithTranslation } from 'react-i18next'
import { connect, DispatchProp } from 'react-redux'
import { compose } from 'redux'

import { Checkbox, CheckboxLabel, CheckboxOption } from '../components/checkbox'

interface IProps extends DispatchProp, WithTranslation {
  configKey: string
  label: string
  options: { [key: string]: string }
  default: number
  currentValue: number
  t: TFunction
}

export const RadioCheck = compose<
  ComponentType<
    Omit<IProps, 't' | 'currentValue' | 'dispatch' | 'i18n' | 'tReady'>
  >
>(
  withTranslation(['poi-plugin-ship-info']),
  connect((state: { config: any }, props: IProps) => ({
    currentValue: get(
      state.config,
      `plugin.ShipInfo.${props.configKey}`,
      props.default || 0,
    ),
  })),
)(
  class RadioCheckBase extends Component<IProps> {
    public handleClickRadio = (index: number) => () => {
      window.config.set(`plugin.ShipInfo.${this.props.configKey}`, index)
    }

    public render() {
      const { label, options, currentValue, t } = this.props
      return (
        <Checkbox halfWidth>
          <CheckboxLabel>{t(label)}</CheckboxLabel>
          {Object.keys(options).map(key => (
            <CheckboxOption
              key={key}
              onClick={this.handleClickRadio(parseInt(key, 10))}
              checked={parseInt(key, 10) === currentValue}
            >
              {t(options[key])}
            </CheckboxOption>
          ))}
        </Checkbox>
      )
    }
  },
)
