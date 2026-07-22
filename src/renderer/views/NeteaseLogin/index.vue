<template lang="pug">
.nl-root(:class="$style.root")
  .nl-bar(:class="$style.bar")
    base-btn(:class="$style.backBtn" @click="handleBack") {{ $t('netease__web_login_back') }}
    .nl-title(:class="$style.title") {{ $t('netease__web_login_title') }}
  webview.nl-webview(:class="$style.webview" :src="loginUrl" :partition="partition" :useragent="userAgent" :preload="preloadPath" allowpopups)
</template>

<script>
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { onBeforeUnmount, onMounted } from '@common/utils/vueTools'
import { updateSetting } from '@renderer/store/setting'
import { userState, setWyUid, setWyVipType, setWyLikedSongs, setWyLikedPlaylistId, applyWyPlaylists } from '@renderer/store/user'
import musicSdk from '@renderer/utils/musicSdk'
import { dialog } from '@renderer/plugins/Dialog'
import { useI18n } from '@root/lang'
import { rendererInvoke, rendererSend } from '@common/rendererIpc'
import { WIN_MAIN_RENDERER_EVENT_NAME } from '@common/ipcNames'
import { useRouter } from '@common/utils/vueRouter'

export default {
  name: 'NeteaseLogin',
  setup() {
    const t = useI18n()
    const router = useRouter()
    const loginUrl = 'https://music.163.com/login'
    // 每次打开登录页都使用一个全新的临时 partition（非持久化），
    // 既与主页 session 隔离，又避免复用旧登录态导致自动登录旧账号
    const partition = 'netease-login-embedded-' + Date.now()
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    // staticPath 由 webpack DefinePlugin 注入；preload 脚本放在 src/static 下，prod 会被拷贝到 dist/static
    // 必须用 file:/// 标准 URL（pathToFileURL），Windows 下 file://D:\ 这种格式 webview 不认
    const preloadPath = pathToFileURL(path.join(staticPath, 'netease-login-preload.js')).href
    let cancelled = false
    let started = false

    const refreshUserInfo = async(cookie) => {
      const wyUser = musicSdk.wy.user
      if (!wyUser?.getUid) return
      const uid = await wyUser.getUid(cookie)
      if (!uid) return
      setWyUid(String(uid))
      try {
        const playlists = await wyUser.getUserPlaylists(uid, cookie)
        if (playlists && playlists.length > 0) {
          const likedPlaylist = playlists.find(p => p.specialType === 5) || playlists[0]
          setWyLikedPlaylistId(String(likedPlaylist.id))
          setWyVipType(playlists[0].creator?.vipType || 0)
          applyWyPlaylists(playlists)
        }
      } catch (e) {
        console.warn('获取网易云歌单失败', e)
      }
      try {
        const likedIds = await wyUser.getLikedSongList(uid, cookie)
        if (Array.isArray(likedIds)) setWyLikedSongs(likedIds.map(String))
      } catch (e) {
        console.warn('获取网易云喜欢列表失败', e)
      }
    }

    const finish = async(cookie) => {
      if (cancelled) return
      updateSetting({ 'common.wy_cookie': cookie })
      await refreshUserInfo(cookie)
      if (!cancelled && userState.wy_uid) {
        void dialog({
          message: t('netease__web_login_success'),
          confirmButtonText: t('btn_confirm'),
        })
      }
      goBack()
    }

    const goBack = () => {
      if (router.currentRoute.value?.name !== 'NeteaseLogin') return
      // 返回固定回到网易云增强主页，而不是依赖 history.back 跳回设置页
      void router.push({ path: '/myNetease' })
    }

    const startWatching = () => {
      if (started || cancelled) return
      started = true
      void rendererInvoke(WIN_MAIN_RENDERER_EVENT_NAME.netease_web_login_start, partition).then((cookie) => {
        if (cookie && !cancelled) void finish(cookie)
      }).catch((err) => {
        console.error('netease web login watch error', err)
      })
    }

    const handleBack = () => {
      goBack()
    }

    // 网易云登录页真实 DOM（已从源码确认）：顶部导航 #g_top(.m-top)、红色二级导航 #g_nav(.m-subnav)、底部 .g-ft/.m-ft
    const cleanupCss = '#g_top,.m-top,#g_nav,.m-subnav,.g-ft,.m-ft,footer,.m-download,.m-banner,.m-hd,.g-hd,[class*="download"]{display:none !important;}#login-wrapper,.g-bd{padding-top:0 !important;margin-top:0 !important;}body,html{padding-top:0 !important;margin-top:0 !important;background:#fff !important;}::-webkit-scrollbar{width:6px;height:6px;background-color:transparent;}::-webkit-scrollbar-track{background-color:rgba(113,191,150,0.2);border-radius:3px;}::-webkit-scrollbar-thumb{border-radius:3px;background-color:rgba(77,175,124,0.4);}::-webkit-scrollbar-thumb:hover{background-color:rgba(77,175,124,0.6);}'
    const cleanupJs = `(function(){
      var sels=['#g_top','.m-top','#g_nav','.m-subnav','.g-ft','.m-ft','footer','.m-download','.m-banner','.m-hd','.g-hd','[class*="download"]'];
      sels.forEach(function(sel){try{document.querySelectorAll(sel).forEach(function(n){n.remove();});}catch(e){}});
      try{document.querySelectorAll('#login-wrapper,.g-bd').forEach(function(n){n.style.paddingTop='0';n.style.marginTop='0';});}catch(e){}
      try{document.body.style.paddingTop='0';document.body.style.marginTop='0';}catch(e){}
      var adRxp=/下载客户端|VIP歌曲免费听|下载APP|下载 app|下载应用/;
      try{document.querySelectorAll('a,button,div,span,p,section,li').forEach(function(n){if(adRxp.test(n.textContent||''))n.remove();});}catch(e){}
      var st=document.getElementById('lx-netease-login-cleanup');
      if(!st){st=document.createElement('style');st.id='lx-netease-login-cleanup';st.textContent=${JSON.stringify(cleanupCss)};document.head.appendChild(st);}
    })()`

    const injectCleanup = (webview) => {
      if (!webview) {
        console.log('[LX] netease webview not found')
        return
      }
      if (typeof webview.insertCSS === 'function') {
        void webview.insertCSS(cleanupCss).then(() => {
          console.log('[LX] netease login cleanup css injected')
        }).catch((err) => {
          console.error('[LX] netease login insertCSS failed', err)
        })
      }
      if (typeof webview.executeJavaScript === 'function') {
        void webview.executeJavaScript(cleanupJs, false).then(() => {
          console.log('[LX] netease login cleanup js injected')
        }).catch((err) => {
          console.error('[LX] netease login executeJavaScript failed', err)
        })
      } else {
        console.log('[LX] netease webview has no insertCSS/executeJavaScript')
      }
    }

    onMounted(() => {
      // 不依赖 Vue ref 拿 webview 实例（ref 对 <webview> 自定义元素有时拿不到），直接用 querySelector
      const webview = document.querySelector('webview')
      if (!webview) return
      const events = ['dom-ready', 'did-finish-load', 'did-frame-finish-load', 'did-navigate']
      events.forEach((ev) => {
        webview.addEventListener(ev, () => { injectCleanup(webview) })
      })
      // 轮询兜底：webview 异步初始化，事件可能已错过
      let n = 0
      const poll = () => {
        if (n >= 40) return
        n++
        const wv = document.querySelector('webview')
        if (wv && (typeof wv.insertCSS === 'function' || typeof wv.executeJavaScript === 'function')) {
          injectCleanup(wv)
        }
        setTimeout(poll, 500)
      }
      setTimeout(poll, 500)
    })

    startWatching()

    onBeforeUnmount(() => {
      cancelled = true
      rendererSend(WIN_MAIN_RENDERER_EVENT_NAME.netease_web_login_stop)
    })

    return {
      loginUrl,
      partition,
      userAgent,
      preloadPath,
      handleBack,
    }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.root {
  display: flex;
  flex-flow: column nowrap;
  height: 100%;
  width: 100%;
  background-color: var(--color-main-background);
}

.bar {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 40px;
  flex: none;
  padding: 0 12px;
  border-bottom: 1px solid var(--color-primary-light-100-alpha-700);
}

.backBtn {
  flex: none;
}

.title {
  font-size: 14px;
  color: var(--color-font);
}

.webview {
  flex: 1 1 0;
  min-height: 0;
  width: 100%;
  border: none;
  outline: none;
  background-color: #fff;
  border-radius: 0 0 @radius-border @radius-border;
}
</style>
