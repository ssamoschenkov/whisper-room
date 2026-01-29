import { useRef, useState, useEffect } from 'react';
import { FileList } from '@/components/FileList';
import { TranscriptionEditor } from '@/components/TranscriptionEditor';
import { AudioPlayer } from '@/components/AudioPlayer';
import { EmptyState } from '@/components/EmptyState';
import { RecordingDialog } from '@/components/RecordingDialog';
import { useTranscriptionApi } from '@/hooks/useTranscriptionApi';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

const ACCEPTED_FORMATS = '.mp3,.m4a,.wav,.webm,.ogg';

export default function Index() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [recordingDialogOpen, setRecordingDialogOpen] = useState(false);
  
  const {
    files,
    activeFile,
    activeFileId,
    isBackendAvailable,
    setActiveFileId,
    addFile,
    addRecording,
    deleteFile,
    startTranscription,
    startTranscriptionAll,
    updateSegment,
    updateSpeakerName,
    replaceAllText,
  } = useTranscriptionApi();

  const {
    isPlaying,
    currentTime,
    duration,
    volume,
    loadAudio,
    toggle,
    seekTo,
    seekToAndPlay,
    setVolume,
    skipForward,
    skipBackward,
  } = useAudioPlayer();

  const {
    isRecording,
    recordingTime,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useAudioRecorder();

  // Load audio when active file changes
  useEffect(() => {
    if (activeFile?.audioUrl) {
      loadAudio(activeFile.audioUrl);
    }
  }, [activeFile?.id, activeFile?.audioUrl, loadAudio]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles) return;

    for (const file of Array.from(uploadedFiles)) {
      if (file.size > 300 * 1024 * 1024) {
        toast.error(`Файл ${file.name} превышает лимит 300МБ`);
        continue;
      }
      try {
        const id = await addFile(file);
        if (!activeFileId) {
          setActiveFileId(id);
        }
        toast.success(`Файл "${file.name}" добавлен`);
      } catch (error) {
        // Error already handled in addFile
      }
    }

    e.target.value = '';
  };

  const handleRecordingStop = async () => {
    const blob = await stopRecording();
    if (blob) {
      const name = `Запись ${new Date().toLocaleString('ru-RU')}.webm`;
      const id = await addRecording(blob, name);
      setActiveFileId(id);
      setRecordingDialogOpen(false);
      toast.success('Запись сохранена');
    }
  };

  const handleRecordClick = () => {
    if (isRecording) {
      handleRecordingStop();
    } else {
      setRecordingDialogOpen(true);
    }
  };

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_FORMATS}
        multiple
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Sidebar - File List (30%) */}
      <aside className="w-[30%] min-w-[280px] max-w-[400px] border-r border-border flex-shrink-0">
        <FileList
          files={files}
          activeFileId={activeFileId}
          onSelectFile={setActiveFileId}
          onDeleteFile={(id) => {
            deleteFile(id);
            toast.success('Файл удалён');
          }}
          onStartTranscription={startTranscription}
          onStartTranscriptionAll={startTranscriptionAll}
          onUploadClick={() => fileInputRef.current?.click()}
          onRecordClick={handleRecordClick}
          isRecording={isRecording}
          isBackendAvailable={isBackendAvailable}
        />
      </aside>

      {/* Main Content (70%) */}
      <main className="flex-1 flex flex-col min-w-0">
        {activeFile ? (
          <>
            <div className="flex-1 overflow-hidden">
              <TranscriptionEditor
                file={activeFile}
                currentTime={currentTime}
                onSeekTo={seekToAndPlay}
                onUpdateSegment={(segmentId, updates) => 
                  updateSegment(activeFile.id, segmentId, updates)
                }
                onUpdateSpeakerName={(oldName, newName) =>
                  updateSpeakerName(activeFile.id, oldName, newName)
                }
                onReplaceAll={(search, replace) =>
                  replaceAllText(activeFile.id, search, replace)
                }
                onDeleteFile={() => {
                  deleteFile(activeFile.id);
                  toast.success('Файл удалён');
                }}
              />
            </div>
            
            {activeFile.audioUrl && (
              <AudioPlayer
                isPlaying={isPlaying}
                currentTime={currentTime}
                duration={duration || activeFile.duration || 0}
                volume={volume}
                onTogglePlay={toggle}
                onSeek={seekTo}
                onVolumeChange={setVolume}
                onSkipForward={() => skipForward(10)}
                onSkipBackward={() => skipBackward(10)}
              />
            )}
          </>
        ) : (
          <EmptyState />
        )}
      </main>

      {/* Recording Dialog */}
      <RecordingDialog
        isOpen={recordingDialogOpen}
        isRecording={isRecording}
        recordingTime={recordingTime}
        onStart={startRecording}
        onStop={handleRecordingStop}
        onCancel={() => {
          cancelRecording();
          setRecordingDialogOpen(false);
        }}
        onClose={() => {
          if (!isRecording) {
            setRecordingDialogOpen(false);
          }
        }}
      />
    </div>
  );
}
