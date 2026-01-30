import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatTime } from '@/utils/formatters';
import { cn } from '@/lib/utils';

interface AudioPlayerProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
  onPlaybackRateChange: (rate: number) => void;
  onSkipForward: () => void;
  onSkipBackward: () => void;
}

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

export function AudioPlayer({
  isPlaying,
  currentTime,
  duration,
  volume,
  playbackRate,
  onTogglePlay,
  onSeek,
  onVolumeChange,
  onPlaybackRateChange,
  onSkipForward,
  onSkipBackward,
}: AudioPlayerProps) {
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="player-container px-6 py-4">
      <div className="flex items-center gap-4">
        {/* Controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onSkipBackward}
            className="h-9 w-9 p-0 rounded-full"
          >
            <SkipBack className="w-4 h-4" />
          </Button>
          
          <Button
            onClick={onTogglePlay}
            size="sm"
            className="h-10 w-10 p-0 rounded-full"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4 ml-0.5" />
            )}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onSkipForward}
            className="h-9 w-9 p-0 rounded-full"
          >
            <SkipForward className="w-4 h-4" />
          </Button>
        </div>

        {/* Playback Speed */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2.5 min-w-[52px] font-mono text-xs"
            >
              {playbackRate}x
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {PLAYBACK_RATES.map((rate) => (
              <DropdownMenuItem
                key={rate}
                onClick={() => onPlaybackRateChange(rate)}
                className={cn(
                  "font-mono",
                  rate === playbackRate && "bg-accent"
                )}
              >
                {rate}x
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Time & Progress */}
        <div className="flex-1 flex items-center gap-3">
          <span className="text-xs font-mono text-muted-foreground w-12 text-right tabular-nums">
            {formatTime(currentTime)}
          </span>
          
          <div className="flex-1 relative group">
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={(e) => onSeek(parseFloat(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div 
              className={cn(
                "absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full",
                "opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
              )}
              style={{ left: `calc(${progress}% - 6px)` }}
            />
          </div>
          
          <span className="text-xs font-mono text-muted-foreground w-12 tabular-nums">
            {formatTime(duration)}
          </span>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-2 w-32">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onVolumeChange(volume > 0 ? 0 : 1)}
            className="h-8 w-8 p-0"
          >
            {volume === 0 ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </Button>
          <Slider
            value={[volume * 100]}
            max={100}
            step={1}
            onValueChange={(values) => onVolumeChange(values[0] / 100)}
            className="w-20"
          />
        </div>
      </div>
    </div>
  );
}
