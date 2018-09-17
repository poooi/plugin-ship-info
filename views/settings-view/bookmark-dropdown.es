import React, { Component } from 'react'
import PropTypes from 'prop-types'
import {
  Dropdown,
  MenuItem,
  FormControl,
  InputGroup,
  Button,
  Label,
} from 'react-bootstrap'
import Fuse from 'fuse.js'
import { connect } from 'react-redux'
import { get, values, isEqual } from 'lodash'
import FontAwesome from 'react-fontawesome'
import { translate } from 'react-i18next'
import { compose } from 'redux'

import { extensionSelectorFactory } from 'views/utils/selectors'

import { onUpdate, onDelete, PLUGIN_KEY } from '../redux'
import { boolArrayToInt } from '../utils'

const BookmarkItem = ({ eventKey, onSelect, onClick, children }) => (
  <MenuItem eventKey={eventKey} onSelect={onSelect} className="bookmark">
    <span className="bookmark-content">{children}</span>
    <Button onClick={onClick} className="bookmark-delete" bsStyle="danger">
      {<FontAwesome name="trash-o" />}
    </Button>
  </MenuItem>
)

BookmarkItem.propTypes = {
  eventKey: PropTypes.string.isRequired,
  onSelect: PropTypes.func,
  onClick: PropTypes.func,
  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.element),
    PropTypes.string,
  ]).isRequired,
}

@translate(['poi-plugin-ship-info'])
@connect(state => ({
  bookmarks: extensionSelectorFactory(PLUGIN_KEY)(state).bookmark || {},
}))
class BookmarkMenu extends Component {
  static propTypes = {
    bookmarks: PropTypes.objectOf(PropTypes.object).isRequired,
    children: PropTypes.arrayOf(PropTypes.element),
    t: PropTypes.func.isRequired,
  }

  constructor(props) {
    super(props)
    const bookmarks = values(props.bookmarks)
    this.fuse = new Fuse(bookmarks, {
      keys: ['name'],
      minMatchCharLength: 2,
      findAllMatches: true,
    })
    this.state = {
      query: '',
    }
  }

  // componentDidMount = () => {
  //   this.unsubsribeObserver = observe(window.store, [ShipInfoObserver])
  // }

  // componentWillUnmount = () => {
  //   if (this.unsubsribeObserver) {
  //     this.unsubsribeObserver()
  //   }
  // }

  componentWillReceiveProps = nextProps => {
    if (!isEqual(this.props.bookmarks, nextProps.bookmarks)) {
      this.fuse.list = values(nextProps.bookmarks)
    }
  }

  onSelect = (eventKey = this.state.query) => {
    const settings = get(this.props.bookmarks, eventKey, {})
    // comvert old settings to new
    if ('shipTypeChecked' in settings) {
      settings.shipTypes = boolArrayToInt(settings.shipTypeChecked)
    }
    Object.keys(settings).forEach(key =>
      config.set(`plugin.ShipInfo.${key}`, settings[key]),
    )
  }

  onCreateOrOverwrite = () => {
    const settings = Object.create(null)
    Object.assign(settings, config.get('plugin.ShipInfo'))
    if ('bounds' in settings) {
      delete settings.bounds
    }
    window.store.dispatch(
      onUpdate({
        bookmark: this.state.query,
        settings,
      }),
    )
  }

  onClickDelete = eventKey => e => {
    e.stopPropagation()
    window.store.dispatch(
      onDelete({
        bookmark: eventKey,
      }),
    )
  }

  handleInput = e => this.setState({ query: e.target.value })

  handleClearInput = () => {
    if (this.queryForm) {
      this.queryForm.focus()
    }
    this.setState({ query: '' })
  }

  render() {
    const { children, t } = this.props
    const { query } = this.state

    const result =
      query.length > 0
        ? Object.entries(this.fuse.search(query))
            .map(([key, value]) => value) // eslint-disable-line no-unused-vars
            .map(value => value.name)
        : Object.keys(this.props.bookmarks)
    return (
      <ul className="dropdown-menu">
        <li className="bookmark-input-list">
          <a>
            <InputGroup>
              <FormControl
                inputRef={ref => {
                  this.queryForm = ref
                }}
                type="text"
                value={query}
                placeholder={t('Search or create a bookmark')}
                onChange={this.handleInput}
                id="bookmark-input"
              />
              <InputGroup.Addon onClick={this.handleClearInput}>
                <FontAwesome name="times" />
              </InputGroup.Addon>
            </InputGroup>
          </a>
        </li>

        <MenuItem divider />
        {query.length > 0 && (
          <MenuItem onSelect={this.onCreateOrOverwrite}>
            <span className="bookmark-content">
              {result.includes(query) ? t('Overwrite ') : t('Create ')}
              <Label bsStyle="primary" className="query-label">
                {query}
              </Label>
            </span>
          </MenuItem>
        )}
        {React.Children.toArray(children)
          .filter(child => result.includes(child.props.eventKey))
          .map(child =>
            React.cloneElement(child, {
              onSelect: this.onSelect,
              onClick: this.onClickDelete(child.props.eventKey),
            }),
          )}
      </ul>
    )
  }
}

const handleToggleAction = () => ({
  type: '@@poi-plugin-ship-info@active-dropdown',
  activeDropdown: 'bookmark',
})

const BookmarkDropdown = compose(
  translate(['poi-plugin-ship-info']),
  connect(
    state => ({
      bookmarks: extensionSelectorFactory(PLUGIN_KEY)(state).bookmark || {},
      activeDropdown: get(
        extensionSelectorFactory('poi-plugin-ship-info')(state),
        'ui.activeDropdown',
        0,
      ),
    }),
    { handleToggle: handleToggleAction },
  ),
)(({ bookmarks, activeDropdown, handleToggle, t }) => (
  <Dropdown
    id="bookmark"
    pullRight
    open={activeDropdown === 'bookmark'}
    onToggle={handleToggle}
  >
    <Dropdown.Toggle>
      <FontAwesome name="tags" style={{ marginRight: '1ex' }} />
      {t('Bookmarks')}
    </Dropdown.Toggle>
    <BookmarkMenu bsRole="menu">
      {Object.keys(bookmarks).map(name => (
        <BookmarkItem eventKey={name} key={name}>
          {name}
        </BookmarkItem>
      ))}
    </BookmarkMenu>
  </Dropdown>
))

export default BookmarkDropdown
