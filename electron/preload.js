const { contextBridge, ipcRenderer } = require('electron')
const { readdir, readFile, writeFile, mkdir, copyFile, utimes, rename, rm, rmdir } = require('fs/promises')
const { lstatSync } = require('fs')
const path = require('path')
const { Client } = require('ssh2');
const tmp = require('tmp')
const keytar = require('keytar')

function sshCrackFullpath(fullpath) {
  var m = fullpath.match(/^(ssh:(.+):([0-9]+))(\/.*)/)
  if (m && m.length == 5) {
    return {
      prefix: m[1],
      host: m[2],
      port: m[3],
      abspath: m[4],
    }
  }
  return {}
}

const sshCredCache = {}

const SshConnCache = {
  cache: {},
  busy: false,

  async get(fullpath, returnClient) {
    var { prefix, host, port } = sshCrackFullpath(fullpath)
    var conn = this.cache[prefix] || {}
    conn.ts = new Date().getTime()
    if (conn.client && returnClient) return conn.client
    if (conn.sftp) return conn.sftp

    var cred = sshCredCache[prefix] || {}

    return new Promise((resolve, reject) => {
      var client = new Client()
      client.on('ready', () => {
        client.sftp((err, sftp) => {
          if (err) {
            reject(err)
            return
          }
          this.cache[prefix] = {
            client,
            sftp,
            ts: new Date().getTime()
          }
          resolve(returnClient ? client : sftp)
        })
      })
      .on('error', (err) => {
        reject(err)
      })
      .connect({
        host: host,
        port: port,
        username: cred.username,
        password: cred.password,
      })
    })
  },

  newPromise(executor) {
    this.busy = true
    var promise = new Promise(executor)
    promise.then(() => {
      this.busy = false
    }).catch(() => {})
    return promise
  },

  startFlushWorker() {
    setInterval(() => {
      if (this.busy) return
      for (var prefix of Object.keys(this.cache)) {
        var conn = this.cache[prefix]
        if (conn.ts + 30000 < new Date().getTime()) {
          conn.client.end()
          delete this.cache[prefix]
        }
      }
    }, 5000)
  },
}
SshConnCache.startFlushWorker()

const FsMixin = {
  isRemote(fullpath) {
    var { abspath } = sshCrackFullpath(fullpath)
    return !!abspath
  },

  pathJoin(parent, name) {
    var { abspath } = sshCrackFullpath(parent)
    if (!!abspath) {
      if (!parent.endsWith('/')) parent += '/'
      return parent + name
    }
    return path.join(parent, name)
  },

  async readDir(fullpath) {
    var { abspath } = sshCrackFullpath(fullpath)
    if (!!abspath) {
      return SshConnCache.newPromise((resolve, reject) => {
        SshConnCache.get(fullpath).then(sftp => {
          sftp.readdir(abspath, (err, list) => {
            if (err) {
              reject(err)
              return
            }
            var map = {}
            for (var entry of list) {
              var info = {
                fullpath: FsMixin.pathJoin(fullpath, entry.filename),
                title: entry.filename,
                isDir: entry.longname[0] == 'd'
              }

              // 排除 .DAV 文件夹
              // if (info.isDir && info.title == '.DAV') continue

              if (entry.longname[0] == '-') {
                info.size = entry.attrs.size
                info.mtime = entry.attrs.mtime
              }
              map[info.title] = info
            }
            resolve(map)
          })
        })
      })
    } else {
      return readdir(fullpath, { withFileTypes: true })
        .then(dir => {
          var map = {}
          for (var entry of dir) {
            var info = {
              fullpath: path.join(fullpath, entry.name),
              title: entry.name,
              isDir: entry.isDirectory()
            }
            if (entry.isFile()) {
              var stat = lstatSync(info.fullpath)
              info.size = stat.size
              info.mtime = Math.floor(stat.mtimeMs / 1000)
            }
            map[info.title] = info
          }
          return map
        })
    }
  },

  async createDir(fullpath) {
    var { abspath } = sshCrackFullpath(fullpath)
    if (!!abspath) {
      return SshConnCache.newPromise(resolve => {
        SshConnCache.get(fullpath).then(sftp => {
          sftp.mkdir(abspath, err => {
            if (err) {
              if (err.code == 4) { // err.message: Faliure
                // 若因目标文件夹已经存在而报错，忽略之
                err = undefined
              }
            }
            resolve(err)
          })
        })
      })
    } else {
      // 若因目标文件夹已经存在而报错，忽略之
      return mkdir(fullpath, { recursive: true })
    }
  },

  async putFile(fullpath, local) {
    var { abspath } = sshCrackFullpath(fullpath)
    if (!!abspath) {
      return SshConnCache.newPromise(resolve => {
        SshConnCache.get(fullpath).then(sftp => {
          sftp.fastPut(local, abspath, err => {
            resolve(err)
          })
        })
      })
    } else {
      return copyFile(local, fullpath)
    }
  },

  async getFile(fullpath, local) {
    var { abspath } = sshCrackFullpath(fullpath)
    if (!!abspath) {
      return SshConnCache.newPromise((resolve, reject) => {
        SshConnCache.get(fullpath).then(sftp => {
          sftp.fastGet(abspath, local, err => {
            if (err) {
              reject(err)
            } else {
              resolve()
            }
          })
        })
      })
    } else {
      return copyFile(fullpath, local)
    }
  },

  async setMtime(fullpath, mtime) {
    var { abspath } = sshCrackFullpath(fullpath)
    if (!!abspath) {
      return SshConnCache.newPromise(resolve => {
        SshConnCache.get(fullpath).then(sftp => {
          sftp.utimes(abspath, mtime, mtime, err => {
            resolve(err)
          })
        })
      })
    } else {
      return utimes(fullpath, mtime, mtime)
    }
  },

  async renameFile(from, to) {
    var { abspath:fromPath } = sshCrackFullpath(from)
    var { abspath:toPath } = sshCrackFullpath(to)
    if (!!fromPath) {
      return SshConnCache.newPromise(resolve => {
        // 若目标文件已经存在则会被替换掉
        SshConnCache.get(from).then(sftp => {
          sftp.ext_openssh_rename(fromPath, toPath, err => {
            resolve(err)
          })
        })
      })
    } else {
      // 若目标文件已经存在则会被替换掉
      return rename(from, to)
    }
  },

  async removeFile(fullpath) {
    var { abspath } = sshCrackFullpath(fullpath)
    if (!!abspath) {
      return SshConnCache.newPromise(resolve => {
        SshConnCache.get(fullpath).then(sftp => {
          console.log('sftp.unlink(', abspath, ')')
          sftp.unlink(abspath, err => {
            resolve(err)
          })
        })
      })
    } else {
      // 若因目标文件不存在而报错，忽略之
      return rm(fullpath, { force: true })
    }
  },

  // 强制删除整个文件夹
  async removeDirForce(fullpath) {
    var { abspath } = sshCrackFullpath(fullpath)
    if (!!abspath) {
      return SshConnCache.newPromise(resolve => {
        SshConnCache.get(fullpath, true).then(client => {
          console.log('rm -rf \'' + abspath + '\'')
          client.exec('rm -rf \'' + abspath + '\'', (err, stream) => {
            if (err) {
              console.log('    err:', err.code, err)
              resolve(err)
              return
            }
            stream.on('end', () => {
              console.log('stream.end:', abspath)
            }).on('close', () => {
              console.log('stream.close:', abspath)
              resolve()
            }).on('data', data => {
              console.log('stream.data:', abspath, data)
            }).stderr.on('data', buffer => {
              console.log('stream.stderr.data:', abspath, buffer.toString())
            })
          })
        })
      })
    } else {
      return rm(fullpath, { force: true, recursive: true })
    }
  },

  // 非空文件夹不会被删除
  async removeDir(fullpath) {
    var { abspath } = sshCrackFullpath(fullpath)
    if (!!abspath) {
      return SshConnCache.newPromise(resolve => {
        SshConnCache.get(fullpath).then(sftp => {
          console.log('sftp.rmdir(', abspath, ')')
          sftp.rmdir(abspath, err => {
            if (err) {
              // NOTE: 曾观察到 sftp.rmdir() 有时对空文件夹也会失败，可能跟连续删除操作有关
              console.log(`    err: code[${err.code}] message[${err.message}]`)
            }
            resolve(err)
          })
        })
      })
    } else {
      return rmdir(fullpath)
    }
  },
}

contextBridge.exposeInMainWorld('native', {
  getCommandLineArgv() {
    return ipcRenderer.invoke('get-commandline-argv')
  },

  chooseDir() {
    return ipcRenderer.invoke('choose-dir-dialog')
  },

  loadFile(fullpath) {
    return readFile(fullpath, { encoding: 'utf-8' })
  },

  saveFile(fullpath, content) {
    return writeFile(fullpath, content)
  },

  tmpFile() {
    return tmp.fileSync()
  },

  keytar,

  ...FsMixin,

  setRemoteCred(fullpath, cred) {
    var { prefix } = sshCrackFullpath(fullpath)
    if (!prefix) return
    sshCredCache[prefix] = cred
  },

  showContextMenu(ctx) {
    ipcRenderer.send('show-context-menu', ctx)
  }
})
