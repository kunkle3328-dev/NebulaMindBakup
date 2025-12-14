
import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { AudioContext, AudioTrack } from '../contexts';

export const AudioProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentTrack, setCurrentTrack] = useState<AudioTrack | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

    // Initialize Audio Context & Analyser once
    useEffect(() => {
        if (!audioRef.current) {
            audioRef.current = new Audio();
            audioRef.current.crossOrigin = "anonymous";
            // Important for some browsers to allow seeking before full load
            audioRef.current.preload = "metadata";
        }

        // Event Listeners
        const audio = audioRef.current;
        
        const updateTime = () => setCurrentTime(audio.currentTime);
        const updateDuration = () => {
            if (!isNaN(audio.duration) && audio.duration !== Infinity) {
                setDuration(audio.duration);
            }
        };
        const onEnded = () => setIsPlaying(false);
        const onPlay = () => setIsPlaying(true);
        const onPause = () => setIsPlaying(false);
        const onError = (e: Event) => console.error("Audio Error:", e);

        audio.addEventListener('timeupdate', updateTime);
        audio.addEventListener('loadedmetadata', updateDuration);
        audio.addEventListener('durationchange', updateDuration);
        audio.addEventListener('ended', onEnded);
        audio.addEventListener('play', onPlay);
        audio.addEventListener('pause', onPause);
        audio.addEventListener('error', onError);

        return () => {
            audio.removeEventListener('timeupdate', updateTime);
            audio.removeEventListener('loadedmetadata', updateDuration);
            audio.removeEventListener('durationchange', updateDuration);
            audio.removeEventListener('ended', onEnded);
            audio.removeEventListener('play', onPlay);
            audio.removeEventListener('pause', onPause);
            audio.removeEventListener('error', onError);
        };
    }, []);

    // Setup Web Audio API for Visualization
    useEffect(() => {
        const initWebAudio = () => {
            if (!audioContextRef.current && audioRef.current) {
                const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
                const ctx = new AudioCtx();
                const analyser = ctx.createAnalyser();
                analyser.fftSize = 128;
                
                try {
                    // Create MediaElementSource only once
                    if (!sourceRef.current) {
                        const source = ctx.createMediaElementSource(audioRef.current);
                        source.connect(analyser);
                        analyser.connect(ctx.destination);
                        sourceRef.current = source;
                    }
                    
                    audioContextRef.current = ctx;
                    analyserRef.current = analyser;
                } catch (e) {
                    console.warn("Web Audio API setup failed (likely already connected):", e);
                }
            }
        };

        // Initialize on first user interaction to satisfy autoplay policies
        const handleInteract = () => {
            initWebAudio();
            if (audioContextRef.current?.state === 'suspended') {
                audioContextRef.current.resume();
            }
            window.removeEventListener('click', handleInteract);
            window.removeEventListener('touchstart', handleInteract);
        };

        window.addEventListener('click', handleInteract);
        window.addEventListener('touchstart', handleInteract);

        return () => {
            window.removeEventListener('click', handleInteract);
            window.removeEventListener('touchstart', handleInteract);
        };
    }, []);

    // Media Session API Sync
    useEffect(() => {
        if ('mediaSession' in navigator && currentTrack) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: currentTrack.title,
                artist: "Nebula Mind AI",
                album: currentTrack.topic || "Research Overview",
                artwork: currentTrack.coverUrl ? [{ src: currentTrack.coverUrl, sizes: '512x512', type: 'image/png' }] : []
            });

            navigator.mediaSession.setActionHandler('play', () => {
                if (audioRef.current) audioRef.current.play();
            });
            navigator.mediaSession.setActionHandler('pause', () => {
                if (audioRef.current) audioRef.current.pause();
            });
            navigator.mediaSession.setActionHandler('seekto', (details) => {
                if (details.seekTime && audioRef.current) {
                    audioRef.current.currentTime = details.seekTime;
                }
            });
        }
    }, [currentTrack]);

    const playTrack = async (track: AudioTrack) => {
        if (!audioRef.current) return;
        
        // Ensure AudioContext is running (fix for 'doesn't play' issue)
        if (audioContextRef.current?.state === 'suspended') {
            await audioContextRef.current.resume();
        }

        // If same track, just toggle
        if (currentTrack?.url === track.url) {
            togglePlayPause();
            return;
        }

        setCurrentTrack(track);
        audioRef.current.src = track.url;
        audioRef.current.load(); // Explicitly load the new source
        
        try {
            await audioRef.current.play();
        } catch (e) {
            console.error("Playback failed:", e);
        }
    };

    const togglePlayPause = async () => {
        if (!audioRef.current) return;
        
        if (audioContextRef.current?.state === 'suspended') {
            await audioContextRef.current.resume();
        }

        if (audioRef.current.paused) {
            try {
                await audioRef.current.play();
            } catch (e) {
                console.error("Resume playback failed:", e);
            }
        } else {
            audioRef.current.pause();
        }
    };

    const seek = (time: number) => {
        if (audioRef.current) {
            audioRef.current.currentTime = time;
        }
    };

    return (
        <AudioContext.Provider value={{
            isPlaying,
            currentTrack,
            currentTime,
            duration,
            playTrack,
            togglePlayPause,
            seek,
            analyser: analyserRef.current
        }}>
            {children}
        </AudioContext.Provider>
    );
};
