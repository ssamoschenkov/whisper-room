import { useState, useRef, useCallback, useEffect } from 'react';

export function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [audioVersion, setAudioVersion] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => setDuration(audio.duration || 0);
    const handleEnded = () => setIsPlaying(false);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, [audioVersion]);

  const loadAudio = useCallback((url: string) => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    audioRef.current.src = url;
    audioRef.current.load();
    setCurrentTime(0);
    setIsPlaying(false);
    setAudioVersion(v => v + 1);
  }, []);

  const play = useCallback(() => {
    audioRef.current?.play();
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const toggle = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const seekTo = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const seekToAndPlay = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
      audioRef.current.play();
    }
  }, []);

  const setAudioVolume = useCallback((vol: number) => {
    if (audioRef.current) {
      audioRef.current.volume = vol;
    }
    setVolume(vol);
  }, []);

  const setAudioPlaybackRate = useCallback((rate: number) => {
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
    setPlaybackRate(rate);
  }, []);

  const skipForward = useCallback((seconds: number = 10) => {
    if (audioRef.current) {
      const newTime = Math.min(audioRef.current.currentTime + seconds, duration);
      audioRef.current.currentTime = newTime;
    }
  }, [duration]);

  const skipBackward = useCallback((seconds: number = 10) => {
    if (audioRef.current) {
      const newTime = Math.max(audioRef.current.currentTime - seconds, 0);
      audioRef.current.currentTime = newTime;
    }
  }, []);

  return {
    isPlaying,
    currentTime,
    duration,
    volume,
    playbackRate,
    loadAudio,
    play,
    pause,
    toggle,
    seekTo,
    seekToAndPlay,
    setVolume: setAudioVolume,
    setPlaybackRate: setAudioPlaybackRate,
    skipForward,
    skipBackward,
  };
}
