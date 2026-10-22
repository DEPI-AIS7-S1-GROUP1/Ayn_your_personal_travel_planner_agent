# ==============================================================================
# Ayn Travel Planner - Backend & Agent Containerfile
# ==============================================================================

FROM python:3.12-slim

# Set environment variables for non-interactive installs and clean Python execution
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH="/app/backend:/app"

# Install system dependencies (curl for healthchecks, build tools if needed)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gcc \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy root requirements.txt first for efficient layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend and agent source code and mock-data
COPY backend/ ./backend/
COPY agent/ ./agent/
COPY mock-data/ ./mock-data/

# Create data directory for persistent SQLite database
RUN mkdir -p /app/data && chmod 777 /app/data

# Default port exposed by FastAPI / Uvicorn
EXPOSE 8000

# Set default working directory to backend
WORKDIR /app/backend

# Healthcheck to verify FastAPI is responding
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# Start Uvicorn server
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
