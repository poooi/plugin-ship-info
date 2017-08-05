import React, { Component } from 'react'
import propTypes from 'prop-types'
import { Dropdown } from 'react-bootstrap'
import { connect } from 'react-redux'
import { get } from 'lodash'
import FontAwesome from 'react-fontawesome'
import { createSelector } from 'reselect'

import { extensionSelectorFactory } from 'views/utils/selectors'

import { PLUGIN_KEY, onDPInit } from '../../redux'
import { deckPlannerCurrentSelector } from '../../selectors'
import Area from './area'

const { __ } = window

const DeckPlannerView = connect(
  (state) => ({
    color: get(state, 'fcd.shiptag.color', []),
    mapname: get(state, 'fcd.shiptag.mapname', []),
    current: deckPlannerCurrentSelector(state),
  })
)(class DeckPlannerView extends Component {

  constructor(props) {
    super(props)

    const { mapname, color } = props

    this.state = {
      name: 'deck plan',
      areas: mapname.map((name, index) => ({
        name,
        color: color[index],
        ships: [],
        areaIndex: index,
      })),
    }
  }

  componentWillMount = () => {
    const { mapname, color, current } = this.props
    if (current.length !== mapname.length) {
      this.props.dispatch(onDPInit({
        color,
        mapname,
      }))
    }
  }

  render() {
    const { areas } = this.state
    return (
      <ul className="dropdown-menu" style={{ width: '100vw', height: '80vh' }}>
        <div>
          {
            areas.map(area => (
              <Area
                key={area.name}
                area={area}
                index={area.areaIndex}
                others={areas.filter(({ areaIndex }) => areaIndex !== area.areaIndex)}
              />
            ))
          }
        </div>
      </ul>
    )
  }
})

const handleToggleAction = () => ({
  type: '@@poi-plugin-ship-info@active-dropdown',
  activeDropdown: 'planner',
})


const PlannerDropdown = connect(
  state => ({
    activeDropdown: get(extensionSelectorFactory('poi-plugin-ship-info')(state), 'ui.activeDropdown', 0),
  }),
  { handleToggle: handleToggleAction },
)(({ activeDropdown, handleToggle }) =>
  (<Dropdown id="planner" pullRight open={activeDropdown === 'planner'} onToggle={handleToggle}>
    <Dropdown.Toggle>
      <FontAwesome name="tags" style={{ marginRight: '1ex' }} />{__('Planner')}<sup>BETA</sup>
    </Dropdown.Toggle>
    <DeckPlannerView bsRole="menu" />
  </Dropdown>)
)
export default PlannerDropdown
