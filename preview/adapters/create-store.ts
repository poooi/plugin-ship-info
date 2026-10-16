// Live host store boundary. The decorator points this at the current
// scenario's Redux store, so planner-style modules importing `views/create-store`
// see the same store as the React providers.

export let store: any = undefined

export const setCreateStore = (next: any) => {
  store = next
}
