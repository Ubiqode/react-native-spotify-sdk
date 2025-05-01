package com.your.package.name

import android.app.Activity
import android.content.Context
import android.content.Intent
import com.nitromodules.NitroEvent
import com.nitromodules.NitroMethod
import com.nitromodules.NitroMethods
import com.nitromodules.Promise
import com.spotify.android.appremote.api.ConnectionParams
import com.spotify.android.appremote.api.Connector
import com.spotify.android.appremote.api.SpotifyAppRemote
import com.spotify.protocol.client.Subscription
import com.spotify.protocol.types.*
import com.spotify.sdk.android.auth.AuthorizationClient
import com.spotify.sdk.android.auth.AuthorizationRequest
import com.spotify.sdk.android.auth.AuthorizationResponse
import java.lang.ref.WeakReference

class SpotifyAuthNitro(private val context: Context) : NitroMethods() {
    
    private var spotifyAppRemote: SpotifyAppRemote? = null
    private var activity: WeakReference<Activity>? = null
    private var player: SpotifyPlayerNitro? = null
    private var connectPromise: Promise<SpotifyPlayerNitro>? = null
    private val AUTH_REQUEST_CODE = 1337
    
    fun setActivity(activity: Activity) {
        this.activity = WeakReference(activity)
    }
    
    @NitroMethod
    fun connect(options: Map<String, Any>): Promise<SpotifyPlayerNitro> {
        return Promise { resolve, reject ->
            val clientId = options["clientId"] as? String
                ?: return@Promise reject(Exception("Client ID is required"))
            
            val redirectUrl = options["redirectUrl"] as? String
                ?: return@Promise reject(Exception("Redirect URL is required"))
            
            // Store the promise for later resolution
            connectPromise = Promise(resolve, reject)
            
            // If we have an access token, use it directly
            val accessToken = options["accessToken"] as? String
            if (accessToken != null) {
                connectWithToken(clientId, redirectUrl, accessToken)
                return@Promise
            }
            
            // Otherwise, start the auth flow
            val showDialog = options["showDialog"] as? Boolean ?: false
            val scopeArray = options["scope"] as? List<String> ?: listOf()
            val scope = scopeArray.joinToString(" ")
            
            val builder = AuthorizationRequest.Builder(
                clientId,
                AuthorizationResponse.Type.TOKEN,
                redirectUrl
            )
            
            builder.setScopes(arrayOf("streaming", "app-remote-control"))
            if (scope.isNotEmpty()) {
                builder.setScopes(scope.split(" ").toTypedArray())
            }
            
            if (showDialog) {
                builder.setShowDialog(true)
            }
            
            val request = builder.build()
            
            val act = activity?.get()
            if (act != null) {
                AuthorizationClient.openLoginActivity(act, AUTH_REQUEST_CODE, request)
            } else {
                reject(Exception("Activity is not set"))
            }
        }
    }
    
    fun handleAuthResponse(requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode == AUTH_REQUEST_CODE) {
            val response = AuthorizationClient.getResponse(resultCode, data)
            
            when (response.type) {
                AuthorizationResponse.Type.TOKEN -> {
                    val clientId = response.clientId
                    val redirectUri = response.redirectUri
                    connectWithToken(clientId, redirectUri, response.accessToken)
                }
                AuthorizationResponse.Type.ERROR -> {
                    connectPromise?.reject(Exception(response.error))
                }
                else -> {
                    connectPromise?.reject(Exception("Auth flow cancelled"))
                }
            }
        }
    }
    
    private fun connectWithToken(clientId: String, redirectUri: String, accessToken: String) {
        val connectionParams = ConnectionParams.Builder(clientId)
            .setRedirectUri(redirectUri)
            .showAuthView(true)
            .build()
        
        SpotifyAppRemote.connect(context, connectionParams, object : Connector.ConnectionListener {
            override fun onConnected(appRemote: SpotifyAppRemote) {
                spotifyAppRemote = appRemote
                player = SpotifyPlayerNitro(appRemote)
                connectPromise?.resolve(player!!)
            }
            
            override fun onFailure(error: Throwable) {
                connectPromise?.reject(error)
            }
        })
    }
    
    @NitroMethod
    fun disconnect(): Promise<Unit> {
        return Promise { resolve, reject ->
            try {
                spotifyAppRemote?.let {
                    SpotifyAppRemote.disconnect(it)
                    spotifyAppRemote = null
                    player = null
                }
                resolve(Unit)
            } catch (e: Exception) {
                reject(e)
            }
        }
    }
    
    @NitroMethod
    fun reconnect(): Promise<Unit> {
        return Promise { resolve, reject ->
            spotifyAppRemote?.let {
                if (!it.isConnected) {
                    it.connect(context)
                    resolve(Unit)
                } else {
                    resolve(Unit)
                }
            } ?: reject(Exception("No previous connection"))
        }
    }
}

class SpotifyPlayerNitro(private val spotifyAppRemote: SpotifyAppRemote) : NitroMethods() {
    
    private var playerStateSubscription: Subscription<PlayerState>? = null
    private var queueSubscription: Subscription<ListItems>? = null
    
    init {
        setupSubscriptions()
    }
    
    private fun setupSubscriptions() {
        // Player State subscription
        playerStateSubscription = spotifyAppRemote.playerApi
            .subscribeToPlayerState()
            .setEventCallback { playerState ->
                sendEvent("playerState", mapPlayerState(playerState))
            }
            .setErrorCallback { throwable ->
                sendEvent("remoteError", mapError(throwable))
            }
        
        // Queue subscription - Not directly available in Spotify Android SDK
        // This is a simplified implementation
    }
    
    // MARK: - Player Controls
    
    @NitroMethod
    fun play(options: Map<String, Any>): Promise<Unit> {
        return Promise { resolve, reject ->
            try {
                val uri = options["uri"] as? String
                val uris = options["uris"] as? List<String>
                val offset = options["offset"]
                
                if (uri != null) {
                    spotifyAppRemote.playerApi.play(uri)
                    resolve(Unit)
                } else if (uris != null && offset is Int && offset < uris.size) {
                    // This is a simplified implementation
                    // The Android SDK doesn't handle queue management like this directly
                    spotifyAppRemote.playerApi.play(uris[offset])
                    resolve(Unit)
                } else {
                    reject(Exception("Invalid play options"))
                }
            } catch (e: Exception) {
                reject(e)
            }
        }
    }
    
    @NitroMethod
    fun resume(): Promise<Unit> {
        return Promise { resolve, reject ->
            try {
                spotifyAppRemote.playerApi.resume()
                resolve(Unit)
            } catch (e: Exception) {
                reject(e)
            }
        }
    }
    
    @NitroMethod
    fun pause(): Promise<Unit> {
        return Promise { resolve, reject ->
            try {
                spotifyAppRemote.playerApi.pause()
                resolve(Unit)
            } catch (e: Exception) {
                reject(e)
            }
        }
    }
    
    @NitroMethod
    fun seek(positionMs: Int): Promise<Unit> {
        return Promise { resolve, reject ->
            try {
                spotifyAppRemote.playerApi.seekTo(positionMs.toLong())
                resolve(Unit)
            } catch (e: Exception) {
                reject(e)
            }
        }
    }
    
    @NitroMethod
    fun skipNext(): Promise<Unit> {
        return Promise { resolve, reject ->
            try {
                spotifyAppRemote.playerApi.skipNext()
                resolve(Unit)
            } catch (e: Exception) {
                reject(e)
            }
        }
    }
    
    @NitroMethod
    fun skipPrevious(): Promise<Unit> {
        return Promise { resolve, reject ->
            try {
                spotifyAppRemote.playerApi.skipPrevious()
                resolve(Unit)
            } catch (e: Exception) {
                reject(e)
            }
        }
    }
    
    @NitroMethod
    fun toggleShuffle(enabled: Boolean): Promise<Unit> {
        return Promise { resolve, reject ->
            try {
                spotifyAppRemote.playerApi.setShuffle(enabled)
                resolve(Unit)
            } catch (e: Exception) {
                reject(e)
            }
        }
    }
    
    @NitroMethod
    fun setRepeatMode(mode: Int): Promise<Unit> {
        return Promise { resolve, reject ->
            try {
                val repeatMode = when (mode) {
                    0 -> Repeat.OFF
                    1 -> Repeat.ONE
                    2 -> Repeat.ALL
                    else -> Repeat.OFF
                }
                
                spotifyAppRemote.playerApi.setRepeat(repeatMode)
                resolve(Unit)
            } catch (e: Exception) {
                reject(e)
            }
        }
    }
    
    // MARK: - State & Metadata
    
    @NitroMethod
    fun getPlayerState(): Promise<Map<String, Any?>> {
        return Promise { resolve, reject ->
            try {
                spotifyAppRemote.playerApi.playerState
                    .setResultCallback { playerState ->
                        resolve(mapPlayerState(playerState))
                    }
                    .setErrorCallback { throwable ->
                        reject(throwable)
                    }
            } catch (e: Exception) {
                reject(e)
            }
        }
    }
    
    @NitroMethod
    fun getQueue(): Promise<List<Map<String, Any?>>> {
        return Promise { resolve, reject ->
            // The Spotify Android SDK doesn't provide direct queue access
            // This is a simplified implementation
            resolve(emptyList())
        }
    }
    
    // MARK: - Event Handling
    
    @NitroEvent("playerState")
    @NitroEvent("remoteError")
    @NitroEvent("queueChanged")
    
    // MARK: - Helper Methods
    
    private fun mapPlayerState(playerState: PlayerState): Map<String, Any?> {
        val track = mapTrack(playerState.track)
        
        return mapOf(
            "playing" to !playerState.isPaused,
            "repeating" to (playerState.playbackOptions.repeatMode != Repeat.OFF),
            "shuffling" to playerState.playbackOptions.isShuffling,
            "track" to track,
            "playbackPosition" to playerState.playbackPosition,
            "playbackSpeed" to 1.0,
            "isPaused" to playerState.isPaused,
            "restrictions" to mapOf(
                "canSkipNext" to true,
                "canSkipPrevious" to true,
                "canRepeatTrack" to true,
                "canRepeatContext" to true,
                "canToggleShuffle" to true,
                "canSeek" to true
            )
        )
    }
    
    private fun mapTrack(track: Track?): Map<String, Any?>? {
        if (track == null) return null
        
        val trackUri = track.uri
        val trackId = trackUri.split(":").lastOrNull() ?: ""
        
        val artistUri = track.artist.uri
        val artistId = artistUri.split(":").lastOrNull() ?: ""
        
        val albumUri = track.album.uri
        val albumId = albumUri.split(":").lastOrNull() ?: ""
        
        return mapOf(
            "id" to trackId,
            "name" to track.name,
            "uri" to track.uri,
            "duration" to track.duration,
            "artists" to listOf(
                mapOf(
                    "id" to artistId,
                    "name" to track.artist.name,
                    "uri" to track.artist.uri
                )
            ),
            "album" to mapOf(
                "id" to albumId,
                "name" to track.album.name,
                "uri" to track.album.uri,
                "images" to emptyList<Map<String, Any>>()
            ),
            "isPlayable" to true,
            "isEpisode" to false,
            "isPodcast" to false
        )
    }
    
    private fun mapError(throwable: Throwable): Map<String, Any> {
        return mapOf(
            "code" to 0,
            "message" to (throwable.message ?: "Unknown error"),
            "domain" to throwable.javaClass.name
        )
    }
}