import { ebus } from '../EventBus.js'

const FILENAME_TEMP = 'TMP20210102.~TMP'

class CopyRunner {
  total = 0
  succ = 0
  fail = 0
  direction

  constructor(direction) {
    this.direction = direction
  }

  async copyFile(src, dest, node) {
    var srcFile = native.pathJoin(src, node.title)
    var srcMtime = this.direction == 'ab' ? node.a_mtime : node.b_mtime
    var destFile = native.pathJoin(dest, node.title)
    var destTemp = native.pathJoin(dest, FILENAME_TEMP)
    ebus.emit('copy-progress', { src: srcFile, dest: destFile })
    var promise
    if (native.isRemote(dest)) {
      if (native.isRemote(src)) {
        // remote --> remote
        var tmpFile = native.tmpFile()
        promise = native.getFile(srcFile, tmpFile).then(() => {
          return native.putFile(destTemp, tmpFile)
        }).then(() => {
          tmpFile.removeCallback()
        })
      } else {
        // local --> remote
        promise = native.putFile(destTemp, srcFile)
      }
    } else {
      // remote --> local
      // local  --> local
      promise = native.getFile(srcFile, destTemp)
    }
    return promise.then(() => {
      return native.renameFile(destTemp, destFile)
    }).then(() => {
      if (native.isRemote(src) || native.isRemote(dest)) {
        return native.setMtime(destFile, srcMtime)
      }
    }).then(() => {
      this.succ ++
    }).catch(err => {
      console.log('copyFile:', err)
      this.fail ++
    })
  }

  async recursiveCopy(src, dest, node) {
    // 创建目标文件夹
    await native.createDir(dest)

    // 先复制其中的文件
    for (var i=0; i < node.children.length; i++) {
      var child = node.children[i]
      if (!child.isDir && child.state == 2) {
        this.total ++
        await this.copyFile(src, dest, child)
      }
    }
    // 再递归处理子文件夹
    for (var i=0; i < node.children.length; i++) {
      var child = node.children[i]
      if (child.isDir && child.state > 0) {
        if (child.loading == 0) {
          await child.load()
        }
        var childSrc = native.pathJoin(src, child.title)
        var childDest = native.pathJoin(dest, child.title)
        await this.recursiveCopy(childSrc, childDest, child)
      }
    }
  }
}

export async function Copy(src, dest, node, direction) {
  var runner = new CopyRunner(direction)
  ebus.emit('copy-start', { src, dest })
  try {
    await runner.recursiveCopy(src, dest, node)
    ebus.emit('copy-finished', {
      total: runner.total,
      succ: runner.succ,
      fail: runner.fail,
    })
  } catch(err) {
    ebus.emit('copy-finished', {
      err: '比对操作发生错误，请检查连接参数。'
    })
  }
  return true
}
