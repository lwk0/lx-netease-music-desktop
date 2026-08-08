(function() {
  'use strict'

  // 网易云网页登录页清理：仅通过 CSS 隐藏顶部导航、底部、下载广告等干扰元素，
  // 不再频繁删除 DOM 或扫描全页文本，避免破坏手机号登录等动态加载内容。
  const HIDE_SELECTORS = [
    '#g_top', '.m-top',
    '#g_nav', '.m-subnav',
    '.g-ft', '.m-ft', 'footer',
    '.m-download', '.m-banner',
    '.m-hd', '.g-hd', '.m-playbar',
  ].join(',')
  const LOGIN_AREA = '#login-wrapper, .g-bd'

  const CSS = [
    HIDE_SELECTORS + '{display:none !important;}',
    LOGIN_AREA + '{padding-top:0 !important;margin-top:0 !important;}',
    'body,html{padding-top:0 !important;margin-top:0 !important;background:#fff !important;}',
    '::-webkit-scrollbar{width:6px;height:6px;background-color:transparent;}',
    '::-webkit-scrollbar-track{background-color:rgba(113,191,150,0.2);border-radius:3px;}',
    '::-webkit-scrollbar-thumb{border-radius:3px;background-color:rgba(77,175,124,0.4);}',
    '::-webkit-scrollbar-thumb:hover{background-color:rgba(77,175,124,0.6);}',
  ].join('')

  const injectStyle = () => {
    if (document.getElementById('lx-netease-login-cleanup')) return
    const style = document.createElement('style')
    style.id = 'lx-netease-login-cleanup'
    style.textContent = CSS
    const head = document.head || document.documentElement
    if (head) head.appendChild(style)
  }

  const resetPadding = () => {
    try {
      document.querySelectorAll(LOGIN_AREA).forEach((node) => {
        node.style.paddingTop = '0px'
        node.style.marginTop = '0px'
      })
      if (document.body) {
        document.body.style.paddingTop = '0px'
        document.body.style.marginTop = '0px'
      }
      if (document.documentElement) {
        document.documentElement.style.paddingTop = '0px'
        document.documentElement.style.marginTop = '0px'
      }
    } catch (e) {}
  }

  const run = () => {
    injectStyle()
    resetPadding()
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run)
  } else {
    run()
  }
  // 部分动态内容（如底部播放器）可能在页面加载完成后才插入，做少量兜底即可
  setTimeout(run, 1500)
  setTimeout(run, 3000)
})()
