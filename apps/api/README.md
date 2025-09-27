# Tutorwise Backend

Production-ready FastAPI backend for the Tutorwise educational platform.

## Features

- 🚀 FastAPI with async support
- 🔄 Redis caching and session management
- 📊 Neo4j graph database integration
- 🏥 Comprehensive health monitoring
- 🔒 Production security configurations
- 📦 Gunicorn + Uvicorn for production serving

## Quick Start

### Prerequisites

- Python 3.11+
- Redis server
- Neo4j database

### Local Development

1. **Clone and setup**:
   ```bash
   cd tutorwise-railway-backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your local database URLs
   ```

3. **Set development mode**:
   ```bash
   export ENV=development  # Enables .env file loading
   ```

4. **Run locally**:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

### Production Deployment

The application is configured for Railway deployment with:
- Gunicorn process manager
- Multiple Uvicorn workers
- Automatic database connection management
- Comprehensive health monitoring

## Environment Variables

### Required for Production

| Variable | Description | Example |
|----------|-------------|---------|
| `REDIS_URL` | Redis connection URL | `redis://user:pass@host:port` |
| `REDIS_PUBLIC_URL` | Public Redis URL (Railway) | `redis://user:pass@public.host:port` |
| `NEO4J_URI` | Neo4j connection URI | `bolt://host:7687` |
| `NEO4J_USERNAME` | Neo4j username | `neo4j` |
| `NEO4J_PASSWORD` | Neo4j password | `your_password` |
| `ALLOWED_ORIGINS` | CORS allowed origins | `https://app.com,https://admin.com` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `ENV` | Environment mode | `production` |

## API Endpoints

### Health Check
```
GET /health
```

Returns detailed system health status:
```json
{
  "status": "ok",
  "timestamp": 1234567890,
  "services": {
    "redis": {
      "status": "ok",
      "message": "Redis is healthy",
      "details": null
    },
    "neo4j": {
      "status": "ok",
      "message": "Neo4j is healthy",
      "details": null
    }
  }
}
```

### Root
```
GET /
```

Returns welcome message.

## Development

### Database Connection Management

The application uses FastAPI lifespan events for proper database connection lifecycle:

- **Startup**: Attempts to connect to databases with retry logic
- **Runtime**: Graceful handling of connection failures
- **Shutdown**: Clean connection cleanup

### Health Monitoring

The `/health` endpoint:
- ✅ Always returns 200 OK (never crashes)
- 🔄 Includes retry logic for transient failures
- 📊 Provides detailed service status
- ⚡ Runs health checks concurrently

### Security

- 🔒 Non-root container user
- 🛡️ No secrets in code/git
- 🌐 Configurable CORS origins
- 📝 Comprehensive logging

## Testing

Test the health endpoint:
```bash
python app/backend_healthcheck.py
```

Or manually:
```bash
curl https://your-app.railway.app/health | jq
```

## Production Checklist

- [ ] All environment variables configured
- [ ] Redis and Neo4j accessible
- [ ] CORS origins set correctly
- [ ] Health monitoring configured
- [ ] Logs being collected
- [ ] Alerts set up for failures

## Troubleshooting

### Common Issues

1. **Redis connection failed**: Check `REDIS_URL` or use `REDIS_PUBLIC_URL` for Railway
2. **Neo4j not connecting**: Verify `NEO4J_*` environment variables
3. **CORS errors**: Add your frontend URL to `ALLOWED_ORIGINS`
4. **Health check degraded**: Check individual service status in response

### Local Development Issues

1. **Environment variables not loading**: Ensure `ENV=development` is set
2. **Database connections**: Make sure Redis/Neo4j are running locally
3. **Port conflicts**: Change port with `--port` flag

## Contributing

1. Follow the existing code patterns
2. Add proper error handling
3. Update this README for new features
4. Test both local and production configurations