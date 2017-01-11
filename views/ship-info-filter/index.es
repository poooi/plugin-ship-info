import React, { Component } from 'react'
import { Grid, Row, Col, Button } from 'react-bootstrap'
import { lvOptions, lockedOptions, expeditionOptions, modernizationOptions, 
  remodelOptions, rawValueOptions, pagedLayoutOptions,
  marriedOptions, inFleetOptions, sparkleOptions,
  exSlotOptions } from '../constants'
import TypeCheck from './type-check'
import RadioCheck from './radio-check'
import SallyAreaCheck from './sally-area-check'

const {__} = window

export default class ShipInfoFilter extends Component {

  handleResetAll = () => {
    config.set("plugin.ShipInfo")
  }

  render(){
    const {showDetails} = this.props
    return(
      <Grid>
        <TypeCheck show={showDetails}/>
        {
          showDetails &&
            <div>
              <Row>
                <RadioCheck 
                  configKey='lvRadio'
                  label='Level Setting'
                  options={lvOptions}
                  default={2}
                />
                <RadioCheck 
                  configKey='lockedRadio'
                  label='Lock Setting'
                  options={lockedOptions}
                  default={1}
                />
                <RadioCheck 
                  configKey='expeditionRadio'
                  label='Expedition Setting'
                  options={expeditionOptions}
                  default={0}
                />
                <RadioCheck 
                  configKey='inFleetRadio'
                  label='In Fleet'
                  options={inFleetOptions}
                  default={0}
                />
                <RadioCheck 
                  configKey='modernizationRadio'
                  label='Modernization Setting'
                  options={modernizationOptions}
                  default={0}
                />
                <RadioCheck 
                  configKey='remodelRadio'
                  label='Remodel Setting'
                  options={remodelOptions}
                  default={0}
                />
                <RadioCheck 
                  configKey='sparkleRadio'
                  label='Sparkle'
                  options={sparkleOptions}
                  default={0}
                />
                <RadioCheck 
                  configKey='exSlotRadio'
                  label='Extra Slot'
                  options={exSlotOptions}
                  default={0}
                />
              </Row>
              <SallyAreaCheck />
              <Row>
                <RadioCheck 
                  configKey='rawValue'
                  label='Value Type'
                  options={rawValueOptions}
                  default={0}
                />
                <RadioCheck 
                  configKey='pagedLayout'
                  label='Paged'
                  options={pagedLayoutOptions}
                  default={0}
                />
              </Row>
              <Row>
                <Col xs={12} className='reset-panel'>
                  <Button
                    onClick={this.handleResetAll}
                    id='reset-button'
                  >
                    {__('Reset all filters and Settings')}
                  </Button>
                </Col>
              </Row>
            </div>
        }
      </Grid>      
    )
  }
}
