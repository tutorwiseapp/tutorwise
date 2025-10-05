# CAS Web Dashboard

**Status:** Planned for Q2 2026
**Tech Stack:** Next.js 14, React, TypeScript, Tailwind CSS

## Features (Planned)

- 📊 Service status monitoring
- ▶️ Start/stop services
- 🤖 Agent control & task queue
- 🔄 SADD migration history
- 📈 Real-time health metrics
- 📝 Live log streaming

## Pages

- `/` - Dashboard overview
- `/services` - Service management
- `/agent` - Autonomous agent control
- `/sadd` - Application discovery & migration
- `/projects` - Multi-project management
- `/settings` - Configuration

## Development

```bash
npm run dev
# Opens on http://localhost:3100
```

## Architecture

Uses packages:
- `@cas/core` - Service orchestration logic
- `@cas/agent` - Agent state management  
- `@cas/sadd` - SADD operations
- `@cas/types` - Shared TypeScript types
