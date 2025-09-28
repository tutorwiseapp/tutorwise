# Tutorwise API

Production-ready FastAPI backend for the Tutorwise educational platform. This service provides REST API endpoints, real-time features, and integrates with multiple databases and external services.

## Features

- FastAPI with async support and automatic OpenAPI documentation
- Redis caching and session management
- Neo4j graph database integration for relationships
- Supabase PostgreSQL integration for primary data
- Stripe payment processing and webhook handling
- Comprehensive health monitoring and logging
- Production security configurations
- Comprehensive testing infrastructure with pytest

## Quick Start

### Prerequisites

- Python 3.8 or higher
- Redis server (for caching and sessions)
- Neo4j database (for graph relationships)
- PostgreSQL database (via Supabase)
- Stripe account (for payment processing)

### Local Development

1. **Install dependencies**:
   ```bash
   cd apps/api
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

4. **Run development server**:
   ```bash
   # From project root
   npm run dev:api

   # Or directly from apps/api
   python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

### Production Deployment

The application is configured for Railway deployment with:
- Gunicorn process manager with multiple Uvicorn workers
- Automatic database connection management with retry logic
- Comprehensive health monitoring with detailed service status
- Environment-based configuration management
- Secure CORS and authentication handling

## Environment Variables

### Required for Production

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Supabase PostgreSQL URL | `postgresql://user:pass@host:port/db` |
| `SUPABASE_URL` | Supabase project URL | `https://project.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | `eyJ...` |
| `REDIS_URL` | Redis connection URL | `redis://user:pass@host:port` |
| `REDIS_PUBLIC_URL` | Public Redis URL (Railway) | `redis://user:pass@public.host:port` |
| `NEO4J_URI` | Neo4j connection URI | `bolt://host:7687` |
| `NEO4J_USER` | Neo4j username | `neo4j` |
| `NEO4J_PASSWORD` | Neo4j password | `your_password` |
| `STRIPE_SECRET_KEY` | Stripe secret key | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret | `whsec_...` |
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
- Always returns 200 OK (never crashes)
- Includes retry logic for transient failures
- Provides detailed service status for all integrated services
- Runs health checks concurrently for optimal performance
- Monitors Redis, Neo4j, and Supabase connectivity

### Security

- Non-root container user for enhanced security
- No secrets in code or git repository
- Configurable CORS origins for controlled access
- Comprehensive logging and monitoring
- JWT token validation for protected endpoints
- Input validation and sanitization
- Secure environment variable management

## Testing

### Run Test Suite
```bash
# From project root
npm run test:backend

# Or directly from apps/api
python -m pytest tests/ -v
```

### Run Tests with Coverage
```bash
python -m pytest tests/ -v --cov=app --cov-report=term-missing --cov-report=html
```

### Test Health Endpoint
```bash
# Local development
curl http://localhost:8000/health | jq

# Production
curl https://your-app.railway.app/health | jq
```

### Testing Infrastructure
- Comprehensive test fixtures in `tests/conftest.py`
- Testing utilities in `tests/utils.py`
- Unit tests for business logic
- Integration tests for API endpoints
- Database mocking for isolated testing

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