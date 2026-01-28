import { Mic, Square, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatTime } from '@/utils/formatters';

interface RecordingDialogProps {
  isOpen: boolean;
  isRecording: boolean;
  recordingTime: number;
  onStart: () => void;
  onStop: () => void;
  onCancel: () => void;
  onClose: () => void;
}

export function RecordingDialog({
  isOpen,
  isRecording,
  recordingTime,
  onStart,
  onStop,
  onCancel,
  onClose,
}: RecordingDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Запись аудио</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center py-8">
          {/* Recording indicator */}
          <div className="relative mb-6">
            <div className={`
              w-24 h-24 rounded-full flex items-center justify-center
              ${isRecording 
                ? 'bg-destructive/10 text-destructive' 
                : 'bg-muted text-muted-foreground'
              }
            `}>
              <Mic className={`w-10 h-10 ${isRecording ? 'animate-pulse' : ''}`} />
            </div>
            {isRecording && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full animate-pulse" />
            )}
          </div>

          {/* Timer */}
          <div className="text-3xl font-mono font-medium mb-8 tabular-nums">
            {formatTime(recordingTime)}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            {!isRecording ? (
              <Button onClick={onStart} size="lg" className="px-8">
                <Mic className="w-5 h-5 mr-2" />
                Начать запись
              </Button>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  size="lg" 
                  onClick={onCancel}
                  className="px-6"
                >
                  <X className="w-5 h-5 mr-2" />
                  Отмена
                </Button>
                <Button 
                  variant="destructive" 
                  size="lg" 
                  onClick={onStop}
                  className="px-6"
                >
                  <Square className="w-5 h-5 mr-2" />
                  Остановить
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
