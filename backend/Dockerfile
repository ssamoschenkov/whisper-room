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

# Pre-download WhisperX models during build (requires internet at build time only)
# After this, the container works fully offline
RUN python -c "\
import whisperx; \
import torch; \
device = 'cpu'; \
print('⬇️  Downloading whisper large-v3 model...'); \
model = whisperx.load_model('large-v3', device=device, compute_type='int8', language='ru'); \
del model; \
print('⬇️  Downloading alignment model for Russian...'); \
model_a, metadata = whisperx.load_align_model(language_code='ru', device=device); \
del model_a, metadata; \
print('✅ All models downloaded!'); \
"

# Copy application
COPY main.py .

# Create data directories
RUN mkdir -p data/uploads data/transcripts

# Expose port
EXPOSE 8000

# Run server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
