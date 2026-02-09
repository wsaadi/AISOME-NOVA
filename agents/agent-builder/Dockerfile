FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY app/ ./app/

# Create data directory
RUN mkdir -p /app/data/agents

# Environment variables
ENV AGENT_BUILDER_HOST=0.0.0.0
ENV AGENT_BUILDER_PORT=8021
ENV AGENT_STORAGE_DIR=/app/data/agents

# Expose port
EXPOSE 8021

# Run the application
CMD ["python", "-m", "app.main"]
