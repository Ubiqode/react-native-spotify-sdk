import Foundation
import SpotifyiOS
import NitroModules

@objc(SpotifyAuthNitro)
public class SpotifyAuthNitro: NitroMethods {
    
    private var sessionManager: SPTSessionManager?
    private var configuration: SPTConfiguration?
    private var player: SpotifyPlayerNitro?
    private var appRemote: SPTAppRemote?
    
    @NitroMethod
    public func connect(_ options: [String: Any]) -> Promise<SpotifyPlayerNitro> {
        return Promise { resolve, reject in
            guard let clientId = options["clientId"] as? String else {
                reject(NSError(domain: "SpotifyAuth", code: 1, userInfo: [NSLocalizedDescriptionKey: "Client ID is required"]))
                return
            }
            
            guard let redirectUrl = options["redirectUrl"] as? String else {
                reject(NSError(domain: "SpotifyAuth", code: 2, userInfo: [NSLocalizedDescriptionKey: "Redirect URL is required"]))
                return
            }
            
            self.configuration = SPTConfiguration(clientID: clientId, redirectURL: URL(string: redirectUrl)!)
            
            // Setup session manager
            self.sessionManager = SPTSessionManager(configuration: self.configuration!, delegate: self)
            
            // If we have an access token, use it directly
            if let accessToken = options["accessToken"] as? String {
                self.setupAppRemote(accessToken: accessToken)
                self.player = SpotifyPlayerNitro(appRemote: self.appRemote!)
                resolve(self.player!)
                return
            }
            
            // Otherwise, perform authorization
            let scope: SPTScope = .appRemoteControl | .playlistReadPrivate | .playlistModifyPublic | .userLibraryRead
            self.sessionManager?.initiateSession(with: scope, options: .default)
            
            // Handle auth completion in the delegate methods
            // This is a simplified implementation; you'll need proper delegate handling
            // and might need to store the promise to resolve it later
        }
    }
    
    @NitroMethod
    public func disconnect() -> Promise<Void> {
        return Promise { resolve, reject in
            guard let appRemote = self.appRemote else {
                reject(NSError(domain: "SpotifyAuth", code: 3, userInfo: [NSLocalizedDescriptionKey: "Not connected"]))
                return
            }
            
            appRemote.disconnect()
            self.appRemote = nil
            self.player = nil
            resolve(())
        }
    }
    
    @NitroMethod
    public func reconnect() -> Promise<Void> {
        return Promise { resolve, reject in
            guard let appRemote = self.appRemote, let accessToken = appRemote.connectionParameters.accessToken else {
                reject(NSError(domain: "SpotifyAuth", code: 4, userInfo: [NSLocalizedDescriptionKey: "No previous connection"]))
                return
            }
            
            appRemote.connect()
            resolve(())
        }
    }
    
    // Setup app remote with access token
    private func setupAppRemote(accessToken: String) {
        guard let config = self.configuration else { return }
        
        self.appRemote = SPTAppRemote(configuration: config, logLevel: .debug)
        self.appRemote?.connectionParameters.accessToken = accessToken
        self.appRemote?.delegate = self
        self.appRemote?.connect()
    }
}

// MARK: - SPTSessionManagerDelegate
extension SpotifyAuthNitro: SPTSessionManagerDelegate {
    public func sessionManager(manager: SPTSessionManager, didInitiate session: SPTSession) {
        self.setupAppRemote(accessToken: session.accessToken)
        // Here you would resolve the promise from the connect method
    }
    
    public func sessionManager(manager: SPTSessionManager, didFailWith error: Error) {
        // Here you would reject the promise from the connect method
    }
    
    public func sessionManager(manager: SPTSessionManager, didRenew session: SPTSession) {
        self.setupAppRemote(accessToken: session.accessToken)
    }
}

// MARK: - SPTAppRemoteDelegate
extension SpotifyAuthNitro: SPTAppRemoteDelegate {
    public func appRemoteDidEstablishConnection(_ appRemote: SPTAppRemote) {
        // Connection established
        self.player?.appRemoteConnected()
    }
    
    public func appRemote(_ appRemote: SPTAppRemote, didDisconnectWithError error: Error?) {
        // Connection lost
    }
    
    public func appRemote(_ appRemote: SPTAppRemote, didFailConnectionAttemptWithError error: Error?) {
        // Connection failed
    }
}

@objc(SpotifyPlayerNitro)
public class SpotifyPlayerNitro: NitroMethods {
    
    private var appRemote: SPTAppRemote
    private var playerApi: SPTAppRemotePlayerAPI?
    
    init(appRemote: SPTAppRemote) {
        self.appRemote = appRemote
        super.init()
    }
    
    func appRemoteConnected() {
        self.playerApi = self.appRemote.playerAPI
        self.setupPlayerStateSubscription()
    }
    
    private func setupPlayerStateSubscription() {
        self.playerApi?.subscribe { [weak self] (result, error) in
            guard error == nil, let playerState = result as? SPTAppRemotePlayerState else { return }
            self?.sendEvent("playerState", self?.mapPlayerState(playerState))
        }
    }
    
    // MARK: - Player Controls
    
    @NitroMethod
    public func play(_ options: [String: Any]) -> Promise<Void> {
        return Promise { resolve, reject in
            guard let playerApi = self.playerApi else {
                reject(NSError(domain: "SpotifyPlayer", code: 1, userInfo: [NSLocalizedDescriptionKey: "Player not ready"]))
                return
            }
            
            if let uri = options["uri"] as? String {
                playerApi.play(uri) { (result, error) in
                    if let error = error {
                        reject(error)
                    } else {
                        resolve(())
                    }
                }
            } else if let uris = options["uris"] as? [String], let offset = options["offset"] as? Int {
                // Handle playing a list of URIs with offset
                // This is a simplified version; you'd need to implement proper queue management
                playerApi.play(uris[offset]) { (result, error) in
                    if let error = error {
                        reject(error)
                    } else {
                        resolve(())
                    }
                }
            } else {
                reject(NSError(domain: "SpotifyPlayer", code: 2, userInfo: [NSLocalizedDescriptionKey: "Invalid play options"]))
            }
        }
    }
    
    @NitroMethod
    public func resume() -> Promise<Void> {
        return Promise { resolve, reject in
            guard let playerApi = self.playerApi else {
                reject(NSError(domain: "SpotifyPlayer", code: 1, userInfo: [NSLocalizedDescriptionKey: "Player not ready"]))
                return
            }
            
            playerApi.resume { (result, error) in
                if let error = error {
                    reject(error)
                } else {
                    resolve(())
                }
            }
        }
    }
    
    @NitroMethod
    public func pause() -> Promise<Void> {
        return Promise { resolve, reject in
            guard let playerApi = self.playerApi else {
                reject(NSError(domain: "SpotifyPlayer", code: 1, userInfo: [NSLocalizedDescriptionKey: "Player not ready"]))
                return
            }
            
            playerApi.pause { (result, error) in
                if let error = error {
                    reject(error)
                } else {
                    resolve(())
                }
            }
        }
    }
    
    @NitroMethod
    public func seek(_ positionMs: Int) -> Promise<Void> {
        return Promise { resolve, reject in
            guard let playerApi = self.playerApi else {
                reject(NSError(domain: "SpotifyPlayer", code: 1, userInfo: [NSLocalizedDescriptionKey: "Player not ready"]))
                return
            }
            
            playerApi.seek(toPosition: positionMs) { (result, error) in
                if let error = error {
                    reject(error)
                } else {
                    resolve(())
                }
            }
        }
    }
    
    @NitroMethod
    public func skipNext() -> Promise<Void> {
        return Promise { resolve, reject in
            guard let playerApi = self.playerApi else {
                reject(NSError(domain: "SpotifyPlayer", code: 1, userInfo: [NSLocalizedDescriptionKey: "Player not ready"]))
                return
            }
            
            playerApi.skipToNext { (result, error) in
                if let error = error {
                    reject(error)
                } else {
                    resolve(())
                }
            }
        }
    }
    
    @NitroMethod
    public func skipPrevious() -> Promise<Void> {
        return Promise { resolve, reject in
            guard let playerApi = self.playerApi else {
                reject(NSError(domain: "SpotifyPlayer", code: 1, userInfo: [NSLocalizedDescriptionKey: "Player not ready"]))
                return
            }
            
            playerApi.skipToPrevious { (result, error) in
                if let error = error {
                    reject(error)
                } else {
                    resolve(())
                }
            }
        }
    }
    
    @NitroMethod
    public func toggleShuffle(_ enabled: Bool) -> Promise<Void> {
        return Promise { resolve, reject in
            guard let playerApi = self.playerApi else {
                reject(NSError(domain: "SpotifyPlayer", code: 1, userInfo: [NSLocalizedDescriptionKey: "Player not ready"]))
                return
            }
            
            playerApi.setShuffle(enabled) { (result, error) in
                if let error = error {
                    reject(error)
                } else {
                    resolve(())
                }
            }
        }
    }
    
    @NitroMethod
    public func setRepeatMode(_ mode: Int) -> Promise<Void> {
        return Promise { resolve, reject in
            guard let playerApi = self.playerApi else {
                reject(NSError(domain: "SpotifyPlayer", code: 1, userInfo: [NSLocalizedDescriptionKey: "Player not ready"]))
                return
            }
            
            let repeatMode: SPTAppRemotePlaybackOptionsRepeatMode
            switch mode {
            case 0:
                repeatMode = .off
            case 1:
                repeatMode = .track
            case 2:
                repeatMode = .context
            default:
                repeatMode = .off
            }
            
            playerApi.setRepeat(repeatMode) { (result, error) in
                if let error = error {
                    reject(error)
                } else {
                    resolve(())
                }
            }
        }
    }
    
    // MARK: - State & Metadata
    
    @NitroMethod
    public func getPlayerState() -> Promise<[String: Any]> {
        return Promise { resolve, reject in
            guard let playerApi = self.playerApi else {
                reject(NSError(domain: "SpotifyPlayer", code: 1, userInfo: [NSLocalizedDescriptionKey: "Player not ready"]))
                return
            }
            
            playerApi.getPlayerState { (result, error) in
                if let error = error {
                    reject(error)
                } else if let playerState = result as? SPTAppRemotePlayerState {
                    resolve(self.mapPlayerState(playerState))
                } else {
                    reject(NSError(domain: "SpotifyPlayer", code: 3, userInfo: [NSLocalizedDescriptionKey: "Invalid player state"]))
                }
            }
        }
    }
    
    @NitroMethod
    public func getQueue() -> Promise<[[String: Any]]> {
        return Promise { resolve, reject in
            guard let playerApi = self.playerApi else {
                reject(NSError(domain: "SpotifyPlayer", code: 1, userInfo: [NSLocalizedDescriptionKey: "Player not ready"]))
                return
            }
            
            // This is a simplified implementation
            // The Spotify iOS SDK doesn't provide direct queue access like this
            // You would need to implement a more complex queue management system
            resolve([])
        }
    }
    
    // MARK: - Event Handling
    
    @NitroEvent("playerState")
    @NitroEvent("remoteError")
    @NitroEvent("queueChanged")
    
    // MARK: - Helper Methods
    
    private func mapPlayerState(_ playerState: SPTAppRemotePlayerState) -> [String: Any] {
        let track = self.mapTrack(playerState.track)
        
        return [
            "playing": !playerState.isPaused,
            "repeating": playerState.playbackOptions.repeatMode != .off,
            "shuffling": playerState.playbackOptions.isShuffling,
            "track": track,
            "playbackPosition": playerState.playbackPosition,
            "playbackSpeed": 1.0,
            "isPaused": playerState.isPaused,
            "restrictions": [
                "canSkipNext": true,
                "canSkipPrevious": true,
                "canRepeatTrack": true,
                "canRepeatContext": true,
                "canToggleShuffle": true,
                "canSeek": true
            ]
        ]
    }
    
    private func mapTrack(_ track: SPTAppRemoteTrack?) -> [String: Any]? {
        guard let track = track else { return nil }
        
        return [
            "id": track.uri.components(separatedBy: ":").last ?? "",
            "name": track.name,
            "uri": track.uri,
            "duration": track.duration,
            "artists": [
                [
                    "id": track.artist.uri.components(separatedBy: ":").last ?? "",
                    "name": track.artist.name,
                    "uri": track.artist.uri
                ]
            ],
            "album": [
                "id": track.album.uri.components(separatedBy: ":").last ?? "",
                "name": track.album.name,
                "uri": track.album.uri,
                "images": []
            ],
            "isPlayable": true,
            "isEpisode": false,
            "isPodcast": false
        ]
    }
}