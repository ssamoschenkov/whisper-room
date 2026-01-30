# Offline Russian Transcriptor - Backend

FastAPI backend for audio transcription using offline-whisperx.

## 🔒 Offline-First Architecture

This backend is designed to run **completely offline** in a local network without internet access:
- All AI models are loaded locally (whisperx large-v3)
- No external API calls
- All data stays on your server

## Requirements

- Python 3.10+
- FFmpeg installed and in PATH
- CUDA (optional, for GPU acceleration)
- ~10GB disk space for whisperx models

## Installation

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

**Note:** First run will download whisperx models (~5GB). Do this while connected to internet, then deploy offline.

## Running (Local Network)

```bash
# Start server accessible from LAN
uvicorn main:app --host 0.0.0.0 --port 8000

# Or with custom port
PORT=9000 python main.py
```

Server will be available at `http://<SERVER_IP>:8000` from any device on the network.

## Frontend Configuration

Set the API URL in frontend to point to your server's LAN IP:

```bash
# .env file in frontend root
VITE_API_URL=http://192.168.1.100:8000
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

## Data Storage

All data is stored locally in the `data/` directory:
- `data/uploads/` - Original audio files
- `data/transcripts/` - JSON transcription files

No database required. Each audio file has a corresponding `.json` file.
