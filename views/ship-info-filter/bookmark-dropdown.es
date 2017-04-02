import React, { Component } from 'react'
import { Dropdown, MenuItem, FormControl } from 'react-bootstrap'
import Fuse from 'fuse.js'

const { __ } = window

const bookmarks = ['test', 'foo', 'bar']

class BookmarkMenu extends Component {
  constructor(props) {
    super(props)
    this.fuse = new Fuse(bookmarks)
    this.state = {
      query: '',
      bookmarks,
    }
  }

  onSelect = (eventKey = this.state.query, _) => {
    console.log(eventKey)
  }

  handleInput = e => this.setState({ query: e.target.value })

  render() {
    const { children } = this.props
    const { query } = this.state

    const result = query.length > 0 ? this.fuse.search(query) : this.state.bookmarks
    console.log(result)
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
            }))
        }
        {
          query.length > 0 &&
          <MenuItem>
            {__('Create or overwrite %s', query)}
          </MenuItem>
        }
      </ul>
    )
  }
}

export default class BookmarkDropdown extends Component {

  render() {
    return (
      <Dropdown id="bookmark">
        <Dropdown.Toggle>
          {__('Bookmarks')}
        </Dropdown.Toggle>
        <BookmarkMenu bsRole="menu">
          {
            bookmarks.map(bookmark =>
              <MenuItem eventKey={bookmark} key={bookmark}>{bookmark}</MenuItem>
            )
          }
        </BookmarkMenu>
      </Dropdown>
    )
  }
}
