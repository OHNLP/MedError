import './assets/main.css'
import 'ant-design-vue/dist/antd.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Antd from 'ant-design-vue'
import App from './App.vue'

const app = createApp(App)

app.use(createPinia())
app.use(Antd)

app.mount('#app')
