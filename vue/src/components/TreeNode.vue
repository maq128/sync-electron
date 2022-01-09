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
      <div class="title" @click="onTitleClick" @contextmenu="onTitleContextMenu">{{ node.title }}</div>
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
    initExpanded: Boolean
  },
  inject: [
    'rootContainer'
  ],
  methods: {
    onTitleClick() {
      if (!this.node.isDir) return
      this.expanded = !this.expanded
      if (this.expanded) {
        this.node.load().catch(err => {
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
