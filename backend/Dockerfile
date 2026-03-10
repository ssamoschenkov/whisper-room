# CUDA 11.8 base for NVIDIA Tesla T4 GPU acceleration
FROM nvidia/cuda:11.8.0-cudnn8-runtime-ubuntu22.04

# Install Python 3.10 and system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.10 \
    python3.10-venv \
    python3-pip \
    ffmpeg \
    git \
    && ln -sf /usr/bin/python3.10 /usr/bin/python \
    && ln -sf /usr/bin/pip3 /usr/bin/pip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# HuggingFace token for downloading pyannote diarization model
ARG HF_TOKEN
ENV HF_TOKEN=$HF_TOKEN

# Step 1: Download whisper model (large-v3 for best quality)
RUN python -c "\
import whisperx; \
import torch; \
print('⬇️  Downloading whisper large-v3 model...'); \
model = whisperx.load_model('large-v3', device='cpu', compute_type='int8', language='ru'); \
del model; \
print('✅ Whisper large-v3 model downloaded!'); \
"

# Step 2: Download alignment model
RUN python -c "\
import whisperx; \
print('⬇️  Downloading alignment model for Russian...'); \
model_a, metadata = whisperx.load_align_model(language_code='ru', device='cpu'); \
del model_a, metadata; \
print('✅ Alignment model downloaded!'); \
"

# Step 3: Download diarization model (requires HF_TOKEN)
RUN python - <<'PY'
import os

token = os.environ.get("HF_TOKEN", "")
if not token or token == "hf_ваш_токен_сюда":
    print("⚠️  HF_TOKEN not set, skipping diarization model")
else:
    print("⬇️  Downloading diarization model...")
    from pyannote.audio import Pipeline

    try:
        pipeline = Pipeline.from_pretrained("pyannote/speaker-diarization-3.1", token=token)
        del pipeline
        print("✅ Diarization model downloaded!")
    except Exception as e:
        print(f"⚠️  Diarization preload skipped: {e}")
        print("ℹ️  Grant access to https://huggingface.co/pyannote/speaker-diarization-community-1 and rebuild.")
PY

# Copy application
COPY main.py .

# Create data directories
RUN mkdir -p data/uploads data/transcripts

# NVIDIA runtime env
ENV NVIDIA_VISIBLE_DEVICES=all
ENV NVIDIA_DRIVER_CAPABILITIES=compute,utility

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
