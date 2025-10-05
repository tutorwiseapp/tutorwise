# TutorWise CAS Auto-Startup with direnv

**Automatic service management when you enter the project directory**

## Overview

This setup automatically starts all TutorWise CAS services when you `cd` into the project directory, with robust error handling and retry logic.

## Features

### ✅ Automatic Startup
- Services start automatically when entering project directory
- Only starts if services aren't already running
- Runs in dependency order (databases → backend → frontend)

### 🔄 Retry Logic
- **3 automatic retries** on failure
- **5-second delay** between attempts
- **30-second timeout** for health checks

### 🚨 Alert System
- **Desktop notifications** (macOS) for success/failure
- **Visual status updates** in terminal
- **Detailed error reporting** with recovery options

### 🏥 Health Monitoring
Checks all core services:
- Frontend (Port 3000)
- Backend API (Port 8000)
- Redis Cache (Docker)
- Neo4j Database (Docker)

### 📊 Service Status Tracking
- Real-time status display
- Failed service identification
- Automatic log file creation

## Installation

### Quick Install

Run the setup script:
```bash
bash tools/scripts/setup/setup-direnv.sh
```

This will:
1. Install direnv (via Homebrew)
2. Add direnv hook to your shell config
3. Authorize `.envrc` file
4. Test the configuration

### Manual Installation

#### 1. Install direnv
```bash
brew install direnv
```

#### 2. Add to shell config

**For zsh** (`~/.zshrc`):
```bash
eval "$(direnv hook zsh)"
```

**For bash** (`~/.bashrc`):
```bash
eval "$(direnv hook bash)"
```

#### 3. Reload shell
```bash
source ~/.zshrc  # or ~/.bashrc
```

#### 4. Authorize .envrc
```bash
cd /Users/michaelquan/projects/tutorwise
direnv allow
```

## How It Works

### On Directory Entry

When you `cd` into the project:

1. **Check if services running**
   - Quick health check on all core services
   - If all running → skip startup
   - If any stopped → proceed to startup

2. **Start services with retry** (up to 3 attempts)
   ```
   Attempt 1 → Wait 5s → Health Check
   Attempt 2 → Wait 5s → Health Check
   Attempt 3 → Wait 5s → Health Check
   ```

3. **Health verification** (30s timeout)
   - Frontend: `curl http://localhost:3000/api/health`
   - Backend: `curl http://localhost:8000/health`
   - Redis: `docker ps | grep tutorwise-redis`
   - Neo4j: `docker ps | grep tutorwise-neo4j`

4. **Notify results**
   - ✅ Success → Green notification
   - ❌ Failure → Red alert with recovery options

### Failure Handling

If services fail after 3 attempts:

1. **Desktop Alert** (macOS)
   ```
   Title: "Startup Failed"
   Message: "CAS services failed to start after 3 attempts. Check logs."
   Sound: Basso (error sound)
   ```

2. **Terminal Output**
   ```
   ❌ CRITICAL: Failed to start services after 3 attempts

   📊 Final service status:
   [Shows full cas-startup:status table]

   🔧 Manual Recovery Options:
     1. Check logs: tail -f logs/*.log
     2. Restart Docker: docker-compose restart
     3. Manual start: npm run cas-startup:start-all
     4. Check health: npm run cas-startup:status
   ```

3. **Service Status Display**
   - Shows which services are stopped
   - Highlights failed dependencies
   - Suggests manual fixes

## Configuration

### Retry Settings

Edit `.envrc` to customize:

```bash
MAX_RETRIES=3           # Number of retry attempts
RETRY_DELAY=5           # Seconds between retries
HEALTH_CHECK_TIMEOUT=30 # Seconds to wait for health checks
```

### Notification Sounds

Change alert sounds in `.envrc`:

```bash
# Success sound options: Glass, Tink, Pop, Bottle
send_alert "Services Started" "All running" "Glass"

# Error sound options: Basso, Sosumi, Funk, Frog
send_alert "Startup Failed" "Check logs" "Basso"
```

Available macOS sounds:
- `Basso` - Error sound
- `Glass` - Success chime
- `Sosumi` - Alert
- `Funk` - Notification
- `Hero` - Achievement

## Useful Commands

The setup adds convenient aliases:

```bash
cas-status   # Check all service status
cas-restart  # Restart all services
cas-logs     # View all service logs (tail -f)
cas-health   # Check backend health endpoint (JSON)
```

## Troubleshooting

### direnv not loading

**Problem**: .envrc doesn't run when entering directory

**Solution**:
```bash
# Check if direnv hook is loaded
direnv status

# Re-allow .envrc
direnv allow

# Check shell config
grep "direnv hook" ~/.zshrc  # or ~/.bashrc
```

### Services fail to start

**Problem**: Retries exhausted, services still down

**Checks**:
1. **Docker running?**
   ```bash
   docker ps
   # If empty, start Docker Desktop
   ```

2. **Ports available?**
   ```bash
   lsof -i :3000  # Frontend
   lsof -i :8000  # Backend
   lsof -i :6379  # Redis
   lsof -i :7687  # Neo4j
   ```

3. **Environment variables set?**
   ```bash
   cat .env.local | grep -E "NEO4J|REDIS|SUPABASE"
   ```

4. **Check logs**
   ```bash
   tail -f logs/*.log
   # or
   cas-logs
   ```

### Desktop notifications not working

**Problem**: No alerts appearing

**Solutions**:
1. **Enable notifications for Terminal**
   - System Preferences → Notifications
   - Find Terminal.app
   - Enable "Allow Notifications"

2. **Test manually**
   ```bash
   osascript -e 'display notification "Test" with title "TutorWise"'
   ```

### Too many retries (annoying)

**Problem**: 3 retries take too long

**Solution**: Edit `.envrc`:
```bash
MAX_RETRIES=1  # Only try once
RETRY_DELAY=2  # Faster retry
```

## Disabling Auto-Startup

### Temporary (current session)
```bash
direnv deny
```

### Permanent
```bash
# Option 1: Remove .envrc
rm .envrc

# Option 2: Rename it
mv .envrc .envrc.disabled
```

### Re-enable
```bash
direnv allow
```

## Advanced Usage

### Custom Startup Logic

Edit `.envrc` to add custom checks:

```bash
# Only auto-start on weekdays
if [ $(date +%u) -le 5 ]; then
  start_services_with_retry
fi

# Only auto-start during work hours (9am-6pm)
HOUR=$(date +%H)
if [ $HOUR -ge 9 ] && [ $HOUR -le 18 ]; then
  start_services_with_retry
fi
```

### Environment-Specific Behavior

```bash
# Different behavior for production vs development
if [ "$ENV" = "production" ]; then
  MAX_RETRIES=5
  HEALTH_CHECK_TIMEOUT=60
else
  MAX_RETRIES=2
  HEALTH_CHECK_TIMEOUT=20
fi
```

## Benefits

### ✅ Developer Experience
- **Zero manual setup** - services just work
- **Immediate feedback** - know when things fail
- **Quick recovery** - clear next steps on errors
- **Consistent environment** - same setup every time

### ✅ Reliability
- **Automatic retry** - handles transient failures
- **Health verification** - ensures services actually running
- **Graceful degradation** - shows what worked/failed
- **Manual fallback** - always have recovery options

### ✅ Productivity
- **Save time** - no manual `npm run dev` commands
- **Reduce errors** - automated dependency management
- **Better debugging** - centralized logs and status
- **Context awareness** - only runs in project directory

## See Also

- [CAS Startup Documentation](../usage/cas-startup.md)
- [Service Registry Configuration](../../configs/service-registry.json)
- [direnv Official Docs](https://direnv.net)
