import { ebus } from '../EventBus.js'

class MtimeRunner {
  total = 0
  succ = 0
  fail = 0
  direction

  constructor(direction) {
    this.direction = direction
  }

  async recursiveResetMtime(src, node) {
    // 先处理其中的文件
    for (var i=0; i < node.children.length; i++) {
      var child = node.children[i]
      if (!child.isDir && child.state == 2) {
        this.total ++
        var childFile = native.pathJoin(src, child.title)
        var mtime = this.direction == 'ab' ? child.a_mtime : child.b_mtime
        native.setMtime(childFile, mtime + 1)
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
        await this.recursiveResetMtime(childSrc, child)
      }
    }
  }
}

export async function ResetMtime(src, node, direction) {
  var runner = new MtimeRunner(direction)
  ebus.emit('mtime-start', { src })
  await runner.recursiveResetMtime(src, node)
  ebus.emit('mtime-finished', {
    total: runner.total,
    succ: runner.succ,
    fail: runner.fail,
  })
  return true
}
