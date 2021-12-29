import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as Icons from '@element-plus/icons-vue'
import App from './App.vue'
import EventBus from './EventBus'

const app = createApp(App)
app.use(EventBus)
app.use(ElementPlus)
Object.keys(Icons).forEach(key => {
  app.component(key, Icons[key])
})
app.mount('#app')
