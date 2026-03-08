/**
 * API client for FastAPI backend
 */

const API_URL = import.meta.env.VITE_API_URL || '';

export interface ApiSegment {
  id: string;
  start: number;
  end: number;
  speaker: string;
  text: string;
}

export interface ApiTranscript {
  file_id: string;
  file_name: string;
  duration: number;
  segments: ApiSegment[];
  created_at: string;
  updated_at: string;
}

export interface ApiFileInfo {
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'pending' | 'processing' | 'ready' | 'error';
  progress: number;
  duration?: number;
  created_at: string;
}

export interface ApiStatus {
  status: 'pending' | 'processing' | 'ready' | 'error';
  progress: number;
  error?: string;
}

class TranscriptionApi {
  private baseUrl: string;

  constructor(baseUrl: string = API_URL) {
    this.baseUrl = baseUrl;
  }

  private async fetch<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `API error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string; message: string }> {
    return this.fetch('/api/health');
  }

  /**
   * Upload an audio file
   */
  async uploadFile(file: File): Promise<ApiFileInfo> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.baseUrl}/api/files/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'Upload failed');
    }

    return response.json();
  }

  /**
   * Start transcription for a file
   */
  async startTranscription(fileId: string): Promise<{ status: string; message: string }> {
    return this.fetch(`/api/files/${fileId}/transcribe`, {
      method: 'POST',
    });
  }

  /**
   * Get file processing status
   */
  async getStatus(fileId: string): Promise<ApiStatus> {
    return this.fetch(`/api/files/${fileId}/status`);
  }

  /**
   * Get transcription result
   */
  async getTranscript(fileId: string): Promise<ApiTranscript> {
    return this.fetch(`/api/files/${fileId}/transcript`);
  }

  /**
   * Get audio URL for streaming
   */
  getAudioUrl(fileId: string): string {
    return `${this.baseUrl}/api/files/${fileId}/audio`;
  }

  /**
   * Update a segment
   */
  async updateSegment(
    fileId: string,
    segmentId: string,
    updates: { text?: string; speaker?: string }
  ): Promise<{ status: string }> {
    return this.fetch(`/api/files/${fileId}/segments/${segmentId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  /**
   * Update speaker name across all segments
   */
  async updateSpeakerName(
    fileId: string,
    oldName: string,
    newName: string
  ): Promise<{ status: string; updated_count: number }> {
    return this.fetch(`/api/files/${fileId}/speakers`, {
      method: 'PATCH',
      body: JSON.stringify({ old_name: oldName, new_name: newName }),
    });
  }

  /**
   * Find and replace text
   */
  async replaceText(
    fileId: string,
    search: string,
    replace: string
  ): Promise<{ status: string; replaced_count: number }> {
    return this.fetch(`/api/files/${fileId}/replace`, {
      method: 'POST',
      body: JSON.stringify({ search, replace }),
    });
  }

  /**
   * Delete a file
   */
  async deleteFile(fileId: string): Promise<{ status: string }> {
    return this.fetch(`/api/files/${fileId}`, {
      method: 'DELETE',
    });
  }
}

export const api = new TranscriptionApi();
