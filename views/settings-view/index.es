import React, { Component } from 'react'
import { Grid, Row, Col, Button, ButtonGroup, ButtonToolbar } from 'react-bootstrap'
import { lvOptions, lockedOptions, expeditionOptions, modernizationOptions,
  remodelOptions, rawValueOptions, pagedLayoutOptions,
  inFleetOptions, sparkleOptions,
  exSlotOptions, daihatsuOptions } from '../constants'
import Divider from '../divider'
import TypeCheck from './type-check'
import RadioCheck from './radio-check'
import SallyAreaCheck from './sally-area-check'

import TypeDropdown from './type-dropdown'
import BookmarkDropdown from './bookmark-dropdown'

const { __, config } = window

export default class ShipInfoCheckboxArea extends Component {
  constructor() {
    super()
    this.state = {
      filterShow: false,
    }
  }

  handleFilterShow = () => {
    this.setState({
      filterShow: !this.state.filterShow,
    })
  }

  handleResetAll = () => {
    const { bounds } = config.get('plugin.ShipInfo', {})
    config.set('plugin.ShipInfo', {
      bounds,
    })
  }

  render() {
    const { filterShow } = this.state
    return (
      <div id="ship-info-settings">
        <div onClick={this.handleFilterShow} role="button" tabIndex="0">
          <Divider text={__('Filter Setting')} icon show={this.state.filterShow} />
        </div>
        <div id="ship-info-filter" style={{ display: 'block' }}>
          <Grid>
            <ButtonToolbar>
              <ButtonGroup>
                <TypeDropdown />
              </ButtonGroup>

              <ButtonGroup>
                <Button
                  onClick={this.handleResetAll}
                  id="reset-button"
                >
                  {__('Reset all Filters & Settings')}
                </Button>
                <BookmarkDropdown />
              </ButtonGroup>
            </ButtonToolbar>
          </Grid>
          <Grid>
            <TypeCheck show={filterShow} />
            {
              filterShow &&
                <div>
                  <Row>
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
                  </Row>
                  <SallyAreaCheck />
                  <Row>
                    <RadioCheck
                      configKey="rawValue"
                      label="Value Type"
                      options={rawValueOptions}
                      default={0}
                    />
                    <RadioCheck
                      configKey="pagedLayout"
                      label="Paged"
                      options={pagedLayoutOptions}
                      default={0}
                    />
                  </Row>
                  <Row>
                    <Col xs={6} className="reset-panel">
                      <Button
                        onClick={this.handleResetAll}
                        id="reset-button"
                      >
                        {__('Reset all Filters & Settings')}
                      </Button>
                    </Col>
                    <Col xs={6} className="reset-panel">
                      <BookmarkDropdown />
                    </Col>
                  </Row>
                </div>
            }
          </Grid>
        </div>
      </div>
    )
  }
}
