// copy from vires/utils/FileWriter.es
// we use outputJson instead of writeFile

import { outputJson, ensureDir } from 'fs-extra'
import { dirname } from 'path-extra'

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
  constructor() {
    this.writing = false
    this._queue = []
  }

  write = (path, data, options, callback) => {
    this._queue.push([path, data, options, callback])
    this._continueWriting()
  }

  _continueWriting = async () => {
    if (this.writing) {
      setTimeout(this._continueWriting, 100) // FIXME: is this necessary ?
      return
    }
    this.writing = true
    while (this._queue.length) {
      const [path, data, options, callback] = this._queue.shift()
      const err = await outputJson(path, data, options)
      if (callback) {
        callback(err)
      }
    }
    this.writing = false
  }
}
