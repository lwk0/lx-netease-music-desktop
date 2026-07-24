import '@common/error'
import { createApp } from 'vue'

// dev 模式下兜底未处理的网络错误，避免 webpack-dev-server overlay 弹出红框刷屏
if (process.env.NODE_ENV === 'development') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason
    const msg = reason?.message ?? reason
    if (typeof msg !== 'string') return
    if (
      msg.includes('无法连接到服务器') ||
      msg.includes('请求超时') ||
      msg.includes('接口无法访问') ||
      msg.includes('请求异常') ||
      msg.includes('服务器繁忙') ||
      msg.includes('取消http请求') ||
      /socket hang up/i.test(msg) ||
      /network/i.test(msg) ||
      /ENOTFOUND|ETIMEDOUT|ESOCKETTIMEDOUT|ECONNREFUSED|ECONNRESET/i.test(msg)
    ) {
      event.preventDefault()
      console.warn('[dev] 忽略未处理网络错误:', msg)
    }
  })
}

import './core/globalData'

import '@renderer/event'

// Components
import mountComponents from './components'

// Plugins
import initPlugins from './plugins'
import { i18nPlugin } from './plugins/i18n'

import App from './App.vue'
import router from './router'
// import store from './store'


import { getSetting, updateSetting } from './utils/ipc'
import { langList } from '@root/lang'
import type { I18n } from '@root/lang/i18n'

import { initSetting } from './store/setting'
import { initWyUser } from './store/user/action'
// import { bubbleCursor } from './utils/cursor-effects/bubbleCursor'

import './worker'
import { saveViewPrevState } from './utils/data'

// sync(store, router)

router.afterEach((to) => {
  if (to.path != '/songList/detail') {
    saveViewPrevState({
      url: to.path,
      query: { ...to.query },
    })
  }
})

void getSetting().then(setting => {
  // window.lx.appSetting = setting
  // Set language automatically
  if (!setting['common.langId'] || !window.i18n.availableLocales.includes(setting['common.langId'])) {
    let langId: I18n['locale'] | null = null
    const locale = window.navigator.language.toLocaleLowerCase() as I18n['locale']
    if (window.i18n.availableLocales.includes(locale)) {
      langId = locale
    } else {
      for (const lang of langList) {
        if (lang.alternate == locale) {
          langId = lang.locale
          break
        }
      }
      langId ??= 'en-us'
    }
    setting['common.langId'] = langId
    void updateSetting({ 'common.langId': langId })
    console.log('Set lang', setting['common.langId'])
  }
  window.setLang(setting['common.langId'])
  window.i18n.setLanguage(setting['common.langId'])

  if (!setting['common.startInFullscreen'] && (document.body.clientHeight > window.screen.availHeight || document.body.clientWidth > window.screen.availWidth) && setting['common.windowSizeId'] > 1) {
    void updateSetting({ 'common.windowSizeId': 1 })
  }

  // store.commit('setSetting', setting)
  initSetting(setting)

  // 自动初始化网易云登录状态（异步，不阻塞应用启动）
  void initWyUser()

  const app = createApp(App)
  app
    .use(router)
    // .use(store)
    .use(i18nPlugin)
  initPlugins(app)
  mountComponents(app)
  app.mount('#root')
})

// bubbleCursor()
