import { NitroModules } from 'react-native-nitro-modules'
import type { SpotifyPlayer as SpotifyPlayerSpec } from './specs/Spotify.nitro'

export const SpotifyPlayer =
  NitroModules.createHybridObject<SpotifyPlayerSpec>('SpotifyPlayer')
