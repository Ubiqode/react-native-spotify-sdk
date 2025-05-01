import ParallaxScrollView from "@/components/ParallaxScrollView";
import { ThemedText } from "@/components/ThemedText";
import { IconSymbol } from "@/components/ui/IconSymbol";

import { ThemedView } from "@/components/ThemedView";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Button, StyleSheet } from "react-native";
import { useSpotify } from "react-native-spotify-sdk";

// Replace with your own Spotify credentials
const SPOTIFY_CLIENT_ID = "your-spotify-client-id";
const SPOTIFY_REDIRECT_URL = "example://spotify-auth-callback";

export default function ExploreScreen() {
	const spotify = useSpotify();
	const [currentTime, setCurrentTime] = useState<string>("0:00");
	const [totalTime, setTotalTime] = useState<string>("0:00");

	// Format milliseconds to mm:ss
	const formatTime = (ms: number) => {
		const totalSeconds = Math.floor(ms / 1000);
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds % 60;
		return `${minutes}:${seconds.toString().padStart(2, "0")}`;
	};

	// Update time display
	useEffect(() => {
		if (spotify.playerState) {
			setCurrentTime(formatTime(spotify.playerState.playbackPosition));

			if (spotify.playerState.track) {
				setTotalTime(formatTime(spotify.playerState.track.duration));
			}
		}
	}, [spotify.playerState]);

	// Handle connect button
	const handleConnect = async () => {
		try {
			await spotify.connect({
				clientId: SPOTIFY_CLIENT_ID,
				redirectUrl: SPOTIFY_REDIRECT_URL,
				scope: [
					"streaming",
					"app-remote-control",
					"user-read-playback-state",
					"user-modify-playback-state",
					"user-read-currently-playing",
				],
			});
		} catch (error) {
			console.error("Failed to connect:", error);
		}
	};

	// Play a sample track
	const playSampleTrack = async () => {
		try {
			await spotify.play({
				uri: "spotify:track:0VjIjW4GlUZAMYd2vXMi3b", // Sample track URI
			});
		} catch (error) {
			console.error("Failed to play track:", error);
		}
	};

	if (spotify.isConnecting) {
		return (
			<ThemedView style={styles.container}>
				<ActivityIndicator size="large" color="#1DB954" />
				<ThemedText style={styles.text}>Connecting to Spotify...</ThemedText>
			</ThemedView>
		);
	}

	if (!spotify.isConnected) {
		return (
			<ThemedView style={styles.container}>
				<ThemedText style={styles.title}>Spotify Player</ThemedText>
				<Button
					title="Connect to Spotify"
					onPress={handleConnect}
					color="#1DB954"
				/>
				{spotify.connectionError && (
					<ThemedText style={styles.error}>
						Error: {spotify.connectionError.message}
					</ThemedText>
				)}
			</ThemedView>
		);
	}

	return (
		<ParallaxScrollView
			headerBackgroundColor={{ light: "#D0D0D0", dark: "#353636" }}
			headerImage={
				<IconSymbol
					size={310}
					color="#808080"
					name="chevron.left.forwardslash.chevron.right"
					style={styles.headerImage}
				/>
			}
		>
			<ThemedText style={styles.title}>Spotify Player</ThemedText>

			{/* Track Info */}
			{spotify.playerState?.track ? (
				<ThemedView style={styles.trackInfo}>
					<ThemedText style={styles.trackName}>
						{spotify.playerState.track.name}
					</ThemedText>
					<ThemedText style={styles.artistName}>
						{spotify.playerState.track.artists.map((a) => a.name).join(", ")}
					</ThemedText>
				</ThemedView>
			) : (
				<ThemedText style={styles.noTrack}>No track playing</ThemedText>
			)}

			{/* Playback Position */}
			<ThemedView style={styles.timeContainer}>
				<ThemedText style={styles.timeText}>
					{currentTime} / {totalTime}
				</ThemedText>
			</ThemedView>

			{/* Playback Controls */}
			<ThemedView style={styles.controls}>
				<Button
					title="Previous"
					onPress={spotify.skipPrevious}
					color="#1DB954"
				/>

				{spotify.playerState?.playing ? (
					<Button title="Pause" onPress={spotify.pause} color="#1DB954" />
				) : (
					<Button title="Resume" onPress={spotify.resume} color="#1DB954" />
				)}

				<Button title="Next" onPress={spotify.skipNext} color="#1DB954" />
			</ThemedView>

			{/* Additional Controls */}
			<ThemedView style={styles.additionalControls}>
				<Button
					title={
						spotify.playerState?.shuffling ? "Shuffle: On" : "Shuffle: Off"
					}
					onPress={() => spotify.toggleShuffle(!spotify.playerState?.shuffling)}
					color="#1DB954"
				/>

				<Button
					title="Play Sample Track"
					onPress={playSampleTrack}
					color="#1DB954"
				/>

				<Button
					title={spotify.playerState?.repeating ? "Repeat: On" : "Repeat: Off"}
					onPress={() =>
						spotify.setRepeatMode(
							spotify.playerState?.repeating
								? RepeatMode.OFF
								: RepeatMode.CONTEXT,
						)
					}
					color="#1DB954"
				/>
			</ThemedView>

			{/* Disconnect Button */}
			<Button title="Disconnect" onPress={spotify.disconnect} color="#E74C3C" />
		</ParallaxScrollView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		padding: 20,
		backgroundColor: "#121212",
	},
	title: {
		fontSize: 24,
		fontWeight: "bold",
		color: "#FFFFFF",
		marginBottom: 20,
	},
	headerImage: {
		color: "#808080",
		bottom: -90,
		left: -35,
		position: "absolute",
	},
	text: {
		color: "#FFFFFF",
		marginTop: 10,
	},
	error: {
		color: "#E74C3C",
		marginTop: 10,
	},
	trackInfo: {
		alignItems: "center",
		marginBottom: 20,
		padding: 20,
		backgroundColor: "#282828",
		borderRadius: 10,
		width: "100%",
	},
	trackName: {
		fontSize: 18,
		fontWeight: "bold",
		color: "#FFFFFF",
		textAlign: "center",
	},
	artistName: {
		fontSize: 16,
		color: "#B3B3B3",
		textAlign: "center",
	},
	noTrack: {
		color: "#B3B3B3",
		fontSize: 16,
		marginBottom: 20,
	},
	timeContainer: {
		marginBottom: 20,
	},
	timeText: {
		color: "#B3B3B3",
		fontSize: 16,
	},
	controls: {
		flexDirection: "row",
		justifyContent: "space-around",
		width: "100%",
		marginBottom: 20,
	},
	additionalControls: {
		flexDirection: "column",
		width: "100%",
		marginBottom: 20,
		gap: 10,
	},
});
