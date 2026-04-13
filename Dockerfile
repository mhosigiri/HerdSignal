FROM python:3.11.9-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8080

# Audio runtime dependencies for librosa / soundfile.
RUN apt-get update && \
    apt-get install -y --no-install-recommends libsndfile1 ffmpeg && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app/elephant-separator

# Cloud Run deploys the backend only. requirements.txt is the
# authoritative runtime dependency manifest for this container build.
COPY elephant-separator/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

COPY elephant-separator/api_server.py ./api_server.py
COPY elephant-separator/src ./src
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

EXPOSE 8080

CMD ["/app/entrypoint.sh"]
