"""
Offline Russian Transcriptor - FastAPI Backend
Handles audio transcription using offline-whisperx with speaker diarization
"""

import os
import json
import uuid
import asyncio
import logging
from pathlib import Path
from datetime import datetime
from typing import Optional
from contextlib import asynccontextmanager
from concurrent.futures import ThreadPoolExecutor

from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks

# Thread pool for CPU-heavy transcription work
transcription_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="transcribe")

logger = logging.getLogger("transcriptor")
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

# Configuration
DATA_DIR = Path("data")
UPLOAD_DIR = DATA_DIR / "uploads"
TRANSCRIPTS_DIR = DATA_DIR / "transcripts"

# Ensure directories exist
DATA_DIR.mkdir(exist_ok=True)
UPLOAD_DIR.mkdir(exist_ok=True)
TRANSCRIPTS_DIR.mkdir(exist_ok=True)

# Task queue for processing
processing_queue: dict[str, dict] = {}


class TranscriptionSegment(BaseModel):
    id: str
    start: float
    end: float
    speaker: str
    text: str


class TranscriptionResult(BaseModel):
    file_id: str
    file_name: str
    duration: float
    segments: list[TranscriptionSegment]
    created_at: str
    updated_at: str


class FileInfo(BaseModel):
    id: str
    name: str
    size: int
    type: str
    status: str  # pending, processing, ready, error
    progress: float
    created_at: str
    duration: Optional[float] = None


class UpdateSegmentRequest(BaseModel):
    text: Optional[str] = None
    speaker: Optional[str] = None


class UpdateSpeakerRequest(BaseModel):
    old_name: str
    new_name: str


class ReplaceTextRequest(BaseModel):
    search: str
    replace: str


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    print("🚀 Offline Russian Transcriptor Backend Started")
    print(f"📁 Data directory: {DATA_DIR.absolute()}")
    yield
    print("👋 Shutting down...")


app = FastAPI(
    title="Offline Russian Transcriptor API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_audio_duration(file_path: Path) -> float:
    """Get audio duration using ffprobe"""
    import subprocess
    try:
        result = subprocess.run(
            [
                "ffprobe", "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                str(file_path)
            ],
            capture_output=True,
            text=True
        )
        return float(result.stdout.strip())
    except:
        return 0.0


def convert_to_wav(input_path: Path, output_path: Path) -> bool:
    """Convert audio to WAV 16kHz Mono using FFmpeg"""
    import subprocess
    try:
        subprocess.run(
            [
                "ffmpeg", "-y", "-i", str(input_path),
                "-ar", "16000", "-ac", "1",
                "-c:a", "pcm_s16le",
                str(output_path)
            ],
            capture_output=True,
            check=True
        )
        return True
    except subprocess.CalledProcessError:
        return False


def save_transcript(file_id: str, data: dict):
    """Save transcription to JSON file"""
    transcript_path = TRANSCRIPTS_DIR / f"{file_id}.json"
    with open(transcript_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def load_transcript(file_id: str) -> Optional[dict]:
    """Load transcription from JSON file"""
    transcript_path = TRANSCRIPTS_DIR / f"{file_id}.json"
    if transcript_path.exists():
        with open(transcript_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return None




def _create_diarization_pipeline(whisperx_module, device: str, hf_token: Optional[str]):
    """Create diarization pipeline compatible with different whisperx versions."""
    pipeline_classes = []

    # whisperx <=3.3 sometimes exposes class on root module
    root_pipeline = getattr(whisperx_module, "DiarizationPipeline", None)
    if root_pipeline:
        pipeline_classes.append(root_pipeline)

    # whisperx >=3.3.4 exposes class in whisperx.diarize
    try:
        from whisperx.diarize import DiarizationPipeline as submodule_pipeline
        pipeline_classes.append(submodule_pipeline)
    except Exception:
        pass

    if not pipeline_classes:
        raise RuntimeError("DiarizationPipeline not found in installed whisperx version")

    token_keys = ["use_auth_token", "token", "auth_token", "hf_token", None]
    last_error = None

    for pipeline_cls in pipeline_classes:
        for token_key in token_keys:
            kwargs = {"device": device}
            if hf_token and token_key:
                kwargs[token_key] = hf_token
            try:
                return pipeline_cls(**kwargs)
            except TypeError as e:
                last_error = e

    raise RuntimeError(f"Unable to initialize diarization pipeline: {last_error}")


def _transcribe_sync(file_id: str, audio_path: Path, file_name: str):
    """Synchronous transcription - runs in a thread pool to not block the event loop"""
    try:
        import gc
        
        processing_queue[file_id] = {"status": "processing", "progress": 0}
        logger.info(f"[{file_id}] Starting transcription for {file_name}")
        
        # Convert to WAV if needed
        wav_path = audio_path.with_suffix(".wav")
        if audio_path.suffix.lower() != ".wav":
            processing_queue[file_id]["progress"] = 10
            logger.info(f"[{file_id}] Converting to WAV...")
            if not convert_to_wav(audio_path, wav_path):
                raise Exception("FFmpeg conversion failed")
        else:
            wav_path = audio_path
        
        processing_queue[file_id]["progress"] = 20
        
        # Import whisperx (lazy load to speed up startup)
        import whisperx
        import torch
        
        device = "cuda" if torch.cuda.is_available() else "cpu"
        compute_type = "float16" if device == "cuda" else "int8"
        
        # Tesla T4 (16GB VRAM) — large-v3 fits with float16 (~10GB)
        whisper_model_name = "large-v3"
        # T4 GPU: batch 16 for speed; CPU fallback: 4 to limit RAM
        batch_size = 16 if device == "cuda" else 4
        
        logger.info(f"[{file_id}] Device: {device}, model: {whisper_model_name}, batch_size: {batch_size}")
        
        # Load model
        processing_queue[file_id]["progress"] = 30
        logger.info(f"[{file_id}] Loading whisper model...")
        model = whisperx.load_model(
            whisper_model_name,
            device=device,
            compute_type=compute_type,
            language="ru"
        )
        
        # Transcribe
        processing_queue[file_id]["progress"] = 50
        logger.info(f"[{file_id}] Transcribing audio...")
        audio = whisperx.load_audio(str(wav_path))
        result = model.transcribe(audio, batch_size=batch_size, language="ru")
        
        # Free whisper model immediately to reclaim RAM
        del model
        gc.collect()
        if device == "cuda":
            torch.cuda.empty_cache()
        logger.info(f"[{file_id}] Whisper model unloaded, RAM freed")
        
        # Align whisper output
        processing_queue[file_id]["progress"] = 70
        logger.info(f"[{file_id}] Aligning segments...")
        model_a, metadata = whisperx.load_align_model(
            language_code="ru",
            device=device
        )
        result = whisperx.align(
            result["segments"],
            model_a,
            metadata,
            audio,
            device,
            return_char_alignments=False
        )
        
        # Free alignment model
        del model_a, metadata
        gc.collect()
        
        # Diarization (speaker detection) - skip if not enough RAM / model/token issues
        processing_queue[file_id]["progress"] = 85
        try:
            logger.info(f"[{file_id}] Running speaker diarization...")
            hf_token = os.environ.get("HF_TOKEN")
            logger.info(f"[{file_id}] HF_TOKEN present: {bool(hf_token)}")

            diarize_model = _create_diarization_pipeline(whisperx, device, hf_token)
            diarize_segments = diarize_model(audio)
            result = whisperx.assign_word_speakers(diarize_segments, result)

            del diarize_model, diarize_segments
            gc.collect()
        except Exception as diar_err:
            logger.warning(f"[{file_id}] Diarization skipped: {diar_err}")
        
        # Free audio array
        del audio
        gc.collect()
        
        # Format segments
        segments = []
        speaker_map = {}
        speaker_counter = 1
        
        for i, seg in enumerate(result.get("segments", [])):
            speaker_id = seg.get("speaker", "SPEAKER_00")
            
            if speaker_id not in speaker_map:
                speaker_map[speaker_id] = f"Голос {speaker_counter}"
                speaker_counter += 1
            
            segments.append({
                "id": str(uuid.uuid4()),
                "start": round(seg["start"], 2),
                "end": round(seg["end"], 2),
                "speaker": speaker_map[speaker_id],
                "text": seg["text"].strip()
            })
        
        # Get duration
        duration = get_audio_duration(wav_path)
        
        # Save transcript
        transcript_data = {
            "file_id": file_id,
            "file_name": file_name,
            "duration": duration,
            "segments": segments,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        save_transcript(file_id, transcript_data)
        
        processing_queue[file_id] = {"status": "ready", "progress": 100}
        logger.info(f"[{file_id}] Transcription complete! {len(segments)} segments found.")
        
        # Cleanup temporary WAV if we created it
        if wav_path != audio_path and wav_path.exists():
            wav_path.unlink()
            
    except Exception as e:
        logger.error(f"[{file_id}] Transcription error: {e}", exc_info=True)
        processing_queue[file_id] = {"status": "error", "progress": 0, "error": str(e)}


async def transcribe_audio(file_id: str, audio_path: Path, file_name: str):
    """Run transcription in thread pool to keep event loop responsive"""
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(
        transcription_executor,
        _transcribe_sync,
        file_id,
        audio_path,
        file_name,
    )


# API Endpoints

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "message": "Offline Russian Transcriptor is running"}


@app.post("/api/files/upload")
async def upload_file(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None
):
    """Upload an audio file"""
    # Validate file type
    allowed_types = [".mp3", ".m4a", ".wav", ".webm", ".ogg"]
    file_ext = Path(file.filename).suffix.lower()
    
    if file_ext not in allowed_types:
        raise HTTPException(400, f"Unsupported file type. Allowed: {allowed_types}")
    
    # Generate file ID
    file_id = str(uuid.uuid4())
    
    # Save file
    file_path = UPLOAD_DIR / f"{file_id}{file_ext}"
    
    content = await file.read()
    file_size = len(content)
    
    # Check size limit (300MB)
    if file_size > 300 * 1024 * 1024:
        raise HTTPException(400, "File size exceeds 300MB limit")
    
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Get duration
    duration = get_audio_duration(file_path)
    
    # Initialize processing status
    processing_queue[file_id] = {"status": "pending", "progress": 0}
    
    return {
        "id": file_id,
        "name": file.filename,
        "size": file_size,
        "type": file.content_type or f"audio/{file_ext[1:]}",
        "status": "pending",
        "progress": 0,
        "duration": duration,
        "created_at": datetime.now().isoformat()
    }


@app.post("/api/files/{file_id}/transcribe")
async def start_transcription(file_id: str, background_tasks: BackgroundTasks):
    """Start transcription for a file"""
    # Find the audio file
    audio_file = None
    for ext in [".mp3", ".m4a", ".wav", ".webm", ".ogg"]:
        path = UPLOAD_DIR / f"{file_id}{ext}"
        if path.exists():
            audio_file = path
            break
    
    if not audio_file:
        raise HTTPException(404, "Audio file not found")
    
    # Check if already processing
    if file_id in processing_queue and processing_queue[file_id]["status"] == "processing":
        raise HTTPException(400, "File is already being processed")
    
    # Start background transcription
    background_tasks.add_task(
        transcribe_audio,
        file_id,
        audio_file,
        audio_file.name
    )
    
    return {"status": "processing", "message": "Transcription started"}


@app.get("/api/files/{file_id}/status")
async def get_file_status(file_id: str):
    """Get processing status for a file"""
    if file_id in processing_queue:
        return processing_queue[file_id]
    
    # Check if transcript exists
    transcript = load_transcript(file_id)
    if transcript:
        return {"status": "ready", "progress": 100}
    
    return {"status": "pending", "progress": 0}


@app.get("/api/files/{file_id}/transcript")
async def get_transcript(file_id: str):
    """Get transcription result for a file"""
    transcript = load_transcript(file_id)
    if not transcript:
        raise HTTPException(404, "Transcript not found")
    return transcript


@app.get("/api/files/{file_id}/audio")
async def get_audio(file_id: str):
    """Stream audio file"""
    for ext in [".mp3", ".m4a", ".wav", ".webm", ".ogg"]:
        path = UPLOAD_DIR / f"{file_id}{ext}"
        if path.exists():
            return FileResponse(
                path,
                media_type=f"audio/{ext[1:]}",
                filename=path.name
            )
    raise HTTPException(404, "Audio file not found")


@app.patch("/api/files/{file_id}/segments/{segment_id}")
async def update_segment(file_id: str, segment_id: str, request: UpdateSegmentRequest):
    """Update a transcription segment"""
    transcript = load_transcript(file_id)
    if not transcript:
        raise HTTPException(404, "Transcript not found")
    
    for segment in transcript["segments"]:
        if segment["id"] == segment_id:
            if request.text is not None:
                segment["text"] = request.text
            if request.speaker is not None:
                segment["speaker"] = request.speaker
            break
    
    transcript["updated_at"] = datetime.now().isoformat()
    save_transcript(file_id, transcript)
    
    return {"status": "ok"}


@app.patch("/api/files/{file_id}/speakers")
async def update_speaker_name(file_id: str, request: UpdateSpeakerRequest):
    """Update speaker name across all segments"""
    transcript = load_transcript(file_id)
    if not transcript:
        raise HTTPException(404, "Transcript not found")
    
    count = 0
    for segment in transcript["segments"]:
        if segment["speaker"] == request.old_name:
            segment["speaker"] = request.new_name
            count += 1
    
    transcript["updated_at"] = datetime.now().isoformat()
    save_transcript(file_id, transcript)
    
    return {"status": "ok", "updated_count": count}


@app.post("/api/files/{file_id}/replace")
async def replace_text(file_id: str, request: ReplaceTextRequest):
    """Find and replace text across all segments"""
    import re
    
    transcript = load_transcript(file_id)
    if not transcript:
        raise HTTPException(404, "Transcript not found")
    
    count = 0
    pattern = re.compile(re.escape(request.search), re.IGNORECASE)
    
    for segment in transcript["segments"]:
        matches = pattern.findall(segment["text"])
        if matches:
            count += len(matches)
            segment["text"] = pattern.sub(request.replace, segment["text"])
    
    transcript["updated_at"] = datetime.now().isoformat()
    save_transcript(file_id, transcript)
    
    return {"status": "ok", "replaced_count": count}


@app.delete("/api/files/{file_id}")
async def delete_file(file_id: str):
    """Delete a file and its transcript"""
    # Delete audio files
    for ext in [".mp3", ".m4a", ".wav", ".webm", ".ogg"]:
        path = UPLOAD_DIR / f"{file_id}{ext}"
        if path.exists():
            path.unlink()
    
    # Delete transcript
    transcript_path = TRANSCRIPTS_DIR / f"{file_id}.json"
    if transcript_path.exists():
        transcript_path.unlink()
    
    # Remove from queue
    if file_id in processing_queue:
        del processing_queue[file_id]
    
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    # 0.0.0.0 allows connections from any network interface (LAN access)
    # Change port if needed via environment variable
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
