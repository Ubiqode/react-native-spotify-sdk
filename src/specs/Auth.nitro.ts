import type { HybridObject } from 'react-native-nitro-modules'
import type { ConnectionOptions } from '../types'
import type { SpotifyPlayer } from './Spotify.nitro'

export interface SpotifyAuth
  extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  // authorization
  connect(options: ConnectionOptions): Promise<SpotifyPlayer>

  // connection management
  disconnect(): Promise<void>
  reconnect(): Promise<void>
}
