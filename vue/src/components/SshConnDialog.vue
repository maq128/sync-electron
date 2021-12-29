<template>
  <el-dialog v-model="visible" title="远程 ssh" @close="onDialogClose">
    <el-form>
      <el-input class="dlg-input" v-model="host" placeholder="远程主机的域名或 IP 地址" @input="host=restrictHost(host)">
        <template #prepend>主机</template>
      </el-input>
      <el-input class="dlg-input" v-model="port" placeholder="远程主机的 ssh 端口" @input="port=restrictPort(port)">
        <template #prepend>端口</template>
      </el-input>
      <el-input class="dlg-input" v-model="path" placeholder="远程主机上的文件夹路径" @input="path=restrictPath(path)">
        <template #prepend>路径</template>
      </el-input>
    </el-form>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="visible=false">取消</el-button>
        <el-button type="primary" @click="ok=true; visible=false" :disabled="!canSave">确定</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script>
import { createApp } from 'vue'
import ElementPlus from 'element-plus'
export default {
  data() {
    return {
      visible: false,
      ok: false,
      host: '',
      port: 22,
      path: '/home/user',
    }
  },

  computed: {
    canSave() {
      if (!this.host) return false
      if (!this.port) return false
      if (!this.path) return false
      return true
    }
  },

  methods: {
    restrictHost(value) {
      value = value.replace(/[^0-9a-zA-Z\.\-\_]/ig, '')
      return value
    },

    restrictPort(value) {
      value = value.replace(/[^0-9]/ig, '')
      return value
    },

    restrictPath(value) {
      if (!value.startsWith('/')) {
        value = '/' + value
      }
      return value
    },

    onDialogClose() {
      if (this.ok) {
        var fullpath = 'ssh:' + this.host + ':' + this.port + this.path
        this.onClose(fullpath)
      } else {
        this.onClose(null)
      }
    }
  },

  mounted() {
    this.visible = true
    this.ok = false
    this.host = ''
    this.port = 22
    this.path = '/home/user'
    var m = this.fullpath.match(/^ssh:(.+):([0-9]+)(\/.*)/)
    if (m && m.length == 4) {
      this.host = m[1]
      this.port = m[2]
      this.path = m[3]
    }
  },

  inject: [
    'fullpath',
    'onClose',
  ],

  showModal(fullpath) {
    return new Promise((resolve) => {
      var dlg = document.createElement('div')
      document.body.appendChild(dlg)
      var app = createApp(this)
        .use(ElementPlus)
        .provide('fullpath', fullpath)
        .provide('onClose', result => {
          resolve(result)
          app.unmount()
          dlg.remove()
        })
      app.mount(dlg)
    })
  }
}
</script>

<style scoped>
.dlg-input {
  margin-bottom: 0.5em;
}
</style>
