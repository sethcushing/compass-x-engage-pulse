# Engagement Pulse - Deployment Guide

## Koyeb Deployment

### Prerequisites
1. A [Koyeb account](https://app.koyeb.com/)
2. A MongoDB database (e.g., MongoDB Atlas free tier)
3. Your code pushed to a Git repository (GitHub, GitLab, etc.)

### Environment Variables Required

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGO_URL` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/` |
| `DB_NAME` | Database name | `engagement_pulse` |
| `CORS_ORIGINS` | Allowed CORS origins | `*` or `https://your-domain.koyeb.app` |

### Deployment Steps

#### Option 1: Deploy via Koyeb Dashboard

1. **Create a new App** on Koyeb Dashboard
2. **Connect your Git repository**
3. **Configure build settings:**
   - Builder: Dockerfile
   - Dockerfile path: `Dockerfile`
4. **Set environment variables:**
   - `MONGO_URL`: Your MongoDB connection string (mark as secret)
   - `DB_NAME`: `engagement_pulse`
   - `CORS_ORIGINS`: `*`
5. **Configure port:** `8000`
6. **Deploy!**

#### Option 2: Deploy via Koyeb CLI

```bash
# Install Koyeb CLI
curl -fsSL https://raw.githubusercontent.com/koyeb/koyeb-cli/master/install.sh | bash

# Login to Koyeb
koyeb login

# Create a secret for MongoDB URL
koyeb secrets create mongo-url --value "mongodb+srv://user:pass@cluster.mongodb.net/"

# Deploy using koyeb.yaml
koyeb app create engagement-pulse --git github.com/your-username/engagement-pulse
```

### Post-Deployment

1. **Access your app** at `https://engagement-pulse-<your-org>.koyeb.app`
2. **Seed initial data** by calling `POST /api/seed-data` (optional - for demo data)
3. **Configure Google OAuth** (if using authentication):
   - Add your Koyeb domain to Google OAuth authorized redirect URIs

### Local Docker Testing

```bash
# Build the image
docker build -t engagement-pulse .

# Run with environment variables
docker run -p 8000:8000 \
  -e MONGO_URL="mongodb://localhost:27017" \
  -e DB_NAME="engagement_pulse" \
  -e PORT=8000 \
  engagement-pulse

# Access at http://localhost:8000
```

### Troubleshooting

**Build fails:**
- Ensure all dependencies are in `requirements.txt` and `package.json`
- Check Docker build logs in Koyeb dashboard

**App crashes on startup:**
- Verify `MONGO_URL` is correct and accessible
- Check application logs in Koyeb dashboard

**Frontend not loading:**
- The React app is served from the same container
- Ensure the build completed successfully

### Architecture

```
┌─────────────────────────────────────────┐
│              Koyeb Container            │
│  ┌───────────────────────────────────┐  │
│  │         FastAPI Backend           │  │
│  │   - API routes (/api/*)           │  │
│  │   - Static file serving           │  │
│  │   - React SPA (index.html)        │  │
│  └───────────────────────────────────┘  │
│                   │                     │
│                   ▼                     │
│  ┌───────────────────────────────────┐  │
│  │      MongoDB (External)           │  │
│  │   - MongoDB Atlas / Self-hosted   │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```
