# TutorWise Startup Utility

Comprehensive tool and script management system for TutorWise development environment.

## 🚀 Quick Start

### When Starting a Claude Code Session

Run the login script to initialize your environment:

```bash
npm run claude:login
```

This will:
- ✅ Load environment variables from `.env.local`
- ✅ Validate critical configurations (Railway, Supabase, Neo4j, Redis, Jira)
- ✅ Display current service status
- ✅ Offer options to start services automatically

### Interactive Service Manager

Launch the full interactive service manager:

```bash
npm run cas-startup
```

Or use the shell alias (after setup):

```bash
cas-startup
```

Or directly:

```bash
./tools/scripts/cas-startup.sh
```

> 💡 **Tip**: Set up shell aliases for faster commands! See [Alias Setup Guide](./ALIAS-SETUP-README.md) for details.

### Setting Up Shell Aliases (Optional)

For convenience, you can set up aliases to type short commands like `cas-startup` instead of `npm run cas-startup`:

```bash
# One-time setup
npm run setup-aliases

# Activate aliases
source ~/.zshrc  # or ~/.bashrc
```

Now you can use:
- `cas-startup` instead of `npm run cas-startup`
- `cas-status` instead of `npm run cas-startup:status`
- `cas-start` instead of `npm run cas-startup:start-all`
- And many more! See [ALIAS-SETUP-README.md](./ALIAS-SETUP-README.md) for full list.

## 📊 Service Status Table

The utility displays a comprehensive table of all services:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOOL NAME                      FILE NAME                      DESCRIPTION                          STATUS       ACTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
neo4j-database                 docker-compose.yml             Neo4j Graph Database (Port 7687)     ● RUNNING    [1] stop
redis-cache                    docker-compose.yml             Redis Cache Server (Port 6379)       ● RUNNING    [2] stop
backend-api                    apps/api/app/main.py           FastAPI Backend (Port 8000)          ● RUNNING    [3] stop
frontend-web                   apps/web/package.json          Next.js Frontend (Port 3000)         ● RUNNING    [4] stop
jira-task-executor             jira-task-executor.js          Polls Jira every 10 minutes          ○ STOPPED    [5] start
calendar-task-executor         calendar-task-executor.js      Polls Calendar every 10 minutes      ○ STOPPED    [6] start
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 🛠️ Available Commands

### NPM Scripts

| Command | Description |
|---------|-------------|
| `npm run claude:login` | **Start here!** Initialize environment when logging into Claude Code |
| `npm run startup` | Open interactive service manager |
| `npm run startup:status` | Display current service status table |
| `npm run startup:start-all` | Start all services in dependency order |
| `npm run startup:stop-all` | Stop all running services |
| `npm run startup:restart-all` | Restart all services |

### Direct CLI Commands

```bash
# Interactive mode
bash tools/scripts/startup-utility.sh

# Status only
bash tools/scripts/startup-utility.sh status

# Start all services
bash tools/scripts/startup-utility.sh start-all

# Stop all services
bash tools/scripts/startup-utility.sh stop-all

# Restart all services
bash tools/scripts/startup-utility.sh restart-all
```

## 📋 Managed Services

### Core Services (Auto-start enabled)

1. **Neo4j Database** (`neo4j-database`)
   - Port: 7687 (bolt), 7474 (browser)
   - Required by: Backend API
   - Health check: Docker container status

2. **Redis Cache** (`redis-cache`)
   - Port: 6379
   - Required by: Backend API
   - Health check: Docker container status

3. **Backend API** (`backend-api`)
   - Port: 8000
   - FastAPI application
   - Health check: `GET http://localhost:8000/health`
   - Depends on: Neo4j, Redis

4. **Frontend Web** (`frontend-web`)
   - Port: 3000
   - Next.js application
   - Health check: `GET http://localhost:3000/api/health`
   - Depends on: Backend API

### Background Services (Manual start)

5. **Jira Task Executor** (`jira-task-executor`)
   - Polls Jira for automated tasks every 10 minutes
   - Auto-start: Disabled (start manually when needed)

6. **Calendar Task Executor** (`calendar-task-executor`)
   - Polls Google Calendar for automated tasks every 10 minutes
   - Auto-start: Disabled (start manually when needed)

7. **Calendar to Jira Sync** (`calendar-jira-sync`)
   - Syncs Google Calendar events to Jira tickets
   - Auto-start: Disabled (start manually when needed)

### Deployment Services (Status only)

8. **Railway Backend** (`railway-backend`)
   - Production deployment status
   - Health check: Railway production URL

9. **Vercel Frontend** (`vercel-frontend`)
   - Production deployment status
   - Health check: Vercel production URL

## 🔧 Service Registry Configuration

Services are defined in `tools/configs/service-registry.json`:

```json
{
  "name": "service-name",
  "file": "path/to/file",
  "description": "Service description",
  "start_command": "command to start",
  "stop_command": "command to stop (optional)",
  "check_command": "command to check if running",
  "auto_start": true,
  "category": "service|database|background|deployment",
  "priority": 1,
  "depends_on": ["dependency-service-name"]
}
```

## 🔄 Service Lifecycle

### Startup Order (based on priority and dependencies)

1. **Databases** (Priority 1)
   - Neo4j
   - Redis

2. **Backend Services** (Priority 2)
   - FastAPI Backend (waits for databases)

3. **Frontend Services** (Priority 3)
   - Next.js Frontend (waits for backend)

4. **Background Services** (Priority 4)
   - Manual start only

### PID Management

- PID files stored in: `/tmp/tutorwise-services/`
- Format: `<service-name>.pid`
- Automatically cleaned up when service stops

### Log Files

- Log files stored in: `/Users/michaelquan/projects/tutorwise/logs/`
- Format: `<service-name>.log`
- Rotated automatically

## 🔍 Health Checks

Each service has a health check command that verifies it's running:

- **Docker services**: Check container status
- **HTTP services**: Curl health endpoints
- **Process services**: Check PID file and process status

## ⚙️ Environment Variables

Critical environment variables validated on login:

### Required for Core Services
- `NEO4J_URI`
- `NEO4J_USERNAME`
- `NEO4J_PASSWORD`
- `REDIS_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### Required for Integrations
- `RAILWAY_API_TOKEN` - Railway CLI access
- `JIRA_BASE_URL` - Jira integration
- `JIRA_EMAIL`
- `JIRA_API_TOKEN`
- `GOOGLE_AI_API_KEY` - Gemini API
- `FIGMA_ACCESS_TOKEN` - Figma integration

## 🎯 Usage Examples

### Starting a Claude Code Session

```bash
# Run this when you login to Claude Code
npm run claude:login

# Choose option 1 to start all services automatically
# Or option 2 to use the interactive manager
# Or option 3 for core services only
```

### Managing Individual Services

```bash
# Open interactive manager
npm run startup

# Enter a number (1-9) to toggle that service
# Enter 'start-all' to start everything
# Enter 'stop-all' to stop everything
# Enter 'refresh' to update status
# Enter 'quit' to exit
```

### Quick Status Check

```bash
# View service status without interaction
npm run startup:status
```

### Automated Scripts

```bash
# Start all services (for CI/CD or automation)
npm run startup:start-all

# Stop all services (for shutdown scripts)
npm run startup:stop-all

# Restart all services (for updates)
npm run startup:restart-all
```

## 🐛 Troubleshooting

### Service won't start

1. Check logs: `cat logs/<service-name>.log`
2. Verify dependencies are running
3. Check environment variables are set
4. Ensure ports are not already in use

### Service shows running but not responding

1. Check health endpoint manually
2. Review service logs
3. Restart the service
4. Check for port conflicts

### PID file issues

```bash
# Clean up stale PID files
rm -rf /tmp/tutorwise-services/*.pid

# Restart the service
npm run startup
```

## 📝 Adding New Services

To add a new service to the startup utility:

1. Edit `tools/configs/service-registry.json`
2. Add new service object:

```json
{
  "name": "my-new-service",
  "file": "path/to/service/file",
  "description": "What this service does",
  "start_command": "npm run my-service",
  "check_command": "curl -s http://localhost:PORT > /dev/null 2>&1",
  "auto_start": false,
  "category": "service",
  "priority": 4,
  "depends_on": []
}
```

3. Test it:

```bash
npm run startup:status
```

## 🔐 Security

- PID files are stored in `/tmp` and cleaned up automatically
- Environment variables are loaded from `.env.local` (never committed)
- Service logs may contain sensitive data - review before sharing

## 📚 Related Documentation

- [NPM Scripts Reference](../docs/reference/npm-scripts-reference.md)
- [Service Registry Schema](../configs/service-registry.json)
- [Integration Setup](../integrations/README.md)

## 🚀 Future Enhancements

- [ ] Auto-restart on failure
- [ ] Service health monitoring dashboard
- [ ] Slack/email notifications for service issues
- [ ] Resource usage monitoring (CPU, memory)
- [ ] Service dependency visualization
- [ ] Web UI for service management
