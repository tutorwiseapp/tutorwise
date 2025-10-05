# CAS Backend API

**Status:** Planned for Q1 2026
**Tech Stack:** Express.js, Node.js, TypeScript, SQLite/Postgres

## API Endpoints (Planned)

### Services
- `GET /api/services` - List all services
- `POST /api/services/:id/start` - Start service
- `POST /api/services/:id/stop` - Stop service
- `GET /api/services/:id/health` - Health check
- `GET /api/services/:id/logs` - Stream logs

### Agent
- `GET /api/agent/status` - Agent status
- `POST /api/agent/start` - Start agent
- `POST /api/agent/stop` - Stop agent
- `GET /api/agent/tasks` - Task queue
- `POST /api/agent/tasks` - Add task

### SADD
- `GET /api/sadd/features` - List features
- `POST /api/sadd/extract` - Extract feature
- `POST /api/sadd/mirror` - Mirror to platform
- `GET /api/sadd/migrations` - Migration history

### Projects
- `GET /api/projects` - List projects
- `POST /api/projects` - Add project
- `GET /api/projects/:id` - Project details

## Development

```bash
npm run dev
# API runs on http://localhost:8080
```

## Database

- Development: SQLite (cas.db)
- Production: PostgreSQL

## Architecture

Uses packages:
- `@cas/core` - Service orchestration
- `@cas/agent` - Agent operations
- `@cas/sadd` - SADD operations
- `@cas/types` - Shared types
