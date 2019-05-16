declare module 'redux-observers' {
  export function observe(store: object, observers: any, options: any): () => void

  export function observer(mapper: () => any, dispatcher: (...params: any[]) => void, locals?: any): any
}
