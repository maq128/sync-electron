<template>
  <div class="toolbar">
    <el-button
      type="primary"
      plain
      class="btn btn-copy"
      :disabled="btnTextCopy == '' || root.dummy || root.state == 0"
      @click="onBtnCopy"
    >{{ btnTextCopy }}</el-button>

    <div class="sep"></div>

    <el-button
      v-if="showResetMtime"
      type="danger"
      plain
      class="btn btn-reset-mtime"
      :disabled="root.dummy || root.state == 0"
      @click="onBtnResetMtime"
    >重置最后修改时间</el-button>
    <div class="sep" v-if="showResetMtime"></div>

    <el-button
      type="danger"
      plain
      class="btn btn-reverse-copy"
      :disabled="btnTextReverseCopy == '' || root.dummy || root.state == 0"
      @click="onBtnReverseCopy"
    >{{ btnTextReverseCopy }}</el-button>

    <el-button
      type="danger"
      plain
      class="btn btn-remove"
      :disabled="btnTextRemove == '' || root.dummy || root.state == 0"
      @click="onBtnRemove"
    >{{ btnTextRemove }}</el-button>
  </div>
  <TreeNode :node="root" :initExpanded="true" class="tree-node"></TreeNode>
</template>

<script>
import TreeNode from './TreeNode.vue'
import { CreateRootNode } from './Node.js'
import { Copy } from './CopyRunner.js'
import { Remove } from './RemoveRunner.js'
import { ResetMtime } from './MtimeRunner.js'
export default {
  components: {
    TreeNode
  },
  data() {
    return {
      a: '',
      b: '',
      root: CreateRootNode('尚未比对').setDummy(),
      btnTextCopy: '复制',
      btnTextReverseCopy: '反向复制',
      btnTextRemove: '删除',
      showResetMtime: false,
    }
  },
  props: {
    name: String
  },
  provide() {
    return { rootContainer: this }
  },
  mounted() {
    native.getCommandLineArgv().then(argv => {
      for (var arg of argv) {
        if (arg == '--enable-reset-mtime') {
          this.showResetMtime = (this.name == 'aNewer' || this.name == 'bNewer')
        }
      }
    })
    if (this.name == 'aOnly') {
      this.btnTextCopy = '复制 A►►B'
      this.btnTextReverseCopy = ''
      this.btnTextRemove = '删除'
    } else if (this.name == 'aNewer') {
      this.btnTextCopy = '复制 A►►B'
      this.btnTextReverseCopy = 'A◄◄B 反向复制'
      this.btnTextRemove = ''
    } else if (this.name == 'bNewer') {
      this.btnTextCopy = '复制 A◄◄B'
      this.btnTextReverseCopy = 'A►►B 反向复制'
      this.btnTextRemove = ''
    } else if (this.name == 'bOnly') {
      this.btnTextCopy = '复制 A◄◄B'
      this.btnTextReverseCopy = ''
      this.btnTextRemove = '删除'
    } else {
      this.btnTextCopy = ''
      this.btnTextReverseCopy = ''
      this.btnTextRemove = ''
    }
    this.$ebus.on('compare-start', ({ a, b }) => {
      this.a = a
      this.b = b
      this.root = CreateRootNode('比对中...').setDummy()
    })
    this.$ebus.on('compare-finished', result => {
      if (result && result[this.name]) {
        this.root = result[this.name]
      }
    })
  },
  methods: {
    onBtnCopy() {
      new Promise(() => {
        if (this.name == 'aOnly') {
          return Copy(this.a, this.b, this.root, 'ab')
        } else if (this.name == 'aNewer') {
          return Copy(this.a, this.b, this.root, 'ab')
        } else if (this.name == 'bNewer') {
          return Copy(this.b, this.a, this.root, 'ba')
        } else if (this.name == 'bOnly') {
          return Copy(this.b, this.a, this.root, 'ba')
        }
      }).then(() => {
        this.root.setDummy()
      })
    },

    onBtnReverseCopy() {
      var target = this.name[0].toUpperCase()
      this.$confirm(target + ' 中的文件较新，确定要用旧文件覆盖新文件吗？', '反向复制', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }).then(() => {
        if (this.name == 'aNewer') {
          return Copy(this.b, this.a, this.root, 'ba')
        } else if (this.name == 'bNewer') {
          return Copy(this.a, this.b, this.root, 'ab')
        }
        return false
      }).then(done => {
        if (done) this.root.setDummy()
      }).catch(() => {})
    },

    onBtnRemove() {
      var target = this.name[0].toUpperCase()
      this.$confirm('这些文件仅在 ' + target + ' 中存在，确定删除吗？', '删除', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }).then(() => {
        if (this.name == 'aOnly') {
          return Remove(this.a, this.root)
        } else if (this.name == 'bOnly') {
          return Remove(this.b, this.root)
        }
      }).then(done => {
        if (done) this.root.setDummy()
      }).catch(() => {})
    },

    onBtnResetMtime() {
      var target = this.name[0].toUpperCase()
      this.$confirm(
        '这些文件在 ' + target + ' 中的最后修改时间比较新，确定要重置为比较旧的时间吗？',
        '重置最后修改时间',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        }
      ).then(() => {
        if (this.name == 'aNewer') {
          return ResetMtime(this.a, this.root, 'ba')
        } else if (this.name == 'bNewer') {
          return ResetMtime(this.b, this.root, 'ab')
        }
      }).then(done => {
        if (done) this.root.setDummy()
      }).catch(() => {})
    },
  }
}
</script>

<style scoped>
.toolbar {
  display: flex;
  margin: 0.5em;
}
.toolbar .btn {
  padding: 0.2em 0.5em;
  min-height: 1.8em;
}
.toolbar .btn-copy {
  min-width: 8em;
}
.toolbar .btn-reverse-copy {
  min-width: 10em;
}
.toolbar .btn-remove {
  min-width: 4em;
}
.toolbar .sep {
  flex: 1;
}
.tree-node {
  flex: 1;
  overflow-y: auto;
}
</style>
