# Offline Russian Transcriptor - Backend

FastAPI backend for audio transcription using offline-whisperx.

## Requirements

- Python 3.10+
- FFmpeg installed and in PATH
- CUDA (optional, for GPU acceleration)

## Installation

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## Running

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/files/upload` | Upload audio file |
| POST | `/api/files/{id}/transcribe` | Start transcription |
| GET | `/api/files/{id}/status` | Get processing status |
| GET | `/api/files/{id}/transcript` | Get transcription result |
| GET | `/api/files/{id}/audio` | Stream audio file |
| PATCH | `/api/files/{id}/segments/{seg_id}` | Update segment |
| PATCH | `/api/files/{id}/speakers` | Update speaker name |
| POST | `/api/files/{id}/replace` | Find and replace text |
| DELETE | `/api/files/{id}` | Delete file |

## Configuration

Set `API_URL` environment variable in frontend to point to this backend.
Default: `http://localhost:8000`
