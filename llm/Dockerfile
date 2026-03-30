# Stage 1: Build layer — only rebuilds when requirements.txt changes
FROM python:3.11-slim AS builder

WORKDIR /app

# Install build-only deps (kept out of runtime image)
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip in an isolated cache mount
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --no-cache-dir --upgrade pip

# Install Python deps.
# groq>=0.5.0 broke langchain-groq compatibility (AsyncClient removed).
# Pin groq<0.5.0 BEFORE installing requirements to prevent version upgrade.
COPY requirements.txt ./
# groq>=0.5.0 broke langchain-groq compatibility (AsyncClient removed).
# Pin groq<0.5.0 BEFORE installing requirements to prevent version upgrade.
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --no-cache-dir --prefix=/install \
    "groq>=0.4.0,<0.5.0" && \
    pip install --no-cache-dir --prefix=/install -r requirements.txt

# Stage 2: Minimal runtime image
FROM python:3.11-slim

WORKDIR /app

# Runtime-only system deps (no compilers, no build tools)
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Copy pre-built Python packages from builder stage
COPY --from=builder /install /usr/local

# Copy source LAST — most likely to change, least likely to bust cache
COPY . .

# Pre-download the embedding model at build time so cold-start doesn't
# hit HuggingFace (~90 MB download). This bakes the model into the image.
ENV HF_HOME=/tmp/hf_cache
ENV TRANSFORMERS_CACHE=/tmp/hf_cache/transformers
ENV TORCH_HOME=/tmp/hf_cache/torch
ENV TORCHINDUCTOR_CACHE_DIR=/tmp/hf_cache/torch/inductor
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

# Create a home directory for user 10001 so getpass.getuser() resolves.
# Without this, torch crashes at import with:
#   KeyError: "getpwuid(): uid not found: 10001"
# because uid 10001 has no entry in /etc/passwd.
RUN mkdir -p /home/llmuser && \
    chown 10001:10001 /home/llmuser && \
    echo "llmuser:x:10001:10001::/home/llmuser:/bin/false" >> /etc/passwd

# Copy source LAST — most likely to change, least likely to bust cache
COPY . .

# Non-root user for security
USER 10001:10001

# Set KB_BASE_DIR to a writable location for user 10001
ENV KB_BASE_DIR=/tmp/faiss_store

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
