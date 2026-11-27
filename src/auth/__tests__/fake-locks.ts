/** Serialises callbacks per name like the browser Web Locks API, which jsdom lacks. */
export function fakeLocks() {
  const queues = new Map<string, Promise<unknown>>()
  return {
    request: (name: string, task: () => Promise<unknown>) => {
      const result = (queues.get(name) ?? Promise.resolve()).then(task)
      queues.set(
        name,
        result.catch(() => undefined),
      )
      return result
    },
  }
}
