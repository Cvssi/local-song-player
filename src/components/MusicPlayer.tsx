import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Shuffle,
  Repeat,
  Music,
  Upload,
  Heart,
  HeartOff,
  Image as ImageIcon,
} from 'lucide-react';
import { extractAlbumArt } from '../utils/mediaUtils';

interface Song {
  name: string;
  url: string;
  id: string;
  albumArt?: string;
}

export default function MusicPlayer() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentSong, setCurrentSong] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'none' | 'all' | 'one'>('none');
  const [likedSongs, setLikedSongs] = useState<Set<string>>(new Set());
  const [showLikedOnly, setShowLikedOnly] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const progressBarRef = useRef<HTMLInputElement>(null);
  const [shuffledQueue, setShuffledQueue] = useState<number[]>([]);

  // Filter songs based on liked status
  const displayedSongs = showLikedOnly
    ? songs.filter((song) => likedSongs.has(song.id))
    : songs;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newSongs = await Promise.all(
        Array.from(e.target.files).map(async (file) => {
          const albumArt = await extractAlbumArt(file);
          return {
            name: file.name,
            url: URL.createObjectURL(file),
            id: Math.random().toString(36).substr(2, 9),
            albumArt,
          };
        })
      );
      setSongs((prev) => [...prev, ...newSongs]);
    }
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const toggleShuffle = () => {
    setIsShuffled(!isShuffled);
    if (!isShuffled) {
      const newQueue = Array.from({ length: songs.length }, (_, i) => i)
        .filter((i) => i !== currentSong)
        .sort(() => Math.random() - 0.5);
      newQueue.unshift(currentSong);
      setShuffledQueue(newQueue);
    }
  };

  const toggleRepeat = () => {
    const modes: ('none' | 'all' | 'one')[] = ['none', 'all', 'one'];
    const currentIndex = modes.indexOf(repeatMode);
    setRepeatMode(modes[(currentIndex + 1) % modes.length]);
  };

  const playNext = () => {
    if (songs.length === 0) return;

    if (repeatMode === 'one') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
      return;
    }

    let nextIndex: number;
    if (isShuffled) {
      const currentQueueIndex = shuffledQueue.indexOf(currentSong);
      nextIndex = shuffledQueue[(currentQueueIndex + 1) % songs.length];
    } else {
      nextIndex = (currentSong + 1) % songs.length;
    }

    setCurrentSong(nextIndex);
  };

  const playPrevious = () => {
    if (songs.length === 0) return;

    if (currentTime > 3) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
      }
      return;
    }

    let prevIndex: number;
    if (isShuffled) {
      const currentQueueIndex = shuffledQueue.indexOf(currentSong);
      prevIndex =
        shuffledQueue[(currentQueueIndex - 1 + songs.length) % songs.length];
    } else {
      prevIndex = (currentSong - 1 + songs.length) % songs.length;
    }

    setCurrentSong(prevIndex);
  };

  const handleSongEnd = () => {
    if (repeatMode === 'one') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    } else if (repeatMode === 'all' || songs.length > 1) {
      playNext();
    } else {
      setIsPlaying(false);
    }
  };

  const toggleLike = (songId: string) => {
    setLikedSongs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(songId)) {
        newSet.delete(songId);
      } else {
        newSet.add(songId);
      }
      return newSet;
    });
  };

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play();
      } else {
        audioRef.current.pause();
      }
    }
  }, [currentSong]);

  const currentAlbumArt = songs[currentSong]?.albumArt;

  return (
    <div className="relative flex flex-col h-screen overflow-hidden">
      {/* Background with blur */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-all duration-700 ease-in-out"
        style={{
          backgroundImage: currentAlbumArt
            ? `url(${currentAlbumArt})`
            : 'linear-gradient(to bottom, rgb(17, 24, 39), rgb(0, 0, 0))',
          filter: 'blur(20px) brightness(0.4)',
          transform: 'scale(1.1)',
        }}
      />

      {/* Content */}
      <div className="relative flex-1 flex flex-col z-10">
        <div className="flex-1 p-8 overflow-auto">
          <div className="max-w-4xl mx-auto">
            {/* Current Song Album Art */}
            {currentAlbumArt && (
              <div className="mb-8 flex justify-center">
                <img
                  src={currentAlbumArt}
                  alt="Album Art"
                  className="w-64 h-64 object-cover rounded-lg shadow-2xl"
                />
              </div>
            )}

            <div className="mb-8 flex justify-between items-center">
              <label className="inline-flex items-center px-6 py-3 bg-green-500 rounded-full cursor-pointer hover:bg-green-600 transition-colors">
                <Upload className="mr-2" />
                Choose Files
                <input
                  type="file"
                  accept="audio/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              <button
                onClick={() => setShowLikedOnly(!showLikedOnly)}
                className={`px-6 py-3 rounded-full transition-colors ${
                  showLikedOnly
                    ? 'bg-pink-600 hover:bg-pink-700'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                {showLikedOnly ? 'Show All Songs' : 'Show Liked Songs'}
              </button>
            </div>

            {/* Playlist */}
            <div className="bg-gray-800/60 backdrop-blur-md rounded-lg p-4">
              {displayedSongs.length === 0 ? (
                <div className="text-center py-12">
                  <Music className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-400">
                    {showLikedOnly
                      ? 'No liked songs yet'
                      : 'No songs uploaded yet'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {displayedSongs.map((song) => (
                    <div
                      key={song.id}
                      onClick={() => setCurrentSong(songs.indexOf(song))}
                      className={`flex items-center justify-between p-3 rounded-md cursor-pointer ${
                        currentSong === songs.indexOf(song)
                          ? 'bg-gray-700/80 text-green-500'
                          : 'hover:bg-gray-700/60'
                      }`}
                    >
                      <div className="flex items-center flex-1">
                        {song.albumArt ? (
                          <img
                            src={song.albumArt}
                            alt="Album Art"
                            className="w-8 h-8 rounded mr-3 object-cover"
                          />
                        ) : (
                          <ImageIcon className="w-8 h-8 mr-3 text-gray-400" />
                        )}
                        <span className="truncate">{song.name}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLike(song.id);
                        }}
                        className="ml-4 text-pink-500 hover:text-pink-400"
                      >
                        {likedSongs.has(song.id) ? (
                          <Heart className="w-5 h-5 fill-current" />
                        ) : (
                          <HeartOff className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Player Controls */}
        <div className="bg-gray-900/60 backdrop-blur-md border-t border-gray-800/50 p-4">
          <div className="max-w-4xl mx-auto">
            <audio
              ref={audioRef}
              src={songs[currentSong]?.url}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={handleSongEnd}
            />

            {/* Song Info */}
            <div className="text-center mb-4">
              <p className="font-medium">
                {songs[currentSong]?.name || 'No song selected'}
              </p>
            </div>

            {/* Controls */}
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-6">
                <button
                  onClick={toggleShuffle}
                  className={`${
                    isShuffled ? 'text-green-500' : 'text-gray-400'
                  } hover:text-white`}
                >
                  <Shuffle className="w-5 h-5" />
                </button>
                <button
                  onClick={playPrevious}
                  className="text-gray-400 hover:text-white"
                >
                  <SkipBack className="w-8 h-8" />
                </button>
                <button
                  onClick={togglePlay}
                  className="bg-white rounded-full p-2 hover:scale-105 transition-transform"
                >
                  {isPlaying ? (
                    <Pause className="w-8 h-8 text-black" />
                  ) : (
                    <Play className="w-8 h-8 text-black" />
                  )}
                </button>
                <button
                  onClick={playNext}
                  className="text-gray-400 hover:text-white"
                >
                  <SkipForward className="w-8 h-8" />
                </button>
                <button
                  onClick={toggleRepeat}
                  className={`${
                    repeatMode !== 'none' ? 'text-green-500' : 'text-gray-400'
                  } hover:text-white relative`}
                >
                  <Repeat className="w-5 h-5" />
                  {repeatMode === 'one' && (
                    <span className="absolute -top-2 -right-2 text-xs">1</span>
                  )}
                </button>
              </div>

              {/* Progress Bar */}
              <div className="w-full flex items-center gap-3">
                <span className="text-xs text-gray-400">
                  {formatTime(currentTime)}
                </span>
                <input
                  ref={progressBarRef}
                  type="range"
                  min={0}
                  max={duration}
                  value={currentTime}
                  onChange={handleProgressChange}
                  className="flex-1 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                />
                <span className="text-xs text-gray-400">
                  {formatTime(duration)}
                </span>
              </div>

              {/* Volume Control */}
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleMute}
                  className="text-gray-400 hover:text-white"
                >
                  {isMuted ? (
                    <VolumeX className="w-5 h-5" />
                  ) : (
                    <Volume2 className="w-5 h-5" />
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-24 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
