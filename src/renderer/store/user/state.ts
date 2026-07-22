import { reactive } from '@common/utils/vueTools'

export interface FollowedArtistInfo {
  id: string | number
  name: string
  alias: string[] | null
  albumSize: number
  picUrl: string
  img1v1Url: string
  briefDesc?: string
  cover?: string
  avatar?: string
  fansCount?: number
}

export interface SubscribedAlbumInfo {
  id: string | number
  name: string
  picUrl: string
  artists: Array<{ id: string | number, name: string }>
  publishTime: number
  size: number
}

export interface SubscribedPlaylistInfo {
  id: string | number
  userId: number
  name: string
  coverImgUrl: string
  trackCount: number
  description?: string
}

export interface UserPlaylistInfo {
  id: string | number
  name: string
  coverImgUrl: string
  trackCount: number
  userId: number
  creator?: { userId: number, nickname: string }
}

export const userState = reactive<{
  wy_uid: string | null
  wy_vip_type: number
  wy_liked_song_ids: Set<string>
  wy_liked_playlist_id: string | null
  wy_playlists: UserPlaylistInfo[]
  wy_followed_artists: FollowedArtistInfo[]
  wy_subscribed_albums: SubscribedAlbumInfo[]
  wy_subscribed_playlists: SubscribedPlaylistInfo[]
}>({
  wy_uid: null,
  wy_vip_type: 0,
  wy_liked_song_ids: new Set(),
  wy_liked_playlist_id: null,
  wy_playlists: [],
  wy_followed_artists: [],
  wy_subscribed_albums: [],
  wy_subscribed_playlists: [],
})
