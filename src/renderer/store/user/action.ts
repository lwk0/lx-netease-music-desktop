import { userState, type FollowedArtistInfo, type SubscribedAlbumInfo, type SubscribedPlaylistInfo, type UserPlaylistInfo } from './state'
import musicSdk from '@renderer/utils/musicSdk'
import { appSetting } from '@renderer/store/setting'

export const setWyUid = (uid: string | null) => {
  userState.wy_uid = uid
}

export const setWyVipType = (type: number) => {
  userState.wy_vip_type = type
}

export const setWyLikedSongs = (ids: string[]) => {
  userState.wy_liked_song_ids = new Set(ids)
}

export const addWyLikedSong = (id: string) => {
  userState.wy_liked_song_ids.add(id)
}

export const removeWyLikedSong = (id: string) => {
  userState.wy_liked_song_ids.delete(id)
}

export const setWyLikedPlaylistId = (id: string | null) => {
  userState.wy_liked_playlist_id = id
}

export const setWyPlaylists = (playlists: UserPlaylistInfo[]) => {
  userState.wy_playlists = playlists
}

/**
 * 将网易云歌单列表拆分为「我创建的」与「我收藏的」两类并写入缓存。
 * getUserPlaylists 返回的全部歌单中，subscribed === true 的为收藏的歌单。
 */
export const applyWyPlaylists = (playlists: any[]) => {
  const own: UserPlaylistInfo[] = []
  const subscribed: SubscribedPlaylistInfo[] = []
  for (const p of playlists) {
    const base = {
      id: p.id,
      name: p.name || '',
      coverImgUrl: p.coverImgUrl || p.picUrl || '',
      trackCount: p.trackCount || 0,
      userId: p.userId ?? p.creator?.userId ?? 0,
      creator: p.creator,
    }
    if (p.subscribed) subscribed.push(base)
    else own.push(base)
  }
  setWyPlaylists(own)
  setWySubscribedPlaylists(subscribed)
}

export const loadWyPlaylists = async() => {
  const cookie = appSetting['common.wy_cookie']
  const uid = userState.wy_uid
  if (!cookie || !uid) return
  try {
    const result = await musicSdk.wy.user.getUserPlaylists(uid, cookie)
    if (Array.isArray(result)) {
      applyWyPlaylists(result)
    }
  } catch (e) {
    console.warn('加载网易云歌单列表失败', e)
  }
}

/**
 * 切换网易云"我喜欢的音乐"状态，并同步本地缓存的喜欢集合
 */
export const toggleWyLikedSong = async(songId: string | number, like: boolean) => {
  await musicSdk.wy.user.likeSong(songId, like)
  const id = String(songId)
  if (like) userState.wy_liked_song_ids.add(id)
  else userState.wy_liked_song_ids.delete(id)
}

export const setWyFollowedArtists = (artists: FollowedArtistInfo[]) => {
  userState.wy_followed_artists = artists
}

export const addWyFollowedArtist = (artist: FollowedArtistInfo) => {
  const existing = userState.wy_followed_artists.find(a => String(a.id) === String(artist.id))
  if (!existing) {
    userState.wy_followed_artists.push(artist)
  }
}

export const removeWyFollowedArtist = (id: string | number) => {
  const index = userState.wy_followed_artists.findIndex(a => String(a.id) === String(id))
  if (index >= 0) {
    userState.wy_followed_artists.splice(index, 1)
  }
}

export const setWySubscribedAlbums = (albums: SubscribedAlbumInfo[]) => {
  userState.wy_subscribed_albums = albums
}

export const addWySubscribedAlbum = (album: SubscribedAlbumInfo) => {
  const existing = userState.wy_subscribed_albums.find(a => String(a.id) === String(album.id))
  if (!existing) {
    userState.wy_subscribed_albums.push(album)
  }
}

export const removeWySubscribedAlbum = (id: string | number) => {
  const index = userState.wy_subscribed_albums.findIndex(a => String(a.id) === String(id))
  if (index >= 0) {
    userState.wy_subscribed_albums.splice(index, 1)
  }
}

export const setWySubscribedPlaylists = (playlists: SubscribedPlaylistInfo[]) => {
  userState.wy_subscribed_playlists = playlists
}

export const addWySubscribedPlaylist = (playlist: SubscribedPlaylistInfo) => {
  const existing = userState.wy_subscribed_playlists.find(p => String(p.id) === String(playlist.id))
  if (!existing) {
    userState.wy_subscribed_playlists.push(playlist)
  }
}

export const removeWySubscribedPlaylist = (id: string | number) => {
  const index = userState.wy_subscribed_playlists.findIndex(p => String(p.id) === String(id))
  if (index >= 0) {
    userState.wy_subscribed_playlists.splice(index, 1)
  }
}

export const updateWySubscribedPlaylist = (id: string | number, details: Partial<SubscribedPlaylistInfo>) => {
  const playlist = userState.wy_subscribed_playlists.find(p => String(p.id) === String(id))
  if (playlist) {
    Object.assign(playlist, details)
  }
}

export const updateWySubscribedPlaylistTrackCount = (id: string | number, change: number) => {
  const playlist = userState.wy_subscribed_playlists.find(p => String(p.id) === String(id))
  if (playlist) {
    playlist.trackCount += change
  }
}

/**
 * 应用启动时自动初始化网易云登录状态
 * 如果已设置 Cookie，自动获取 UID、VIP 类型、喜欢列表和"我喜欢的音乐"歌单 ID
 * 失败时静默处理，不影响应用启动
 */
export const initWyUser = async() => {
  const cookie = appSetting['common.wy_cookie']
  if (!cookie) return
  try {
    const wyUser = musicSdk.wy.user
    if (!wyUser?.getUid) return
    const uid = await wyUser.getUid(cookie)
    if (!uid) return
    setWyUid(String(uid))
    // 同步账号内"我喜欢的音乐"歌曲集合
    try {
      const likedIds = await wyUser.getLikedSongList(uid, cookie)
      if (Array.isArray(likedIds)) {
        setWyLikedSongs(likedIds.map(String))
      }
    } catch (e) {
      console.warn('自动初始化：获取网易云喜欢列表失败', e)
    }
    // 获取"我喜欢的音乐"歌单 ID（specialType === 5）
    try {
      const playlists = await wyUser.getUserPlaylists(uid, cookie)
      if (playlists && playlists.length > 0) {
        const likedPlaylist = playlists.find((p: any) => p.specialType === 5) || playlists[0]
        setWyLikedPlaylistId(String(likedPlaylist.id))
      }
    } catch (e) {
      console.warn('自动初始化：获取网易云歌单失败', e)
    }
    // 缓存用户网易云歌单列表，用于"添加到歌单"在线歌单选择
    void loadWyPlaylists()
    // 同步关注歌手 / 收藏专辑缓存，使歌手/专辑详情页的关注状态首屏即准确
    try {
      const artists = await wyUser.getSublist()
      if (artists?.artists?.length) setWyFollowedArtists(artists.artists)
    } catch (e) {
      console.warn('自动初始化：获取关注歌手失败', e)
    }
    try {
      const albums = await wyUser.getSubAlbumList()
      if (albums?.albums?.length) setWySubscribedAlbums(albums.albums)
    } catch (e) {
      console.warn('自动初始化：获取收藏专辑失败', e)
    }
  } catch (err) {
    console.error('自动初始化网易云登录状态失败:', err)
  }
}
