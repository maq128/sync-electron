import { CreateRootNode, CreateDirNode } from './Node.js'
import { ebus } from '../EventBus.js'

class CompareRunner {
  sofar = 0
  total = 1

  async recursiveCompare(pathA, pathB, ctx) {
    var mapA = await native.readDir(pathA)
    var mapB = await native.readDir(pathB)
    var abRecur = []
    // 遍历 A，跟 B 比较
    Object.keys(mapA).forEach(name => {
      var infoA = mapA[name]
      var infoB = mapB[name]
      if (!infoB) {
        // 仅在 A 中存在
        ctx.aOnly.addChildNode(name, infoA.isDir, node => {
          if (infoA.isDir) {
            node.setLoading(infoA.fullpath)
          } else {
            node.a_mtime = infoA.mtime
          }
        })

      } else {
        // B 中也存在
        if (infoA.isDir && infoB.isDir) {
          // A 和 B 中存在同名的文件夹
          abRecur.push(name)

        } else if (!infoA.isDir && !infoB.isDir) {
          // A 和 B 中存在同名的文件

          // 相同文件的修改时间可能存在不到 5 秒钟的误差
          var diff = infoA.mtime - infoB.mtime
          if (infoA.size == infoB.size && -5 < diff && diff < 5) {
            // 相同的文件（文件大小相同，且最后修改时间相差不超过 5 秒钟）
            ctx.abSame.addFileNode(name, node => {
              node.a_mtime = infoA.mtime
              node.b_mtime = infoB.mtime
            })
          } else if (diff > 0) {
            // A 中的文件较新
            ctx.aNewer.addFileNode(name, node => {
              node.a_mtime = infoA.mtime
              node.b_mtime = infoB.mtime
            })
          } else {
            // B 中的文件较新
            ctx.bNewer.addFileNode(name, node => {
              node.a_mtime = infoA.mtime
              node.b_mtime = infoB.mtime
            })
          }

        } else {
          // 因为类型不同（一个是文件，一个是文件夹），所以在 A 和 B 中都是独立的存在
          ctx.aOnly.addChildNode(name, infoA.isDir, node => {
            if (infoA.isDir) {
              node.setLoading(infoA.fullpath)
            } else {
              node.a_mtime = infoA.mtime
              node.b_mtime = infoB.mtime
            }
          })
          ctx.bOnly.addChildNode(name, infoB.isDir, node => {
            if (infoB.isDir) {
              node.setLoading(infoB.fullpath)
            } else {
              node.a_mtime = infoA.mtime
              node.b_mtime = infoB.mtime
            }
          })
        }

        // 清除 B 中的记录
        delete mapB[name]
      }
    })

    // B 中剩余的
    Object.keys(mapB).forEach(name => {
      var infoB = mapB[name]
      ctx.bOnly.addChildNode(name, infoB.isDir, node => {
        if (infoB.isDir) {
          node.setLoading(infoB.fullpath)
        } else {
          node.b_mtime = infoB.mtime
        }
      })
    })

    this.sofar ++
    this.total += abRecur.length
    ebus.emit('compare-progress', {sofar:this.sofar, total:this.total})

    // 递归处理同名的文件夹
    for (var i=0; i < abRecur.length; i++) {
      var name = abRecur[i]
      var pathAChild = native.pathJoin(pathA, name)
      var pathBChild = native.pathJoin(pathB, name)
      var ctxChild = {
        aOnly: CreateDirNode(name, ctx.aOnly),
        aNewer: CreateDirNode(name, ctx.aNewer),
        abSame: CreateDirNode(name, ctx.abSame),
        bNewer: CreateDirNode(name, ctx.bNewer),
        bOnly: CreateDirNode(name, ctx.bOnly),
      }
      await this.recursiveCompare(pathAChild, pathBChild, ctxChild)
      if (!ctxChild.aOnly.isEmpty()) ctx.aOnly.addChildDir(ctxChild.aOnly)
      if (!ctxChild.aNewer.isEmpty()) ctx.aNewer.addChildDir(ctxChild.aNewer)
      if (!ctxChild.abSame.isEmpty()) ctx.abSame.addChildDir(ctxChild.abSame)
      if (!ctxChild.bNewer.isEmpty()) ctx.bNewer.addChildDir(ctxChild.bNewer)
      if (!ctxChild.bOnly.isEmpty()) ctx.bOnly.addChildDir(ctxChild.bOnly)
    }
  }
}

export async function Compare(a, b) {
  var runner = new CompareRunner()
  ebus.emit('compare-start', { a, b })
  try {
    var ctx = {
      aOnly: CreateRootNode('A中独有'),
      aNewer: CreateRootNode('A中较新'),
      abSame: CreateRootNode('两边相同'),
      bNewer: CreateRootNode('B中较新'),
      bOnly: CreateRootNode('B中独有'),
    }
    await runner.recursiveCompare(a, b, ctx)
    ctx.aOnly.sort()
    ctx.aNewer.sort()
    ctx.abSame.sort()
    ctx.bNewer.sort()
    ctx.bOnly.sort()
    ebus.emit('compare-finished', ctx)
  } catch(err) {
    ebus.emit('compare-finished', {
      err: '比对操作发生错误，请检查连接参数。'
    })
  }
  return ctx
}
