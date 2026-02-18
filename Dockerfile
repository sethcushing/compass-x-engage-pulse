# Stage 1: Build React Frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy package files
COPY frontend/package.json frontend/yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy frontend source
COPY frontend/ ./

# Build argument for backend URL (will be set at build time or runtime)
ARG REACT_APP_BACKEND_URL=""
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL

# Build the frontend
RUN yarn build

# Stage 2: Production Python Image
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install Python dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY backend/ ./backend/

# Copy built frontend from builder stage
COPY --from=frontend-builder /app/frontend/build ./frontend/build

# Create a startup script
RUN echo '#!/bin/bash\n\
cd /app/backend\n\
exec uvicorn server:app --host 0.0.0.0 --port ${PORT:-8000}\n\
' > /app/start.sh && chmod +x /app/start.sh

# Expose port (Koyeb uses PORT env variable)
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/api || exit 1

# Run the application
CMD ["/app/start.sh"]
