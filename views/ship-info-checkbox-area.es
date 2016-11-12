const {React, ReactBootstrap, __} = window
const {Button, Input, Col, Grid} = ReactBootstrap
import Divider from './divider'
import ShipInfoFilter from './ship-info-filter'


const ShipInfoCheckboxArea = React.createClass({
  getInitialState: function(){
    return{
      filterShow: false,
      sortShow: false,
    }
  },
  handleClickAscend: function(){
    this.props.sortRules(this.props.sortKey, 1)
  },
  handleClickDescend: function(){
    this.props.sortRules(this.props.sortKey, 0)
  },
  handleKeyChange: function(e){
    this.props.sortRules(e.target.value, this.props.order)
  },
  handleSortShow: function(){
    let {sortShow} = this.state
    sortShow = !sortShow
    this.setState({sortShow})
  },
  handleFilterShow: function(){
    let {filterShow} = this.state
    filterShow = !filterShow
    this.setState ({filterShow})
  },
  render: function(){
    return(
        <div id='ship-info-settings'>
          <div onClick={this.handleSortShow}>
            <Divider text={__('Sort Order Setting')} icon={true} show={this.state.sortShow}/>
          </div>
          <div className='vertical-center' style={ this.state.sortShow ? {display: 'block'} : {display: 'none'}}>
            <Grid>
              <Col xs={2} className='filter-span'>{__ ('Sort By')}</Col>
              <Col xs={6}>
                <Input id='sortbase' type='select' value={this.props.sortKey} onChange={this.handleKeyChange}>
                  <option value='id'>{__('ID')}</option>
                  <option value='type'>{__ ('Class')}</option>
                  <option value='name'>{__ ('Name')}</option>
                  <option value='lv'>{__ ('Level')}</option>
                  <option value='cond'>{__ ('Cond')}</option>
                  <option value='karyoku'>{__ ('Firepower')}</option>
                  <option value='raisou'>{__ ('Torpedo')}</option>
                  <option value='taiku'>{__ ('AA')}</option>
                  <option value='soukou'>{__ ('Armor')}</option>
                  <option value='lucky'>{__ ('Luck')}</option>
                  <option value='kaihi'>{__ ('Evasion')}</option>
                  <option value='taisen'>{__ ('ASW')}</option>
                  <option value='sakuteki'>{__ ('LOS')}</option>
                  <option value='repairtime'>{__ ('Repair')}</option>
                </Input>
              </Col>
              <Col xs={2}>
                <Button bsStyle={this.props.order == 0 ? 'success' : 'default'} bsSize='small' onClick={this.handleClickDescend} block>
                  {this.props.order == 0 ? '√ ' : ''} {__ ('Descending')}
                </Button>
              </Col>
              <Col xs={2}>
                <Button bsStyle={this.props.order == 1 ? 'success' : 'default'} bsSize='small' onClick={this.handleClickAscend} block>
                  {this.props.order == 1 ? '√ ' : ''} {__ ('Ascending')}
                </Button>
              </Col>
            </Grid>
          </div>
          <div onClick={this.handleFilterShow}>
            <Divider text={__ ('Filter Setting')} icon={true} show={this.state.filterShow} />
          </div>
          <div id='ship-info-filter' style={{display: 'block'}}>
            <ShipInfoFilter
              showDetails={this.state.filterShow}
              shipTypeBoxes={this.props.shipTypeBoxes}
              lvRadio={this.props.lvRadio}
              lockedRadio={this.props.lockedRadio}
              expeditionRadio={this.props.expeditionRadio}
              modernizationRadio={this.props.modernizationRadio}
              remodelRadio={this.props.remodelRadio}
              sallyTags={this.props.sallyTags}
              sallyAreaBoxes={this.props.sallyAreaBoxes}
              typeFilterRules={this.props.filterRules}
              lvFilterRules={this.props.filterRules}
              lockedFilterRules={this.props.filterRules}
              expeditionFilterRules={this.props.filterRules}
              modernizationFilterRules={this.props.filterRules}
              remodelFilterRules={this.props.filterRules}
              sallyAreaFilterRules={this.props.filterRules}
              tagStyles={this.props.tagStyles}
            />
          </div>
        </div>
    )
  },
})


module.exports = ShipInfoCheckboxArea
