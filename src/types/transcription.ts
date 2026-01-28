export type FileStatus = 'pending' | 'processing' | 'ready' | 'error';

export interface TranscriptionSegment {
  id: string;
  start: number; // seconds
  end: number;
  speaker: string;
  text: string;
}

export interface AudioFile {
  id: string;
  name: string;
  type: string;
  size: number;
  createdAt: Date;
  status: FileStatus;
  duration?: number;
  segments?: TranscriptionSegment[];
  audioUrl?: string;
}

export interface TranscriptionData {
  fileId: string;
  fileName: string;
  segments: TranscriptionSegment[];
  speakerMap: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}
