FROM python:3.10-slim

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# HuggingFace token for downloading pyannote diarization model
# Pass at build time: docker-compose build --build-arg HF_TOKEN=hf_xxxxx
ARG HF_TOKEN
ENV HF_TOKEN=$HF_TOKEN

# Pre-download all models during build (requires internet at build time only)
RUN python -c "\
import os; \
os.environ['HF_TOKEN'] = os.environ.get('HF_TOKEN', ''); \
import whisperx; \
import torch; \
device = 'cpu'; \
print('⬇️  Downloading whisper large-v3 model...'); \
model = whisperx.load_model('large-v3', device=device, compute_type='int8', language='ru'); \
del model; \
print('⬇️  Downloading alignment model for Russian...'); \
model_a, metadata = whisperx.load_align_model(language_code='ru', device=device); \
del model_a, metadata; \
print('⬇️  Downloading diarization model...'); \
from pyannote.audio import Pipeline; \
pipeline = Pipeline.from_pretrained('pyannote/speaker-diarization-3.1', use_auth_token=os.environ['HF_TOKEN']); \
del pipeline; \
print('✅ All models downloaded!'); \
"

# Copy application
COPY main.py .

# Create data directories
RUN mkdir -p data/uploads data/transcripts

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
