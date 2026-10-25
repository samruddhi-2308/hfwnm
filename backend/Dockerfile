FROM python:3.11-slim

WORKDIR /app

# Security: Create non-privileged system user
RUN groupadd -g 10001 appgroup && \
    useradd -u 10000 -g appgroup -s /sbin/nologin -d /app appuser

# Install system dependencies if needed (e.g. curl for healthcheck)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy configuration and install dependencies
COPY pyproject.toml .
COPY app/ ./app/
COPY pipeline/ ./pipeline/

RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir .

# Copy committed Parquet snapshots
COPY data/processed/ ./data/processed/

# Set ownership
RUN chown -R appuser:appgroup /app

USER appuser

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000 \
    ENVIRONMENT=production

EXPOSE 8000

HEALTHCHECK --interval=20s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
