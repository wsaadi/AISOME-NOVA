FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir uvloop httptools

# Copy application code
COPY app/ ./app/

# Create non-root user and data directory
RUN useradd --create-home --shell /bin/bash appuser \
    && mkdir -p /app/data/agents \
    && chown -R appuser:appuser /app
USER appuser

EXPOSE 8021

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8021/health', timeout=5)" || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8021", "--workers", "2", "--backlog", "2048", "--limit-concurrency", "1000", "--limit-max-requests", "10000"]
