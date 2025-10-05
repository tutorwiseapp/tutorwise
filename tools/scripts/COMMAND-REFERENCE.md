# TutorWise Command Reference

## Three Ways to Run Commands

TutorWise supports three methods for running commands, giving you flexibility based on your preferences:

### Method 1: NPM Scripts (Standard - Recommended for CI/CD)
```bash
npm run cas-startup
npm run cas-startup:status
npm run dev:web
npm run test:e2e
```

**Pros:**
- ✅ Standard across all environments
- ✅ Works in CI/CD pipelines
- ✅ Easy to share in documentation
- ✅ Cross-platform compatible

**Cons:**
- ❌ More typing required
- ❌ Verbose for frequent use

### Method 2: Shell Aliases (Recommended for Daily Development)
```bash
cas-startup
cas-status
dev-web
test-e2e
```

**Pros:**
- ✅ Shortest commands
- ✅ Fastest to type
- ✅ Feels like native CLI tools
- ✅ Great for daily development

**Cons:**
- ❌ Requires one-time setup
- ❌ User-specific (not in CI/CD)
- ❌ Need to reload shell after setup

**Setup:** Run `npm run setup-aliases` once, then `source ~/.zshrc`

### Method 3: Direct Script Execution
```bash
./tools/scripts/cas-startup.sh
./tools/scripts/cas-startup.sh status
bash tools/scripts/railway-deploy.sh
```

**Pros:**
- ✅ No npm required
- ✅ Works in any environment
- ✅ Can be called from anywhere with full path
- ✅ Useful for system automation

**Cons:**
- ❌ Longer paths to type
- ❌ Must be in project root for relative paths
- ❌ May need execute permissions

## Command Comparison Table

| Task | NPM Script | Shell Alias | Direct Execution |
|------|------------|-------------|------------------|
| **CAS Startup Manager** |
| Interactive menu | `npm run cas-startup` | `cas-startup` | `./tools/scripts/cas-startup.sh` |
| Show status | `npm run cas-startup:status` | `cas-status` | `./tools/scripts/cas-startup.sh status` |
| Start all | `npm run cas-startup:start-all` | `cas-start` | `./tools/scripts/cas-startup.sh start-all` |
| Stop all | `npm run cas-startup:stop-all` | `cas-stop` | `./tools/scripts/cas-startup.sh stop-all` |
| Restart all | `npm run cas-startup:restart-all` | `cas-restart` | `./tools/scripts/cas-startup.sh restart-all` |
| **Development** |
| Frontend | `npm run dev:web` | `dev-web` | `npm run dev --workspace=@tutorwise/web` |
| Backend | `npm run dev:api` | `dev-api` | `cd apps/api && python3 -m uvicorn app.main:app --reload` |
| Both | `npm run dev` | `dev-all` | `npm run dev` |
| **Testing** |
| Frontend tests | `npm run test` | `test-web` | `npm run test --workspace=@tutorwise/web` |
| Backend tests | `npm run test:backend` | `test-api` | `cd apps/api && python3 -m pytest tests/ -v` |
| E2E tests | `npm run test:e2e` | `test-e2e` | `playwright test --config=tools/playwright/playwright.config.ts` |
| All integrations | `node tools/scripts/utilities/test-integrations.js` | `test-integrations` | `node tools/scripts/utilities/test-integrations.js` |
| **Jira** |
| Test connection | `npm run jira:test-tasks` | `jira-test` | `node tools/scripts/automation/jira-task-executor.js test` |
| Start polling | `npm run jira:poll:continuous` | `jira-poll` | `node tools/scripts/automation/jira-task-executor.js continuous` |
| **Calendar** |
| Test connection | `npm run calendar:test-tasks` | `calendar-test` | `node tools/scripts/automation/calendar-task-executor.js test` |
| Start polling | `npm run calendar:poll:continuous` | `calendar-poll` | `node tools/scripts/automation/calendar-task-executor.js continuous` |
| **Sync** |
| Confluence | `npm run sync:confluence` | `sync-confluence` | `node tools/scripts/integrations/confluence-sync.js` |
| Google Docs | `npm run sync:google-docs` | `sync-google-docs` | `node tools/scripts/integrations/sync-google-docs.js sync-docs` |
| Calendar to Jira | `npm run sync:calendar-to-jira:continuous` | `sync-calendar-jira` | `node tools/scripts/integrations/sync-calendar-to-jira.js continuous` |
| **Build & Deploy** |
| Build frontend | `npm run build` | `build-web` | `npm run build --workspace=@tutorwise/web` |
| Deploy Railway | `bash tools/scripts/railway-deploy.sh` | `deploy-railway` | `bash tools/scripts/railway-deploy.sh` |
| **Other** |
| Health check | `bash tools/scripts/health-check.sh` | `health-check` | `bash tools/scripts/health-check.sh` |
| Generate context | `npm run cas:generate` | `cas-generate` | `node tools/cas/generate-context.js` |
| Claude login | `npm run claude:login` | `claude-login` | `bash tools/scripts/claude-code-login.sh` |
| Setup aliases | `npm run setup-aliases` | N/A | `bash tools/scripts/setup-aliases.sh` |

## When to Use Which Method?

### Use NPM Scripts when:
- Writing documentation or tutorials
- Creating CI/CD workflows
- Sharing commands with team members
- You want consistency across environments
- Running from any directory in the project

### Use Shell Aliases when:
- Working on daily development tasks
- You type commands frequently
- Personal productivity is a priority
- You've already set up aliases
- You want the fastest typing experience

### Use Direct Execution when:
- NPM is not available
- You're automating with cron/system scripts
- Running from outside the project root
- Calling scripts from other scripts
- Debugging script behavior directly

## Quick Setup Guide

### For Daily Development (Aliases)
```bash
# One-time setup
npm run setup-aliases
source ~/.zshrc  # or ~/.bashrc

# Now you can use short commands
cas-startup
dev-web
test-e2e
```

### For Standard Use (NPM)
```bash
# No setup needed, just run
npm run cas-startup
npm run dev:web
npm run test:e2e
```

### For Direct Execution
```bash
# Make scripts executable (one-time)
chmod +x tools/scripts/*.sh

# Run directly
./tools/scripts/cas-startup.sh
./tools/scripts/health-check.sh
```

## Best Practices

1. **Use NPM scripts in documentation** - They work everywhere
2. **Set up aliases for personal use** - Saves time daily
3. **Use direct execution for automation** - More control
4. **Keep npm scripts as source of truth** - Aliases map to them
5. **Document all three methods** - Users choose their preference

## See Also

- [Alias Setup Guide](./ALIAS-SETUP-README.md) - Full alias documentation
- [CAS Startup Utility](./STARTUP-UTILITY-README.md) - Service management
- [Quick Start Guide](/QUICK-START.md) - Getting started
- [Main README](/README.md) - Project overview
