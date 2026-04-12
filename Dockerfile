FROM python:3.11.9-slim

# Install Node.js 20 and npm
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl ca-certificates && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Install libsndfile for soundfile/librosa
RUN apt-get update && \
    apt-get install -y --no-install-recommends libsndfile1 ffmpeg && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── Backend dependencies ─────────────────────────────────────────
COPY elephant-separator/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir fastapi uvicorn python-multipart

# ── Frontend dependencies ────────────────────────────────────────
COPY elephant-separator/frontend/package.json elephant-separator/frontend/package-lock.json* /app/frontend/
WORKDIR /app/frontend
RUN npm install --silent
WORKDIR /app

# ── Copy source code ─────────────────────────────────────────────
COPY elephant-separator/ /app/

# ── Copy .env.example as fallback if .env doesn't exist ──────────
RUN if [ ! -f /app/frontend/.env ] && [ -f /app/frontend/.env.example ]; then \
        cp /app/frontend/.env.example /app/frontend/.env; \
    fi

EXPOSE 8000 3000

# ── Entrypoint: run both servers ─────────────────────────────────
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

CMD ["/app/entrypoint.sh"]
