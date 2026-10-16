// Host-provided redux-observers boundary. The planner wires real observers; in
// the browser preview they are inert but structurally correct.

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
