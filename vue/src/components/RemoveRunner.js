import { ebus } from '../EventBus.js'

class RemoveRunner {
  total = 0
  succ = 0
  fail = 0

  async recursiveRemove(src, node) {
    // 先删除所有文件
    for (var i=0; i < node.children.length; i++) {
      var child = node.children[i]
      if (!child.isDir && child.state == 2) {
        // 删除文件
        this.total ++
        var childSrc = native.pathJoin(src, child.title)
        ebus.emit('remove-progress', { src: childSrc })
        await native.removeFile(childSrc)
          .then(() => {
            this.succ ++
          })
          .catch(() => {
            this.fail ++
          })
      }
    }
    // 再处理所有文件夹
    for (var i=0; i < node.children.length; i++) {
      var child = node.children[i]
      if (!child.isDir) continue
      var childSrc = native.pathJoin(src, child.title)
      if (child.loading == 0 && child.state == 2) {
        // 删除整个文件夹
        this.total ++
        ebus.emit('remove-progress', { src: childSrc })
        await native.removeDirForce(childSrc)
          .then(() => {
            this.succ ++
          })
          .catch(() => {
            this.fail ++
          })
      } else if (child.state > 0) {
        // 递归
        if (child.loading == 0) {
          await child.load()
        }
        await this.recursiveRemove(childSrc, child)
        if (child.state == 2) {
          // 尝试删除空文件夹
          await native.removeDir(childSrc).catch(() => {})
        }
      }
    }
  }
}

export async function Remove(src, node) {
  var runner = new RemoveRunner()
  ebus.emit('remove-start', { src })
  await runner.recursiveRemove(src, node)
  ebus.emit('remove-finished', {
    total: runner.total,
    succ: runner.succ,
    fail: runner.fail,
  })
  return true
}
