import { NitroModules } from 'react-native-nitro-modules'
import type { SpotifyAuth as SpotifyAuthSpec } from './specs/Auth.nitro'

export const SpotifyAuth =
  NitroModules.createHybridObject<SpotifyAuthSpec>('SpotifyAuth')
