import React, { PureComponent } from 'react'
import { Dropdown } from 'react-bootstrap'
import propTypes from 'prop-types'

import RadioCheck from './radio-check'
import SallyAreaCheck from './sally-area-check'
import { lvOptions, lockedOptions, expeditionOptions, modernizationOptions,
  remodelOptions, rawValueOptions,
  inFleetOptions, sparkleOptions,
  exSlotOptions, daihatsuOptions } from '../constants'

const { __ } = window

// dropdown menu should accept a ref, we cannot use the stateless component
class ConfigMenu extends PureComponent { // eslint-disable-line react/prefer-stateless-function

  componentDidUpdate() {
    const typeButton = document.querySelector('#type-dropdown')
    if (!typeButton) {
      return
    }
    const { width } = typeButton.getBoundingClientRect()
    if (this.menu && this.left !== width) {
      this.menu.style.left = `-${width}px`
      this.left = width
    }
  }

  render() {
    return (
      <ul className="dropdown-menu" ref={(ref) => { this.menu = ref }}>
        <div className="config-menu">
          <div className="dual-col">
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
          </div>
          <div className="single-col">
            <SallyAreaCheck />
          </div>
          <div className="dual-col">
            <RadioCheck
              configKey="rawValue"
              label="Value Type"
              options={rawValueOptions}
              default={0}
            />
          </div>
        </div>
      </ul>
    )
  }
}

const ConfigDropdown = ({ open }) =>
  (
    <Dropdown id="config-dropdown" open={open}>
      <Dropdown.Toggle>
        {__('Options')}
      </Dropdown.Toggle>
      <ConfigMenu bsRole="menu" />
    </Dropdown>
  )

ConfigDropdown.propTypes = {
  open: propTypes.bool,
}

export default ConfigDropdown
