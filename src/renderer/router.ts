/* eslint-disable @typescript-eslint/no-var-requires */
// import Vue from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'


const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/search',
      name: 'Search',
      component: require('./views/Search/index.vue').default,
      meta: {
        name: 'Search',
      },
    },
    {
      path: '/songList/list',
      name: 'SongList',
      component: require('./views/songList/List/index.vue').default,
      meta: {
        name: 'SongList',
      },
    },
    {
      path: '/songList/detail',
      name: 'SongListDetail',
      component: require('./views/songList/Detail/index.vue').default,
      meta: {
        name: 'SongList',
      },
    },
    {
      path: '/leaderboard',
      name: 'Leaderboard',
      component: require('./views/Leaderboard/index.vue').default,
      meta: {
        name: 'Leaderboard',
      },
    },
    {
      path: '/list',
      name: 'List',
      component: require('./views/List/index.vue').default,
      meta: {
        name: 'List',
      },
    },
    {
      path: '/myNetease',
      name: 'MyNetease',
      component: require('./views/MyNetease/index.vue').default,
      meta: {
        name: 'MyNetease',
      },
    },
    {
      path: '/artist/detail',
      name: 'ArtistDetail',
      component: require('./views/Artist/Detail/index.vue').default,
      meta: {
        name: 'ArtistDetail',
      },
    },
    {
      path: '/album/detail',
      name: 'AlbumDetail',
      component: require('./views/Album/Detail/index.vue').default,
      meta: {
        name: 'AlbumDetail',
      },
    },
    {
      path: '/download',
      name: 'Download',
      component: require('./views/Download/index.vue').default,
      meta: {
        name: 'Download',
      },
    },
    {
      path: '/setting',
      name: 'Setting',
      component: require('./views/Setting/index.vue').default,
      meta: {
        name: 'Setting',
      },
    },
    {
      path: '/netease/login',
      name: 'NeteaseLogin',
      component: require('./views/NeteaseLogin/index.vue').default,
      meta: {
        name: 'NeteaseLogin',
      },
    },
    { path: '/:pathMatch(.*)*', redirect: '/search' },
  ],
  linkActiveClass: 'active-link',
  linkExactActiveClass: 'exact-active-link',
})


export default router
