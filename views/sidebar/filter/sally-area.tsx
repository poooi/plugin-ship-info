import cls from 'classnames'
import { TFunction } from 'i18next'
import { get } from 'lodash'
import { rgba } from 'polished'
import PropTypes from 'prop-types'
import React, { Component, ComponentType } from 'react'
import { withTranslation } from 'react-i18next'
import { connect } from 'react-redux'
import { compose } from 'redux'

import { Checkbox, CheckboxLabel, CheckboxOption } from '../components/checkbox'

interface IProps {
  checked: boolean[]
  checkedAll: boolean
  mapname: string[]
  color: string[]
  displayFleetName: boolean
  t: TFunction
}

export const SallyAreaCheck = compose<ComponentType<{}>>(
  withTranslation(['poi-plugin-ship-info']),
  connect((state: { config: any }) => {
    const displayFleetName = get(
      state.config,
      'plugin.ShipInfo.displayFleetName',
      false,
    )
    const mapname = displayFleetName
      ? get(state, ['fcd', 'shiptag', 'fleetname', window.language], [])
      : get(state, ['fcd', 'shiptag', 'mapname'], [])
    const defaultChecked = Array(mapname.length + 1).fill(true)
    let checked = get(
      state.config,
      'plugin.ShipInfo.sallyAreaChecked',
      defaultChecked,
    )

    // reset config values if updated
    checked = mapname.length + 1 === checked.length ? checked : defaultChecked
    const checkedAll = checked.reduce((a: boolean, b: boolean) => a && b, true)

    return {
      checked,
      checkedAll,
      color: get(state, 'fcd.shiptag.color', []),
      displayFleetName,
      mapname,
    }
  }),
)(
  class SallyAreaCheckBase extends Component<IProps> {
    public handleClickBox = (index: number) => () => {
      const checked = this.props.checked.slice()
      let { checkedAll } = this.props

      if (index === -1) {
        checkedAll = !checkedAll
        checked.fill(checkedAll)
      } else {
        checked[index] = !checked[index]
        checkedAll = checked.reduce((a, b) => a && b, true)
      }

      window.config.set('plugin.ShipInfo.sallyAreaChecked', checked)
    }

    public handleChangeDisplayFleetName = () => {
      window.config.set(
        'plugin.ShipInfo.displayFleetName',
        !this.props.displayFleetName,
      )
    }

    public render() {
      const {
        mapname,
        color,
        checked,
        checkedAll,
        displayFleetName,
        t,
      } = this.props
      return (
        <Checkbox>
          <CheckboxLabel>{t('Sally Area')}</CheckboxLabel>

          <CheckboxOption
            key={-2}
            checked={checkedAll}
            onClick={this.handleClickBox(-1)}
          >
            {t('All')}
          </CheckboxOption>
          <CheckboxOption
            key={-1}
            checked={checked[0]}
            onClick={this.handleClickBox(0)}
          >
            {t('Free')}
          </CheckboxOption>
          {mapname.map((name, idx) => (
            <CheckboxOption
              key={idx}
              onClick={this.handleClickBox(idx + 1)}
              style={{
                backgroundColor: checked[idx + 1] ? rgba(color[idx], 0.75) : '',
                color: !checked[idx + 1] ? color[idx] : '',
              }}
            >
              {t(name)}
            </CheckboxOption>
          ))}
        </Checkbox>
      )
    }
  },
)
