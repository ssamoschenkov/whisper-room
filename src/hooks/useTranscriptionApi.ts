import { useState, useCallback, useEffect, useRef } from 'react';
import { api, ApiFileInfo, ApiStatus } from '@/lib/api';
import type { AudioFile, TranscriptionSegment, FileStatus } from '@/types/transcription';
import { toast } from 'sonner';

// Check if backend is available
const checkBackendAvailable = async (): Promise<boolean> => {
  try {
    await api.healthCheck();
    return true;
  } catch {
    return false;
  }
};

// Create mock segments for demo mode
const createMockSegments = (): TranscriptionSegment[] => [
  { id: '1', start: 0, end: 5.2, speaker: 'Голос 1', text: 'Добрый день, коллеги. Начинаем наше еженедельное совещание по проекту.' },
  { id: '2', start: 5.5, end: 12.8, speaker: 'Голос 2', text: 'Здравствуйте. У меня есть несколько важных обновлений по разработке.' },
  { id: '3', start: 13.2, end: 22.5, speaker: 'Голос 1', text: 'Отлично, давайте начнём с вашего отчёта. Какой текущий статус работ по модулю авторизации?' },
  { id: '4', start: 23.0, end: 35.7, speaker: 'Голос 2', text: 'Модуль авторизации завершён на восемьдесят процентов. Осталось реализовать двухфакторную аутентификацию и провести тестирование безопасности.' },
  { id: '5', start: 36.2, end: 42.1, speaker: 'Голос 3', text: 'Я могу помочь с тестированием. У меня есть опыт работы с подобными системами.' },
  { id: '6', start: 42.8, end: 55.3, speaker: 'Голос 1', text: 'Хорошо, это ускорит процесс. Давайте обсудим сроки. Когда вы планируете завершить основной функционал?' },
  { id: '7', start: 56.0, end: 68.4, speaker: 'Голос 2', text: 'При условии помощи с тестированием, мы можем закончить к концу следующей недели. Нужно также учесть время на документацию.' },
  { id: '8', start: 69.0, end: 78.2, speaker: 'Голос 3', text: 'По документации я тоже могу взять часть работы на себя. Особенно техническую часть для разработчиков.' },
];

export function useTranscriptionApi() {
  const [files, setFiles] = useState<AudioFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [isBackendAvailable, setIsBackendAvailable] = useState<boolean | null>(null);
  const pollingIntervals = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const activeFile = files.find(f => f.id === activeFileId) || null;

  // Check backend on mount
  useEffect(() => {
    checkBackendAvailable().then(available => {
      setIsBackendAvailable(available);
      if (!available) {
        console.log('Backend not available, running in demo mode');
      }
    });
  }, []);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      pollingIntervals.current.forEach(interval => clearInterval(interval));
    };
  }, []);

  const updateFileStatus = useCallback((fileId: string, status: FileStatus, progress?: number) => {
    setFiles(prev => prev.map(f =>
      f.id === fileId ? { ...f, status, progress: progress ?? f.progress } : f
    ));
  }, []);

  const pollStatus = useCallback((fileId: string) => {
    const poll = async () => {
      try {
        const status = await api.getStatus(fileId);
        
        setFiles(prev => prev.map(f =>
          f.id === fileId ? { ...f, status: status.status, progress: status.progress } : f
        ));

        if (status.status === 'ready') {
          // Stop polling and fetch transcript
          const interval = pollingIntervals.current.get(fileId);
          if (interval) {
            clearInterval(interval);
            pollingIntervals.current.delete(fileId);
          }

          const transcript = await api.getTranscript(fileId);
          setFiles(prev => prev.map(f =>
            f.id === fileId ? {
              ...f,
              status: 'ready',
              progress: 100,
              segments: transcript.segments,
              duration: transcript.duration,
              audioUrl: api.getAudioUrl(fileId),
            } : f
          ));
          toast.success('Распознавание завершено');
        } else if (status.status === 'error') {
          const interval = pollingIntervals.current.get(fileId);
          if (interval) {
            clearInterval(interval);
            pollingIntervals.current.delete(fileId);
          }
          toast.error(`Ошибка распознавания: ${status.error || 'Неизвестная ошибка'}`);
        }
      } catch (error) {
        console.error('Status poll error:', error);
      }
    };

    // Poll every 2 seconds
    const interval = setInterval(poll, 2000);
    pollingIntervals.current.set(fileId, interval);
    poll(); // Initial poll
  }, []);

  const addFile = useCallback(async (file: File): Promise<string> => {
    if (isBackendAvailable) {
      try {
        const result = await api.uploadFile(file);
        const newFile: AudioFile = {
          id: result.id,
          name: result.name,
          type: result.type,
          size: result.size,
          createdAt: new Date(result.created_at),
          status: 'pending',
          progress: 0,
          duration: result.duration,
          audioUrl: api.getAudioUrl(result.id),
        };
        setFiles(prev => [...prev, newFile]);
        return result.id;
      } catch (error) {
        toast.error(`Ошибка загрузки: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
        throw error;
      }
    } else {
      // Demo mode
      const audioUrl = URL.createObjectURL(file);
      const newFile: AudioFile = {
        id: crypto.randomUUID(),
        name: file.name,
        type: file.type,
        size: file.size,
        createdAt: new Date(),
        status: 'pending',
        progress: 0,
        audioUrl,
      };
      setFiles(prev => [...prev, newFile]);
      return newFile.id;
    }
  }, [isBackendAvailable]);

  const addRecording = useCallback(async (blob: Blob, name: string): Promise<string> => {
    const file = new File([blob], name, { type: blob.type });
    return addFile(file);
  }, [addFile]);

  const deleteFile = useCallback(async (fileId: string) => {
    if (isBackendAvailable) {
      try {
        await api.deleteFile(fileId);
      } catch (error) {
        console.error('Delete error:', error);
      }
    }

    // Stop any polling
    const interval = pollingIntervals.current.get(fileId);
    if (interval) {
      clearInterval(interval);
      pollingIntervals.current.delete(fileId);
    }

    setFiles(prev => prev.filter(f => f.id !== fileId));
    if (activeFileId === fileId) {
      setActiveFileId(null);
    }
  }, [activeFileId, isBackendAvailable]);

  const startTranscription = useCallback(async (fileId: string) => {
    if (isBackendAvailable) {
      try {
        updateFileStatus(fileId, 'processing', 0);
        await api.startTranscription(fileId);
        pollStatus(fileId);
      } catch (error) {
        updateFileStatus(fileId, 'error');
        toast.error(`Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
      }
    } else {
      // Demo mode - simulate transcription
      updateFileStatus(fileId, 'processing', 0);
      
      const simulateProgress = (progress: number) => {
        if (progress >= 100) {
          setFiles(prev => prev.map(f =>
            f.id === fileId ? {
              ...f,
              status: 'ready' as FileStatus,
              progress: 100,
              segments: createMockSegments(),
              duration: 120,
            } : f
          ));
          toast.success('Распознавание завершено (демо)');
          return;
        }
        
        setFiles(prev => prev.map(f =>
          f.id === fileId ? { ...f, progress } : f
        ));
        
        setTimeout(() => simulateProgress(progress + 10), 300);
      };
      
      setTimeout(() => simulateProgress(10), 500);
    }
  }, [isBackendAvailable, updateFileStatus, pollStatus]);

  const startTranscriptionAll = useCallback(() => {
    const pendingFiles = files.filter(f => f.status === 'pending');
    pendingFiles.forEach(f => startTranscription(f.id));
  }, [files, startTranscription]);

  const updateSegment = useCallback(async (
    fileId: string,
    segmentId: string,
    updates: Partial<TranscriptionSegment>
  ) => {
    // Update locally first
    setFiles(prev => prev.map(f => {
      if (f.id !== fileId || !f.segments) return f;
      return {
        ...f,
        segments: f.segments.map(s =>
          s.id === segmentId ? { ...s, ...updates } : s
        ),
      };
    }));

    // Sync with backend
    if (isBackendAvailable) {
      try {
        await api.updateSegment(fileId, segmentId, {
          text: updates.text,
          speaker: updates.speaker,
        });
      } catch (error) {
        console.error('Update segment error:', error);
      }
    }
  }, [isBackendAvailable]);

  const updateSpeakerName = useCallback(async (
    fileId: string,
    oldName: string,
    newName: string
  ) => {
    // Update locally first
    setFiles(prev => prev.map(f => {
      if (f.id !== fileId || !f.segments) return f;
      return {
        ...f,
        segments: f.segments.map(s =>
          s.speaker === oldName ? { ...s, speaker: newName } : s
        ),
      };
    }));

    // Sync with backend
    if (isBackendAvailable) {
      try {
        await api.updateSpeakerName(fileId, oldName, newName);
      } catch (error) {
        console.error('Update speaker error:', error);
      }
    }
  }, [isBackendAvailable]);

  const replaceAllText = useCallback(async (
    fileId: string,
    search: string,
    replace: string
  ): Promise<number> => {
    if (!search) return 0;

    let count = 0;

    // Update locally first
    setFiles(prev => prev.map(f => {
      if (f.id !== fileId || !f.segments) return f;
      return {
        ...f,
        segments: f.segments.map(s => {
          const regex = new RegExp(search, 'gi');
          const matches = s.text.match(regex);
          if (matches) count += matches.length;
          return { ...s, text: s.text.replace(regex, replace) };
        }),
      };
    }));

    // Sync with backend
    if (isBackendAvailable) {
      try {
        const result = await api.replaceText(fileId, search, replace);
        return result.replaced_count;
      } catch (error) {
        console.error('Replace text error:', error);
      }
    }

    return count;
  }, [isBackendAvailable]);

  return {
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
  };
}
