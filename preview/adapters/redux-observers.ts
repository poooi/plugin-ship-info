// Host-provided redux-observers boundary. The plugin no longer drives
// persistence through observers (the lifecycle subscribes with plain Redux),
// but UI modules may still import this module; keep it structurally correct.

export const observe = (
  _store: unknown,
  _observers: unknown,
  _options?: unknown,
) => () => undefined

export const observer = (
  mapper: unknown,
  dispatcher: unknown,
  locals?: unknown,
) => ({ dispatcher, locals, mapper })
