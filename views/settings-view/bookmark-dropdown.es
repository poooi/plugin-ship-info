import React, { Component } from 'react'
import propTypes from 'prop-types'
import { Dropdown, MenuItem, FormControl, Button, Label } from 'react-bootstrap'
import Fuse from 'fuse.js'
import { connect } from 'react-redux'
import { get, values } from 'lodash'
import FontAwesome from 'react-fontawesome'
import { observe } from 'redux-observers'

import { extensionSelectorFactory } from 'views/utils/selectors'

import { onUpdate, onDelete, PLUGIN_KEY, ShipInfoObserver } from '../redux'
import { boolArrayToInt } from '../utils'

const { __ } = window

// const bookmarks = ['test', 'foo', 'bar']

const BookmarkItem = ({ eventKey, onSelect, onClick, children }) =>
  (
    <MenuItem eventKey={eventKey} onSelect={onSelect} className="bookmark">
      <span className="bookmark-content">
        {
          children
        }
      </span>
      <Button onClick={onClick} className="bookmark-delete" bsStyle="danger">
        {<FontAwesome name="trash-o" />}
      </Button>
    </MenuItem>
  )

BookmarkItem.propTypes = {
  eventKey: propTypes.string.isRequired,
  onSelect: propTypes.func,
  onClick: propTypes.func,
  children: propTypes.oneOfType([
    propTypes.arrayOf(propTypes.element),
    propTypes.string,
  ]).isRequired,
}

const BookmarkMenu = connect(
  state => ({
    bookmarks: extensionSelectorFactory(PLUGIN_KEY)(state).bookmark || {},
  })
)(class BookmarkMenu extends Component {
  constructor(props) {
    super(props)
    console.log(props.bookmarks)
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

  static propTypes = {
    bookmarks: propTypes.objectOf(propTypes.object).isRequired,
    children: propTypes.arrayOf(propTypes.element),
  }

  // componentDidMount = () => {
  //   this.unsubsribeObserver = observe(window.store, [ShipInfoObserver])
  // }

  // componentWillUnmount = () => {
  //   if (this.unsubsribeObserver) {
  //     this.unsubsribeObserver()
  //   }
  // }

  componentWillReceiveProps = (nextProps) => {
    const bookmarks = values(nextProps.bookmarks)
    this.fuse.setCollection(bookmarks)
  }

  onSelect = (eventKey = this.state.query) => {
    const settings = get(this.props.bookmarks, eventKey, {})
    // comvert old settings to new
    if ('shipTypeChecked' in settings) {
      settings.shipTypes = boolArrayToInt(settings.shipTypeChecked)
    }
    Object.keys(settings).forEach(key => config.set(`plugin.ShipInfo.${key}`, settings[key]))
  }

  onCreateOrOverwrite = () => {
    const settings = Object.create(null)
    Object.assign(settings, config.get('plugin.ShipInfo'))
    if ('bounds' in settings) {
      delete settings.bounds
    }
    window.store.dispatch(onUpdate({
      bookmark: this.state.query,
      settings,
    }))
  }

  onClickDelete = eventKey => (e) => {
    e.stopPropagation()
    window.store.dispatch(onDelete({
      bookmark: eventKey,
    }))
  }

  handleInput = e => this.setState({ query: e.target.value })

  render() {
    const { children } = this.props
    const { query } = this.state

    const result = query.length > 0
      ? Object.entries(this.fuse.search(query))
        .map(([key, value]) => value) // eslint-disable-line no-unused-vars
        .map(value => value.name)
      : Object.keys(this.props.bookmarks)
    return (
      <ul className="dropdown-menu">
        <li className="bookmark-input-list">
          <a>
            <FormControl
              type="text"
              value={query}
              placeholder={__('Search or create a bookmark')}
              onChange={this.handleInput}
              id="bookmark-input"
            />
          </a>
        </li>


        <MenuItem divider />
        {
          query.length > 0 &&
          <MenuItem onSelect={this.onCreateOrOverwrite}>
            <span className="bookmark-content">
              {result.includes(query) ? __('Overwrite ') : __('Create ') }
              <Label bsStyle="primary" className="query-label">{query}</Label>
            </span>
          </MenuItem>
        }
        {
          React.Children.toArray(children)
            .filter(child => result.includes(child.props.eventKey))
            .map(child => React.cloneElement(child, {
              onSelect: this.onSelect,
              onClick: this.onClickDelete(child.props.eventKey),
            }))
        }
      </ul>
    )
  }
})

const BookmarkDropdown = connect(
  state => ({
    bookmarks: extensionSelectorFactory(PLUGIN_KEY)(state).bookmark || {},
  })
)(({ bookmarks, open }) =>
  (<Dropdown id="bookmark" pullRight open={open}>
    <Dropdown.Toggle>
      <FontAwesome name="tags" style={{ marginRight: '1ex' }} />{__('Bookmarks')}
    </Dropdown.Toggle>
    <BookmarkMenu bsRole="menu">
      {
        Object.keys(bookmarks).map(name =>
          <BookmarkItem eventKey={name} key={name}>{name}</BookmarkItem>
        )
      }
    </BookmarkMenu>
  </Dropdown>)
)
export default BookmarkDropdown
