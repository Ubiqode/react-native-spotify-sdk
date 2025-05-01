import { type HybridObject } from 'react-native-nitro-modules'
import type { PlaybackOptions, PlayerState, RepeatMode, Track } from '../types'

export interface SpotifyPlayer
  extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  // events
  onPlayerStateChange(cb: (s: PlayerState) => void): void

  // playback control
  play(options: PlaybackOptions): Promise<void>
  resume(): Promise<void>
  pause(): Promise<void>
  seek(positionMs: number): Promise<void>
  skipNext(): Promise<void>
  skipPrevious(): Promise<void>
  toggleShuffle(enabled: boolean): Promise<void>
  setRepeatMode(mode: RepeatMode): Promise<void>

  // state & metadata
  getPlayerState(): Promise<PlayerState>
  getQueue(): Promise<Track[]>
}
