<template>
  <el-input v-model="config.a" placeholder="文件夹A" readonly>
    <template #prepend>A</template>
    <template #append>
      <el-button type="primary" class="btn-reset-primary" @click="onChooseLocal('a')">
        <el-icon><coin /></el-icon> 本地文件夹
      </el-button>
      <span>&nbsp;</span>
      <el-button type="primary" class="btn-reset-primary btn-reset-primary-2" @click="onChooseSsh('a')">
        <el-icon><monitor /></el-icon> 远程ssh
      </el-button>
    </template>
  </el-input>

  <el-input v-model="config.b" placeholder="文件夹B" readonly>
    <template #prepend>B</template>
    <template #append>
      <el-button type="primary" class="btn-reset-primary" @click="onChooseLocal('b')">
        <el-icon><coin /></el-icon> 本地文件夹
      </el-button>
      <span>&nbsp;</span>
      <el-button type="primary" class="btn-reset-primary btn-reset-primary-2" @click="onChooseSsh('b')">
        <el-icon><monitor /></el-icon> 远程ssh
      </el-button>
    </template>
  </el-input>

  <div class="c-item">
    <el-button class="btn-save-pair" @click="onSavePair" :disabled="!canSavePair">
      <el-icon><notebook /></el-icon> 保存记录
    </el-button>

    <el-button type="primary" @click="onCompare()" :disabled="!config.a || !config.b">
      <el-icon><search /></el-icon> 比对
    </el-button>
  </div>

  <div class="c-list">
    <div class="c-item" v-for="(pair, idx) in config.c">
      <el-button class="btn-use-pair" @click="onUsePair(idx)">
        A: {{ pair.a }}
        <br/>
        B: {{ pair.b }}
      </el-button>
      <el-button class="btn-remove-pair" type="danger" icon="Remove" @click="onRemovePair(idx)">
      </el-button>
    </div>
  </div>
</template>

<script>
import { Compare } from './CompareRunner.js'
import SshConnDialog from './SshConnDialog.vue'
import SshCredDialog from './SshCredDialog.vue'
const FILENAME_CONFIG = 'sync-config.json'
export default {
  data() {
    return {
      config: {
        a: '',
        b: '',
        c: [],
      },
    }
  },

  mounted() {
    this.loadConfig()
    this.$ebus.on('compare-finished', result => {
      if (result && result.err) {
        this.$message.warning(result.err)
      }
    })
  },

  computed: {
    canSavePair() {
      if (!this.config.a) return false
      if (!this.config.b) return false
      if (this.config.c.some(pair => {
        if (pair.a != this.config.a) return false
        if (pair.b != this.config.b) return false
        return true
      })) return false
      return true
    }
  },

  methods: {
    async loadConfig() {
      var json = await native.loadFile(FILENAME_CONFIG).catch(err => {
        return '{"a":"","b":"","c":[]}'
      })
      this.config = JSON.parse(json)
    },

    async saveConfig() {
      var json = JSON.stringify(this.config, null, '  ')
      await native.saveFile(FILENAME_CONFIG, json)
    },

    onChooseLocal(name) {
      native.chooseDir().then(dir => {
        if (dir) {
          this.config[name] = dir
          this.saveConfig()
        }
      })
    },

    onChooseSsh(name) {
      SshConnDialog.showModal(this.config[name]).then(result => {
        if (result) {
          this.config[name] = result
        }
      })
    },

    onSavePair() {
      this.config.c.unshift({
        a: this.config.a,
        b: this.config.b,
      })
      this.saveConfig()
    },

    onUsePair(idx) {
      this.config.a = this.config.c[idx].a
      this.config.b = this.config.c[idx].b
      this.saveConfig()
    },

    onRemovePair(idx) {
      this.config.c.splice(idx, 1)
      this.saveConfig()
    },

    async onCompare() {
      for (var fullpath of [this.config.a, this.config.b]) {
        if (native.isRemote(fullpath)) {
          var cred = await SshCredDialog.showModal(fullpath)
          if (!cred) return
          native.setRemoteCred(fullpath, cred)
        }
      }
      Compare(this.config.a, this.config.b)
        .catch((err) => {
          console.log(err)
        })
    }
  }
}
</script>

<style scoped>
.el-input {
  padding-top: 0.5em;
}
.c-list {
  flex: 1;
  overflow-y: auto;
}
.c-item {
  box-sizing: border-box;
  width: 100%;
  padding-top: 0.5em;
  padding-right: 0.5em;
  display: flex;
}
.c-item .btn-use-pair {
  flex: 1;
  text-align: left;
  font-size: 9pt;
  padding: 0.2em 0.5em;
}
.c-item .btn-remove-pair {
  font-size: 15pt;
}
.btn-reset-primary {
  background-color: var(--el-button-bg-color) !important;
  color: var(--el-button-text-color) !important;
}
.btn-reset-primary-2 {
  margin-left: 1.5em !important;
}
</style>
