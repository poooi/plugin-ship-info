// copy from vires/utils/FileWriter.es
// we use outputJson instead of writeFile

import { outputJson } from 'fs-extra'

export type WriteCallback = (error?: unknown) => void

interface QueuedWrite {
  callback?: WriteCallback
  data: unknown
  options?: object
  path: string
}

// A stream of async file writing. `write` queues the task which will be
// executed after all tasks before are done.
// Every instance contains an independent queue.
// A rejected write is reported through its callback (or dropped when there is
// none) and never stops the queue: the next queued write still runs, and
// `writing` is always reset, so the writer can never get stuck.
// Usage:
// var fw = new FileWriter()
// var path = '/path/to/a/file'
// for (var i = 0; i < 100; i++) {
//   fw.write(path, (''+i).repeat(10000))
// }
export default class FileWriter {
  public writing = false

  public _queue: QueuedWrite[] = []

  private _draining = false

  private _drainWaiters: Array<() => void> = []

  /**
   * Resolves once every write queued so far has settled (success or rejection).
   * Callers that must not observe a half-written file (e.g. a reload) await
   * this instead of hoping the previous save has finished.
   */
  public drain = (): Promise<void> => {
    if (!this._draining && this._queue.length === 0) {
      return Promise.resolve()
    }
    if (!this._draining) {
      void this._continueWriting()
    }
    return new Promise<void>((resolve) => {
      this._drainWaiters.push(resolve)
    })
  }

  public write = (
    path: string,
    data: unknown,
    options?: object,
    callback?: WriteCallback,
  ): void => {
    this._queue.push({ callback, data, options, path })
    void this._continueWriting()
  }

  public _continueWriting = async (): Promise<void> => {
    if (this._draining) {
      return
    }
    this._draining = true
    this.writing = true
    try {
      while (this._queue.length > 0) {
        const { callback, data, options, path } = this._queue.shift()!
        let error: unknown
        try {
          // eslint-disable-next-line no-await-in-loop
          await outputJson(path, data, options)
        } catch (e) {
          error = e
        }
        if (callback) {
          try {
            callback(error)
          } catch (callbackError) {
            // A throwing callback must not strand the rest of the queue or
            // surface as an unhandled rejection from `_continueWriting`.
            console.error(
              callbackError instanceof Error
                ? callbackError.stack
                : callbackError,
            )
          }
        }
      }
    } finally {
      this._draining = false
      this.writing = false
      const waiters = this._drainWaiters
      this._drainWaiters = []
      for (const resolve of waiters) {
        resolve()
      }
    }
  }
}
