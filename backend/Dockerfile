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
ARG HF_TOKEN
ENV HF_TOKEN=$HF_TOKEN

# Step 1: Download whisper model
RUN python -c "\
import whisperx; \
import torch; \
print('⬇️  Downloading whisper large-v3 model...'); \
model = whisperx.load_model('large-v3', device='cpu', compute_type='int8', language='ru'); \
del model; \
print('✅ Whisper model downloaded!'); \
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
RUN echo 'import os\n\
token = os.environ.get("HF_TOKEN", "")\n\
if not token or token == "hf_ваш_токен_сюда":\n\
    print("⚠️  HF_TOKEN not set, skipping diarization model")\n\
else:\n\
    print("⬇️  Downloading diarization model...")\n\
    from pyannote.audio import Pipeline\n\
    pipeline = Pipeline.from_pretrained("pyannote/speaker-diarization-3.1", token=token)\n\
    del pipeline\n\
    print("✅ Diarization model downloaded!")' > /tmp/download_diarization.py && python /tmp/download_diarization.py

# Copy application
COPY main.py .

# Create data directories
RUN mkdir -p data/uploads data/transcripts

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
