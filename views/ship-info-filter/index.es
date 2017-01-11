import React, { Component } from 'react'
import { Grid, Row } from 'react-bootstrap'
import { lvOptions, lockedOptions, expeditionOptions, modernizationOptions, 
  remodelOptions, rawValueOptions, pagedLayoutOptions } from '../constants'
import TypeCheck from './type-check'
import RadioCheck from './radio-check'
import SallyAreaCheck from './sally-area-check'


export default class ShipInfoFilter extends Component {
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
            </div>
        }
      </Grid>      
    )
  }
}
