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
  case '@@poi-plugin-ship-info@delete': {
    const newState = {}
    Object.keys(state).filter(key => key != bookmark).forEach(key => newState[key] = state[key])
    return newState
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

export const onDelete = ({ bookmark }) => ({
  type: '@@poi-plugin-ship-info@delete',
  bookmark,
})

