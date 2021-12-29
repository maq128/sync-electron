import mitt from 'mitt'

export const ebus = mitt()

export default {
  install(app) {
    app.config.globalProperties.$ebus = ebus
  }
}
