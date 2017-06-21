import React, { PureComponent } from 'react'
import { Dropdown } from 'react-bootstrap'

import RadioCheck from './radio-check'
import SallyAreaCheck from './sally-area-check'
import { lvOptions, lockedOptions, expeditionOptions, modernizationOptions,
  remodelOptions, rawValueOptions, pagedLayoutOptions,
  inFleetOptions, sparkleOptions,
  exSlotOptions, daihatsuOptions } from '../constants'

const { __ } = window

// dropdown menu should accept a ref, we cannot use the stateless component
class ConfigMenu extends PureComponent { // eslint-disable-line react/prefer-stateless-function
  render() {
    return (
      <ul className="dropdown-menu">
        <div className="config-menu">
          <RadioCheck
            configKey="lvRadio"
            label="Level"
            options={lvOptions}
            default={2}
          />
          <RadioCheck
            configKey="lockedRadio"
            label="Lock"
            options={lockedOptions}
            default={1}
          />
          <RadioCheck
            configKey="expeditionRadio"
            label="Expedition"
            options={expeditionOptions}
            default={0}
          />
          <RadioCheck
            configKey="inFleetRadio"
            label="In Fleet"
            options={inFleetOptions}
            default={0}
          />
          <RadioCheck
            configKey="modernizationRadio"
            label="Modernization"
            options={modernizationOptions}
            default={0}
          />
          <RadioCheck
            configKey="remodelRadio"
            label="Remodelable"
            options={remodelOptions}
            default={0}
          />
          <RadioCheck
            configKey="sparkleRadio"
            label="Sparkle"
            options={sparkleOptions}
            default={0}
          />
          <RadioCheck
            configKey="exSlotRadio"
            label="Extra Slot"
            options={exSlotOptions}
            default={0}
          />
          <RadioCheck
            configKey="daihatsuRadio"
            label="Daihatsu"
            options={daihatsuOptions}
            default={0}
          />
          <SallyAreaCheck />
          <RadioCheck
            configKey="rawValue"
            label="Value Type"
            options={rawValueOptions}
            default={0}
          />
        </div>
      </ul>
    )
  }
}

const ConfigDropdown = () =>
  (
    <Dropdown id="config-dropdown">
      <Dropdown.Toggle>
        {__('Options')}
      </Dropdown.Toggle>
      <ConfigMenu bsRole="menu" />
    </Dropdown>
  )

export default ConfigDropdown
