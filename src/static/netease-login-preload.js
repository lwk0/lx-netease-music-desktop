(function() {
  'use strict'

  // 拦截第三方登录弹出窗口（QQ/微信/微博等），转交给主进程用「同 partition」的
  // BrowserWindow 打开，避免 Electron <webview> 原生 window.open 弹窗在某些情况下不工作。
  // 返回伪 popup 对象，避免 163 登录页因 open 返回 null 而报错。
  try {
    const ipcRenderer = require('electron').ipcRenderer
    window.open = function(url) {
      try {
        ipcRenderer.send('netease-login-open-url', String(url == null ? '' : url))
      } catch (e) {}
      return {
        focus: function() {},
        close: function() {},
        postMessage: function() {},
        location: {},
        closed: false,
      }
    }
  } catch (e) {}

  const SELECTORS = [
    '#g_top', '.m-top',
    '#g_nav', '.m-subnav',
    '.g-ft', '.m-ft', 'footer',
    '.m-download', '.m-banner',
    '.m-hd', '.g-hd',
    '[class*="download"]',
  ]
  const LOGIN_AREA = '#login-wrapper, .g-bd'

  function removeNodes() {
    SELECTORS.forEach((sel) => {
      try {
        document.querySelectorAll(sel).forEach((node) => {
          if (node && node.parentNode) {
            node.parentNode.removeChild(node)
          }
        })
      } catch (e) {}
    })
  }

  function resetPadding() {
    try {
      document.querySelectorAll(LOGIN_AREA).forEach((node) => {
        node.style.paddingTop = '0px'
        node.style.marginTop = '0px'
      })
      document.body.style.paddingTop = '0px'
      document.body.style.marginTop = '0px'
      document.documentElement.style.paddingTop = '0px'
      document.documentElement.style.marginTop = '0px'
    } catch (e) {}
  }

  function addStyle() {
    const existing = document.getElementById('lx-netease-login-cleanup')
    if (existing) return
    const style = document.createElement('style')
    style.id = 'lx-netease-login-cleanup'
    style.textContent = [
      '#g_top,.m-top,#g_nav,.m-subnav,.g-ft,.m-ft,footer,.m-download,.m-banner,.m-hd,.g-hd,[class*="download"]{',
      '  display:none !important;',
      '}',
      '#login-wrapper,.g-bd{',
      '  padding-top:0 !important;',
      '  margin-top:0 !important;',
      '}',
      'body,html{',
      '  padding-top:0 !important;',
      '  margin-top:0 !important;',
      '  background:#fff !important;',
      '}',
      '/* 自定义滚动条，保持与 LX Music UI 一致 */',
      '::-webkit-scrollbar{',
      '  width:6px;',
      '  height:6px;',
      '  background-color:transparent;',
      '}',
      '::-webkit-scrollbar-track{',
      '  background-color:rgba(113,191,150,0.2);',
      '  border-radius:3px;',
      '}',
      '::-webkit-scrollbar-thumb{',
      '  border-radius:3px;',
      '  background-color:rgba(77,175,124,0.4);',
      '}',
      '::-webkit-scrollbar-thumb:hover{',
      '  background-color:rgba(77,175,124,0.6);',
      '}',
    ].join('')
    const head = document.head || document.documentElement
    head.appendChild(style)
  }

  function removeDownloadAds() {
    try {
      const adRxp = /下载客户端|VIP歌曲免费听|下载APP|下载 app|下载应用/
      document.querySelectorAll('a,button,div,span,p,section,li').forEach((node) => {
        if (adRxp.test(node.textContent || '')) node.remove()
      })
    } catch (e) {}
  }

  function clean() {
    addStyle()
    removeNodes()
    removeDownloadAds()
    resetPadding()
  }

  function observe() {
    if (typeof window.MutationObserver === 'undefined') return
    const observer = new window.MutationObserver(() => {
      clean()
    })
    const target = document.body || document.documentElement
    observer.observe(target, { childList: true, subtree: true })
    setTimeout(() => {
      observer.disconnect()
    }, 20000)
  }

  function run() {
    clean()
    observe()
    let count = 0
    const timer = setInterval(() => {
      clean()
      count++
      if (count >= 40) clearInterval(timer)
    }, 500)
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run)
  } else {
    run()
  }
})()
