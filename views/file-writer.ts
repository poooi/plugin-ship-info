// copy from vires/utils/FileWriter.es
// we use outputJson instead of writeFile

import { outputJson } from 'fs-extra'

// A stream of async file writing. `write` queues the task which will be executed
// after all tasks before are done.
// Every instance contains an independent queue.
// Usage:
// var fw = new FileWriter()
// var path = '/path/to/a/file'
// for (var i = 0; i < 100; i++) {
//   fw.write(path, (''+i).repeat(10000))
// }
export default class FileWriter {
  public writing = false

  public _queue: any[] = []

  public write = (
    path: string,
    data: any,
    options?: object,
    callback?: () => void,
  ) => {
    this._queue.push([path, data, options, callback])
    this._continueWriting()
  }

  public _continueWriting = async () => {
    if (this.writing) {
      setTimeout(this._continueWriting, 100) // FIXME: is this necessary ?
      return
    }
    this.writing = true
    while (this._queue.length) {
      const [path, data, options, callback] = this._queue.shift()
      // eslint-disable-next-line no-await-in-loop
      const err = await outputJson(path, data, options)
      if (callback) {
        callback(err)
      }
    }
    this.writing = false
  }
}
