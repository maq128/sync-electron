<template>
  <el-dialog v-model="visible" title="ssh 登录" @close="onDialogClose">
    <el-form>
      <el-input class="dlg-input" v-model="service" readonly>
        <template #prepend>远程主机</template>
      </el-input>
      <el-input class="dlg-input" v-model="username">
        <template #prepend>登录帐号</template>
      </el-input>
      <el-input class="dlg-input" v-model="password" type="password" show-password>
        <template #prepend>登录密码</template>
      </el-input>
    </el-form>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="visible=false">取消</el-button>
        <el-button type="primary" @click="ok=true; visible=false">确定</el-button>
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
      service: '',
      username: '',
      password: '',
    }
  },

  methods: {
    onDialogClose() {
      if (this.ok) {
        // 保存到凭据管理器
        native.keytar.setPassword(this.service, this.username, this.password)
        this.onClose({
          username: this.username,
          password: this.password,
        })
      } else {
        this.onClose(null)
      }
    }
  },

  async mounted() {
    var m = this.fullpath.match(/^ssh:(.+:[0-9]+)(\/.*)/)
    if (!m || m.length != 3) {
      this.onClose(null)
      return
    }

    this.visible = true
    this.ok = false
    this.service = m[1]

    // 尝试从凭据管理器取出保存的密码
    var arr = await native.keytar.findCredentials(this.service)
    if (arr && arr.length > 0) {
      this.username = arr[0].account
      this.password = arr[0].password
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
  },
}
</script>

<style scoped>
.dlg-input {
  margin-bottom: 0.5em;
}
</style>
