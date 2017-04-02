import React, { Component } from 'react'
import { Dropdown, MenuItem, FormControl, Button } from 'react-bootstrap'
import Fuse from 'fuse.js'
import { connect } from 'react-redux'
import { values } from 'lodash'

import { extensionSelectorFactory } from 'views/utils/selectors'

import { onUpdate, PLUGIN_KEY } from '../redux'

const { __ } = window

// const bookmarks = ['test', 'foo', 'bar']

const BookmarkItem = ({ eventKey, onSelect, onClick, children }) =>
  (
    <MenuItem eventKey={eventKey} onSelect={onSelect}>
      {
        children
      }
      <Button onClick={onClick}>Remove</Button>
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

  componentWillReceiveProps = (nextProps) => {
    const bookmarks = values(nextProps.bookmarks)
    this.fuse.set(bookmarks)
    console.log(nextProps.bookmarks, bookmarks, this.fuse.list)
  }

  onSelect = (eventKey = this.state.query, e) => { 
    console.log(eventKey)
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

  onClick = (e) => {
    e.stopPropagation()
    console.log(e)
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
        <FormControl
          type="text"
          value={query}
          placeholder={__('Search or create a bookmark')}
          onChange={this.handleInput}
        />

        <MenuItem divider />
        {
          React.Children.toArray(children)
            .filter(child => result.includes(child.props.eventKey))
            .map(child => React.cloneElement(child, {
              onSelect: this.onSelect,
              onClick: this.onClick,
            }))
        }
        {
          query.length > 0 &&
          <MenuItem onSelect={this.onCreateOrOverwrite}>
            {__('Create or overwrite %s', query)}
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
