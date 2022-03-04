<template>
  <div>
    <div :class="{ node: true, dir: node.isDir, file: node.isFile, expanded: expanded }">
      <input
         type="checkbox"
         class="cb"
         :checked="node.state > 0"
         :indeterminate="node.state == 1"
         @click.prevent="onCheckboxClick"
      />
      <div class="title" @click="onTitleClick" @contextmenu="onTitleContextMenu" :style="{backgroundImage:node.fileIcon}">{{ node.title }}</div>
    </div>
    <div class="dir-children" v-if="node.isDir" v-show="expanded">
      <TreeNode v-if="node.loading==2" v-for="child in node.children" :node="child"></TreeNode>
      <div v-if="node.loading < 2" class="loading">
        <el-icon><loading /></el-icon>
        <span>{{ node.fullpath }}</span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      expanded: !!this.initExpanded
    }
  },
  props: {
    node: Object,
    initExpanded: Boolean,
  },
  inject: [
    'rootContainer'
  ],
  updated() {
    // 对于非根节点不做任何处理
    if (this.node.parent) return
    // 因为数据已经更新，所以需要重新加载子节点图标
    this.childrenIconsLoaded = false
    this.loadChildrenIcons()
  },
  methods: {
    async loadChildrenIcons() {
      // 避免重复加载
      if (this.childrenIconsLoaded) return
      this.childrenIconsLoaded = true
      // 从 a 和 b 中挑选一个本地文件夹
      var prefix = !native.isRemote(this.rootContainer.a)
        ? this.rootContainer.a
        : !native.isRemote(this.rootContainer.b) ? this.rootContainer.b : undefined
      if (!prefix) return
      // 加载每个子节点的文件图标
      for (var child of this.node.children) {
        if (child.isDir) continue
        var abspath = child.getAbspath()
        var fullpath = native.pathJoin(prefix, ...abspath)
        await native.getFileIcon(fullpath).then(dataUrl => {
          child.fileIcon = `url('${dataUrl}')`
        })
      }
    },
    onTitleClick() {
      if (!this.node.isDir) return
      this.expanded = !this.expanded
      if (this.expanded) {
        this.node.load()
          .then(() => {
            this.loadChildrenIcons()
          })
          .catch(err => {
            this.$message.warning(err.message)
            this.expanded = false
            this.node.loading = 0
          })
      }
    },
    onTitleContextMenu() {
      native.showContextMenu({
        a: this.rootContainer.a,
        b: this.rootContainer.b,
        abspath: this.node.getAbspath(),
      })
    },
    onCheckboxClick() {
      window.setTimeout(() => {
        this.node.toggle()
      }, 0)
    }
  }
}
</script>

<style scoped>
.node {
  white-space: nowrap;
}
.node:hover {
  background-color: #eee;
}
.node * {
  display: inline-block;
  vertical-align: middle;
  vertical-align: middle;
}
.title {
  padding: 2px 0px;
  text-indent: 20px;
  background-image: url(../assets/folder_close.png);
  background-position: center left;
  background-repeat: no-repeat;
  cursor: pointer;
  font-size: 9pt;
}
.file .title {
  background-image: url(../assets/file.png);
  cursor: default;
}
.dir.expanded .title {
  background-image: url(../assets/folder_open.png);
}
.cb {
  cursor: pointer;
  position:relative;
}
.cb:indeterminate:after {
  position:absolute;
  left:0px;
  top:0px;
  width:100%;
  height:100%;
  border-radius:3px;
  content: '▢';
  color: white;
  background-color:#57a4ff;
  font-size: 13px;
  line-height:13px;
  text-align:center;
  vertical-align:middle;
}
.dir-children {
  padding-left: 20px;
}
.loading i {
  vertical-align: middle;
}
.loading span {
  font-size: 9pt;
}
</style>
