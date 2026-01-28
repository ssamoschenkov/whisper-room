import { Upload, Mic, Play, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatFileSize, formatDate, getFileExtension, getStatusLabel } from '@/utils/formatters';
import type { AudioFile } from '@/types/transcription';

interface FileListProps {
  files: AudioFile[];
  activeFileId: string | null;
  onSelectFile: (id: string) => void;
  onDeleteFile: (id: string) => void;
  onStartTranscription: (id: string) => void;
  onStartTranscriptionAll: () => void;
  onUploadClick: () => void;
  onRecordClick: () => void;
  isRecording: boolean;
}

export function FileList({
  files,
  activeFileId,
  onSelectFile,
  onDeleteFile,
  onStartTranscription,
  onStartTranscriptionAll,
  onUploadClick,
  onRecordClick,
  isRecording,
}: FileListProps) {
  const pendingCount = files.filter(f => f.status === 'pending').length;

  return (
    <div className="h-full flex flex-col bg-sidebar text-sidebar-foreground">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <h1 className="text-lg font-semibold mb-3">Транскриптор</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onUploadClick}
            className="flex-1 bg-sidebar-accent border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent/80"
          >
            <Upload className="w-4 h-4 mr-1.5" />
            Загрузить
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRecordClick}
            className={cn(
              "flex-1 border-sidebar-border",
              isRecording 
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" 
                : "bg-sidebar-accent text-sidebar-foreground hover:bg-sidebar-accent/80"
            )}
          >
            <Mic className={cn("w-4 h-4 mr-1.5", isRecording && "animate-pulse")} />
            {isRecording ? 'Стоп' : 'Запись'}
          </Button>
        </div>
      </div>

      {/* File List */}
      <div className="flex-1 overflow-y-auto">
        {files.length === 0 ? (
          <div className="p-4 text-center text-sidebar-muted">
            <p className="text-sm">Нет файлов</p>
            <p className="text-xs mt-1">Загрузите аудио или начните запись</p>
          </div>
        ) : (
          <div className="divide-y divide-sidebar-border">
            {files.map((file) => (
              <FileRow
                key={file.id}
                file={file}
                isActive={file.id === activeFileId}
                onSelect={() => onSelectFile(file.id)}
                onDelete={() => onDeleteFile(file.id)}
                onTranscribe={() => onStartTranscription(file.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {pendingCount > 0 && (
        <div className="p-3 border-t border-sidebar-border">
          <Button 
            onClick={onStartTranscriptionAll}
            className="w-full bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
            size="sm"
          >
            <Play className="w-4 h-4 mr-1.5" />
            Распознать все ({pendingCount})
          </Button>
        </div>
      )}
    </div>
  );
}

interface FileRowProps {
  file: AudioFile;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onTranscribe: () => void;
}

function FileRow({ file, isActive, onSelect, onDelete, onTranscribe }: FileRowProps) {
  const statusColors: Record<string, string> = {
    pending: 'bg-sidebar-muted/20 text-sidebar-muted',
    processing: 'bg-sidebar-primary/20 text-sidebar-primary',
    ready: 'bg-green-500/20 text-green-400',
    error: 'bg-destructive/20 text-destructive',
  };

  return (
    <div
      onClick={onSelect}
      className={cn(
        "p-3 cursor-pointer transition-colors hover:bg-sidebar-accent/50",
        isActive && "bg-sidebar-accent"
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{file.name}</p>
          <div className="flex items-center gap-2 mt-1 text-xs text-sidebar-muted">
            <span>{getFileExtension(file.name)}</span>
            <span>•</span>
            <span>{formatFileSize(file.size)}</span>
          </div>
        </div>
        <Badge 
          variant="secondary" 
          className={cn("text-[10px] shrink-0", statusColors[file.status])}
        >
          {file.status === 'processing' && (
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          )}
          {getStatusLabel(file.status)}
        </Badge>
      </div>
      
      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] text-sidebar-muted">
          {formatDate(file.createdAt)}
        </span>
        <div className="flex items-center gap-1">
          {file.status === 'pending' && (
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => { e.stopPropagation(); onTranscribe(); }}
              className="h-6 px-2 text-xs text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <Play className="w-3 h-3 mr-1" />
              Распознать
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="h-6 w-6 p-0 text-sidebar-muted hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
