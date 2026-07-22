const isDev = process.env.NODE_ENV === 'development'

module.exports = {
  // preserveWhitepace: true,
  compilerOptions: {
    whitespace: 'preserve',
    isCustomElement: (tag) => tag === 'webview',
  },
  extractCSS: !isDev,
  // cssModules: {
  //   localIndetName: '',
  // },
}
