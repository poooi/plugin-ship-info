export const PLUGIN_KEY = 'poi-plugin-ship-info'

export const reducer = (state = {}, action) => {
  const { type, bookmark, settings } = action
  switch (type) {
  case '@@poi-plugin-ship-info@update':
    return {
      ...state,
      [bookmark]: {
        ...settings,
        name: bookmark,
      },
    }
  }
  return state
}

// actions
export const onUpdate = ({ bookmark, settings }) => ({
  type: '@@poi-plugin-ship-info@update',
  bookmark,
  settings,
})
