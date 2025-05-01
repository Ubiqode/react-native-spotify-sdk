// Authentication Types
export interface ConnectionOptions {
  clientId: string
  redirectUrl: string
  accessToken?: string
  refreshToken?: string
  scope?: string[]
  showDialog?: boolean
  cacheTokens?: boolean
}

// Player State Types
export interface PlayerState {
  playing: boolean
  repeating: boolean
  shuffling: boolean
  track: Track | null
  playbackPosition: number
  playbackSpeed: number
  isPaused: boolean
  restrictions: Restrictions
}

export interface Restrictions {
  canSkipNext: boolean
  canSkipPrevious: boolean
  canRepeatTrack: boolean
  canRepeatContext: boolean
  canToggleShuffle: boolean
  canSeek: boolean
}

// Track Types
export interface Track {
  id: string
  name: string
  uri: string
  duration: number
  artists: Artist[]
  album: Album
  isPlayable: boolean
  isEpisode: boolean
  isPodcast: boolean
}

export interface Artist {
  id: string
  name: string
  uri: string
}

export interface Album {
  id: string
  name: string
  uri: string
  images: Image[]
}

export interface Image {
  url: string
  width: number
  height: number
}

// Playback Options
export interface PlaybackOptions {
  uri?: string
  uris?: string[]
  offset?: number
  positionMs?: number
}

// Error Types
export interface RemoteError {
  code: number
  message: string
  domain?: string
}

// Repeat Mode Enum
export enum RepeatMode {
  OFF = 0,
  TRACK = 1,
  CONTEXT = 2,
}

// Auth Response
export interface AuthResponse {
  accessToken: string
  refreshToken?: string
  expiresIn: number
  scope: string
}
