import { useCallback, useRef, useState } from 'react'
import { spotifyAuth } from '../lib/spotifyAuth'
import type { SpotifyPlayer } from '../specs/Spotify.nitro'
import type {
  ConnectionOptions,
  PlaybackOptions,
  PlayerState,
  RepeatMode,
  Track,
} from '../types'

interface SpotifyHookResult {
  // Connection state
  isConnected: boolean
  isConnecting: boolean
  connectionError: Error | null

  // Player state
  playerState: PlayerState | null
  queue: Track[]

  // Connection methods
  connect: (options: ConnectionOptions) => Promise<void>
  disconnect: () => Promise<void>
  reconnect: () => Promise<void>

  // Playback control methods
  play: (options: PlaybackOptions) => Promise<void>
  resume: () => Promise<void>
  pause: () => Promise<void>
  seek: (positionMs: number) => Promise<void>
  skipNext: () => Promise<void>
  skipPrevious: () => Promise<void>
  toggleShuffle: (enabled: boolean) => Promise<void>
  setRepeatMode: (mode: RepeatMode) => Promise<void>
}

/**
 * React hook for using Spotify in a React Native component
 */
export function useSpotify(): SpotifyHookResult {
  // Connection state
  const [isConnected, setIsConnected] = useState<boolean>(false)
  const [isConnecting, setIsConnecting] = useState<boolean>(false)
  const [connectionError, setConnectionError] = useState<Error | null>(null)

  // Player state
  const [playerState, setPlayerState] = useState<PlayerState | null>(null)
  const [queue, setQueue] = useState<Track[]>([])

  // Reference to the player
  const playerRef = useRef<SpotifyPlayer | null>(null)

  // Setup player state listener
  const setupPlayerListener = useCallback((player: SpotifyPlayer) => {
    player.onPlayerStateChange((state) => {
      setPlayerState(state)
    })

    // Get initial state
    player.getPlayerState().then(setPlayerState).catch(console.error)
    player.getQueue().then(setQueue).catch(console.error)
  }, [])

  // Connect to Spotify
  const connect = useCallback(
    async (options: ConnectionOptions): Promise<void> => {
      if (isConnecting || isConnected) return

      setIsConnecting(true)
      setConnectionError(null)

      try {
        const player = await spotifyAuth.connect(options)
        playerRef.current = player
        setupPlayerListener(player)
        setIsConnected(true)
      } catch (error) {
        setConnectionError(
          error instanceof Error ? error : new Error(String(error))
        )
      } finally {
        setIsConnecting(false)
      }
    },
    [isConnecting, isConnected, setupPlayerListener]
  )

  // Disconnect from Spotify
  const disconnect = useCallback(async (): Promise<void> => {
    if (!isConnected) return

    try {
      await spotifyAuth.disconnect()
      playerRef.current = null
      setIsConnected(false)
      setPlayerState(null)
      setQueue([])
    } catch (error) {
      console.error('Error disconnecting:', error)
    }
  }, [isConnected])

  // Reconnect to Spotify
  const reconnect = useCallback(async (): Promise<void> => {
    if (isConnected) return

    try {
      await spotifyAuth.reconnect()
      setIsConnected(true)
    } catch (error) {
      console.error('Error reconnecting:', error)
    }
  }, [isConnected])

  // Playback control methods
  const play = useCallback(async (options: PlaybackOptions): Promise<void> => {
    if (!playerRef.current) throw new Error('Not connected to Spotify')
    return playerRef.current.play(options)
  }, [])

  const resume = useCallback(async (): Promise<void> => {
    if (!playerRef.current) throw new Error('Not connected to Spotify')
    return playerRef.current.resume()
  }, [])

  const pause = useCallback(async (): Promise<void> => {
    if (!playerRef.current) throw new Error('Not connected to Spotify')
    return playerRef.current.pause()
  }, [])

  const seek = useCallback(async (positionMs: number): Promise<void> => {
    if (!playerRef.current) throw new Error('Not connected to Spotify')
    return playerRef.current.seek(positionMs)
  }, [])

  const skipNext = useCallback(async (): Promise<void> => {
    if (!playerRef.current) throw new Error('Not connected to Spotify')
    return playerRef.current.skipNext()
  }, [])

  const skipPrevious = useCallback(async (): Promise<void> => {
    if (!playerRef.current) throw new Error('Not connected to Spotify')
    return playerRef.current.skipPrevious()
  }, [])

  const toggleShuffle = useCallback(async (enabled: boolean): Promise<void> => {
    if (!playerRef.current) throw new Error('Not connected to Spotify')
    return playerRef.current.toggleShuffle(enabled)
  }, [])

  const setRepeatMode = useCallback(async (mode: RepeatMode): Promise<void> => {
    if (!playerRef.current) throw new Error('Not connected to Spotify')
    return playerRef.current.setRepeatMode(mode)
  }, [])

  return {
    // Connection state
    isConnected,
    isConnecting,
    connectionError,

    // Player state
    playerState,
    queue,

    // Connection methods
    connect,
    disconnect,
    reconnect,

    // Playback control methods
    play,
    resume,
    pause,
    seek,
    skipNext,
    skipPrevious,
    toggleShuffle,
    setRepeatMode,
  }
}
