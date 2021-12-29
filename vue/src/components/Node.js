class BaseNode {
  title = ''
  state = 0 // 0/1/2 - unchecked/indeterminate/checked
  parent = null

  constructor(title, parent) {
    this.title = title
    this.state = 0
    this.parent = parent
  }

  get isFile() {
    return this instanceof FileNode
  }

  get isDir() {
    return this instanceof DirNode
  }

  getAbspath() {
    var abspath = []
    var node = this
    while (node.parent) {
      abspath.unshift(node.title)
      node = node.parent
    }
    return abspath
  }

  setState(state) {
    this.state = state
    return this
  }

  getJson(pretty) {
    return JSON.stringify(this, (key, value) => {
      if (key === 'parent') return undefined
      return value
    }, pretty)
  }

  toggle() {
    // 确定新的 state
    var state = this.state == 0 ? 2 : 0
    // 自身和下游全部设置为新 state
    var nodes = [this]
    var node
    while (node = nodes.pop()) {
      node.state = state
      if (node.isDir) {
        nodes.push(...node.children)
      }
    }
    // 重新计算上游的 state
    var parent = this.parent
    while (parent) {
      parent.recalcState()
      parent = parent.parent
    }
  }
}

class FileNode extends BaseNode {
  a_mtime = 0
  b_mtime = 0
}

class DirNode extends BaseNode {
  loading = 2 // 0/1/2 - 未加载/加载中/加载完
  fullpath = ''
  children = []

  addFileNode(title, fn) {
    var child = new FileNode(title, this)
    this.children.push(child)
    if (typeof fn === 'function') {
      fn.call(this, child)
    }
    return this
  }

  addDirNode(title, fn) {
    var child = new DirNode(title, this)
    this.children.push(child)
    if (typeof fn === 'function') {
      fn.call(this, child)
    }
    return this
  }

  addChildNode(title, isDir, fn) {
    var child
    if (isDir) child = new DirNode(title, this)
    else child = new FileNode(title, this)
    this.children.push(child)
    if (typeof fn === 'function') {
      fn.call(this, child)
    }
    return this
  }

  addChildDir(child) {
    this.children.push(child)
    child.parent = this
    return this
  }

  isEmpty() {
    return this.children.length == 0
  }

  setDummy() {
    this.dummy = true
    return this
  }

  // 递归对所有子节点进行排序，DirNode 在前
  sort() {
    this.children.sort((a, b) => {
      if (a.isDir != b.isDir) {
        return a.isDir ? -1 : 1
      }
      return a.title < b.title ? -1 : 1
    })
    this.children.forEach(child => {
      if (child.isDir) {
        child.sort()
      }
    })
    return this
  }

  // 根据直接子节点的 state 重新计算自身的 state
  recalcState() {
    var origState = this.state
    var n0 = 0, n2 = 0, nTotal = 0
    this.children.forEach(child => {
      nTotal++
      if (child.state == 0) {
        n0++
      } else if (child.state == 2) {
        n2++
      }
    })
    this.state = n2 == nTotal ? 2 : (n0 == nTotal ? 0 : 1)
    return this.state != origState
  }

  setLoading(fullpath) {
    if (fullpath === false) {
      // 加载完成
      this.loading = 2
      this.sort()
    } else if (fullpath === true) {
      // 加载中
      this.loading = 1
    } else {
      // 待加载
      this.loading = 0
      this.fullpath = fullpath
    }
    return this
  }

  async load() {
    if (this.loading != 0) return

    this.loading = 1
    var state = this.state == 2 ? 2 : 0
    var map = await native.readDir(this.fullpath)
    Object.keys(map).forEach(name => {
      var info = map[name]
      if (info.isDir) {
        this.addDirNode(info.title, node => node.setState(state).setLoading(info.fullpath))
      } else {
        this.addFileNode(info.title, node => {
          node.setState(state)
          // 此处不用准确区分是 a 还是 b，都填上即可
          node.a_mtime = info.mtime
          node.b_mtime = info.mtime
        })
      }
    })
    this.sort()
    this.loading = 2
  }
}

export function CreateRootNode(title) {
  return new DirNode(title)
}

export function CreateDirNode(title, parent) {
  return new DirNode(title, parent)
}
