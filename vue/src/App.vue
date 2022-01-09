<template>
  <el-tabs type="border-card" class="top-tabs" v-model="curTab">
    <el-tab-pane label="首页" name="home"><HomePanel></HomePanel></el-tab-pane>
    <el-tab-pane label="A中独有" name="aOnly"><TreePanel name="aOnly" /></el-tab-pane>
    <el-tab-pane label="A中较新" name="aNewer"><TreePanel name="aNewer" /></el-tab-pane>
    <el-tab-pane label="两边相同" name="abSame"><TreePanel name="abSame" /></el-tab-pane>
    <el-tab-pane label="B中较新" name="bNewer"><TreePanel name="bNewer" /></el-tab-pane>
    <el-tab-pane label="B中独有" name="bOnly"><TreePanel name="bOnly" /></el-tab-pane>
  </el-tabs>
</template>

<script>
import { h } from 'vue'
import HomePanel from './components/HomePanel.vue'
import TreePanel from './components/TreePanel.vue'
export default {
  components: {
    HomePanel,
    TreePanel
  },
  data() {
    return {
      curTab: 'home',
    }
  },
  mounted() {
    var actStartTimestamp = 0
    var getDuration = () => {
      var duration = ''
      var s = Math.floor((new Date().getTime() - actStartTimestamp) / 1000)
      var h = Math.floor(s / 3600)
      if (h > 0) {
        duration += h + '小时'
        s -= h * 3600
      }
      var m = Math.floor(s / 60)
      if (m > 0) {
        duration += m + '分'
        s -= m * 60
      }
      duration += s + '秒'
      return duration
    }

    this.$ebus.on('compare-start', ({ a, b }) => {
      this.loadingMask = this.$loading()
      actStartTimestamp = new Date().getTime()
    })
    this.$ebus.on('compare-progress', ({sofar, total}) => {
      this.loadingMask.setText(`正在比对文件夹: ${sofar}/${total}`)
    })
    this.$ebus.on('compare-finished', result => {
      this.loadingMask.close()

      var names = ['aNewer', 'aOnly', 'bNewer', 'bOnly', 'abSame']
      names.some(name => {
        if (result && result[name] && !result[name].isEmpty()) {
          this.curTab = name
          return true
        }
      })
    })

    this.$ebus.on('copy-start', ({ src, dest }) => {
      this.loadingMask = this.$loading()
      actStartTimestamp = new Date().getTime()
    })
    this.$ebus.on('copy-progress', ({ src, dest }) => {
      this.loadingMask.setText(`正在复制文件: ${src}`)
    })
    this.$ebus.on('copy-finished', result => {
      this.loadingMask.close()

      if (result && result.err) {
        this.$message.warning(result.err)
        return
      }

      if (result) {
        this.$msgbox({
          title: '操作完成',
          message: h('div', null, [
            h('div', null, '总数：' + result.total),
            h('div', null, '成功：' + result.succ),
            h('div', null, '失败：' + result.fail),
            h('div', null, '用时：' + getDuration()),
          ]),
          confirmButtonText: '知道了',
        }).catch(() => {})
      }
    })

    this.$ebus.on('remove-start', ({ src }) => {
      this.loadingMask = this.$loading()
      actStartTimestamp = new Date().getTime()
    })
    this.$ebus.on('remove-progress', ({ src }) => {
      this.loadingMask.setText(`正在删除文件: ${src}`)
    })
    this.$ebus.on('remove-finished', result => {
      this.loadingMask.close()

      if (result && result.err) {
        this.$message.warning(result.err)
        return
      }

      if (result) {
        this.$msgbox({
          title: '操作完成',
          message: h('div', null, [
            h('div', null, '总数：' + result.total),
            h('div', null, '成功：' + result.succ),
            h('div', null, '失败：' + result.fail),
            h('div', null, '用时：' + getDuration()),
          ]),
          confirmButtonText: '知道了',
        }).catch(() => {})
      }
    })

    this.$ebus.on('mtime-start', ({ src }) => {
      this.loadingMask = this.$loading()
      actStartTimestamp = new Date().getTime()
    })
    this.$ebus.on('mtime-progress', ({ src }) => {
      this.loadingMask.setText(`正在重置文件: ${src}`)
    })
    this.$ebus.on('mtime-finished', result => {
      this.loadingMask.close()

      if (result && result.err) {
        this.$message.warning(result.err)
        return
      }

      if (result) {
        this.$msgbox({
          title: '操作完成',
          message: h('div', null, [
            h('div', null, '总数：' + result.total),
            h('div', null, '成功：' + result.succ),
            h('div', null, '失败：' + result.fail),
            h('div', null, '用时：' + getDuration()),
          ]),
          confirmButtonText: '知道了',
        })
      }
    })
  }
}
</script>

<style>
body {
  margin: 0;
}
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
}
html,
body,
#app,
.top-tabs {
  height: 100%;
}
.top-tabs {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}
.top-tabs .el-tabs__content {
  flex: 1;
  padding: 0;
}
.top-tabs .el-tab-pane {
  height: 100%;
  display: flex;
  flex-direction: column;
}
</style>
