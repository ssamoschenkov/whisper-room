import { useState, useCallback } from 'react';
import type { AudioFile, TranscriptionSegment, FileStatus } from '@/types/transcription';

// Mock data for demonstration
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

export function useTranscriptionStore() {
  const [files, setFiles] = useState<AudioFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [processingQueue, setProcessingQueue] = useState<string[]>([]);

  const activeFile = files.find(f => f.id === activeFileId) || null;

  const addFile = useCallback((file: File) => {
    const audioUrl = URL.createObjectURL(file);
    const newFile: AudioFile = {
      id: crypto.randomUUID(),
      name: file.name,
      type: file.type,
      size: file.size,
      createdAt: new Date(),
      status: 'pending',
      audioUrl,
    };
    setFiles(prev => [...prev, newFile]);
    return newFile.id;
  }, []);

  const addRecording = useCallback((blob: Blob, name: string) => {
    const audioUrl = URL.createObjectURL(blob);
    const newFile: AudioFile = {
      id: crypto.randomUUID(),
      name,
      type: blob.type,
      size: blob.size,
      createdAt: new Date(),
      status: 'pending',
      audioUrl,
    };
    setFiles(prev => [...prev, newFile]);
    return newFile.id;
  }, []);

  const deleteFile = useCallback((fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
    if (activeFileId === fileId) {
      setActiveFileId(null);
    }
  }, [activeFileId]);

  const updateFileStatus = useCallback((fileId: string, status: FileStatus) => {
    setFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, status } : f
    ));
  }, []);

  const startTranscription = useCallback((fileId: string) => {
    setProcessingQueue(prev => [...prev, fileId]);
    updateFileStatus(fileId, 'processing');
    
    // Simulate transcription process
    setTimeout(() => {
      setFiles(prev => prev.map(f => 
        f.id === fileId 
          ? { ...f, status: 'ready' as FileStatus, segments: createMockSegments(), duration: 120 } 
          : f
      ));
      setProcessingQueue(prev => prev.filter(id => id !== fileId));
    }, 3000 + Math.random() * 2000);
  }, [updateFileStatus]);

  const startTranscriptionAll = useCallback(() => {
    const pendingFiles = files.filter(f => f.status === 'pending');
    pendingFiles.forEach(f => startTranscription(f.id));
  }, [files, startTranscription]);

  const updateSegment = useCallback((fileId: string, segmentId: string, updates: Partial<TranscriptionSegment>) => {
    setFiles(prev => prev.map(f => {
      if (f.id !== fileId || !f.segments) return f;
      return {
        ...f,
        segments: f.segments.map(s => 
          s.id === segmentId ? { ...s, ...updates } : s
        ),
      };
    }));
  }, []);

  const updateSpeakerName = useCallback((fileId: string, oldName: string, newName: string) => {
    setFiles(prev => prev.map(f => {
      if (f.id !== fileId || !f.segments) return f;
      return {
        ...f,
        segments: f.segments.map(s => 
          s.speaker === oldName ? { ...s, speaker: newName } : s
        ),
      };
    }));
  }, []);

  const replaceAllText = useCallback((fileId: string, search: string, replace: string) => {
    if (!search) return 0;
    let count = 0;
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
    return count;
  }, []);

  return {
    files,
    activeFile,
    activeFileId,
    processingQueue,
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
