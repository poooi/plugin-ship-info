import React, { Component } from 'react'
import { Dropdown, MenuItem, FormControl, Button, Label } from 'react-bootstrap'
import Fuse from 'fuse.js'
import { connect } from 'react-redux'
import { values } from 'lodash'
import FontAwesome from 'react-fontawesome'
import { observe } from 'redux-observers'

import { extensionSelectorFactory } from 'views/utils/selectors'

import { onUpdate, onDelete, PLUGIN_KEY, bookmarksObserver } from '../redux'

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

const BookmarkMenu = connect(
  state => ({
    bookmarks: extensionSelectorFactory(PLUGIN_KEY)(state),
  })
)(class BookmarkMenu extends Component {
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

  componentDidMount = () => {
    this.unsubsribeObserver = observe(window.store, [bookmarksObserver])
  }

  componentWillUnmount = () => {
    if (this.unsubsribeObserver) {
      this.unsubsribeObserver()
    }
  }

  componentWillReceiveProps = (nextProps) => {
    const bookmarks = values(nextProps.bookmarks)
    this.fuse.set(bookmarks)
    console.log(nextProps.bookmarks, bookmarks, this.fuse.list)
  }

  onSelect = (eventKey = this.state.query, e) => {
    const settings = this.props.bookmarks[eventKey] || {}
    settings.bounds = config.get('plugin.ShipInfo.bounds')
    config.set('plugin.ShipInfo', settings)
  }

  onCreateOrOverwrite = () => {
    const settings = config.get('plugin.ShipInfo')
    delete settings.bounds
    console.log(this.state.query)
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
        .map(([key, value]) => value)
        .map(value => value.name)
      : Object.keys(this.props.bookmarks)
    console.log(query, result, this.fuse.search(query))
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
          React.Children.toArray(children)
            .filter(child => result.includes(child.props.eventKey))
            .map(child => React.cloneElement(child, {
              onSelect: this.onSelect,
              onClick: this.onClickDelete(child.props.eventKey),
            }))
        }
        {
          query.length > 0 &&
          <MenuItem onSelect={this.onCreateOrOverwrite}>
            <span className="bookmark-content">
              {result.includes(query) ? __('Overwrite ') : __('Create ') }
              <Label bsStyle="primary" className="query-label">{query}</Label>
            </span>
          </MenuItem>
        }
      </ul>
    )
  }
})

const BookmarkDropdown = connect(
  state => ({
    bookmarks: extensionSelectorFactory(PLUGIN_KEY)(state),
  })
)(({ bookmarks }) =>
  (<Dropdown id="bookmark">
    <Dropdown.Toggle>
      {__('Bookmarks')}
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
